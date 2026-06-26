<template>
  <div class="train-management">
    <div class="control-section">
      <h4>在线列车</h4>
      <el-table :data="trainList" size="small" height="200">
        <el-table-column prop="number" label="车次" width="80" />
        <el-table-column prop="currentSection" label="所在区段" width="80" />
        <el-table-column label="方向" width="60">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'forward' ? 'success' : 'warning'" size="small">
              {{ row.direction === 'forward' ? '上行' : '下行' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="速度" width="80">
          <template #default="{ row }">
            {{ row.speed || 0 }} km/h
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="moveTrain(row.id)">移动</el-button>
              <el-button size="small" type="danger" @click="removeTrain(row.id)">删除</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="control-section">
      <h4>添加列车</h4>
      <el-row :gutter="10">
        <el-col :span="8">
          <el-input 
            v-model="newTrainNumber" 
            placeholder="车次号"
            size="small"
          />
        </el-col>
        <el-col :span="8">
          <el-select 
            v-model="newTrainSection" 
            placeholder="初始位置"
            size="small"
            style="width: 100%"
          >
            <el-option 
              v-for="section in availableSections" 
              :key="section" 
              :label="section" 
              :value="section" 
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-button 
            type="primary" 
            size="small" 
            @click="addTrain"
            :disabled="!newTrainNumber || !newTrainSection"
            style="width: 100%"
          >
            添加列车
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>列车模拟运行</h4>
      <el-row :gutter="10">
        <el-col :span="8">
          <el-select 
            v-model="selectedTrain" 
            placeholder="选择列车"
            size="small"
            style="width: 100%"
          >
            <el-option 
              v-for="train in trains.trainList" 
              :key="train.id" 
              :label="train.number" 
              :value="train.id" 
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select 
            v-model="targetSection" 
            placeholder="目标区段"
            size="small"
            style="width: 100%"
          >
            <el-option 
              v-for="section in trackSectionList" 
              :key="section" 
              :label="section" 
              :value="section" 
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-button 
            type="success" 
            size="small" 
            @click="simulateTrainMovement"
            :disabled="!selectedTrain || !targetSection"
            style="width: 100%"
          >
            模拟运行
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>自动运行控制</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-button 
            :type="autoRunning ? 'danger' : 'success'" 
            size="small" 
            @click="toggleAutoRunning"
            style="width: 100%"
          >
            {{ autoRunning ? '停止自动运行' : '启动自动运行' }}
          </el-button>
        </el-col>
        <el-col :span="12">
          <el-input-number 
            v-model="autoRunInterval" 
            :min="1" 
            :max="10" 
            size="small" 
            controls-position="right"
            style="width: 100%"
          />
          <span style="font-size: 12px; color: #666;">运行间隔(秒)</span>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>列车作业记录</h4>
      <el-table :data="trainOperations" size="small" height="150">
        <el-table-column prop="trainNumber" label="车次" width="80" />
        <el-table-column prop="operation" label="作业类型" width="80" />
        <el-table-column prop="location" label="位置" width="80" />
        <el-table-column prop="timestamp" label="时间" width="120">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRailwayStore } from '@/stores/railway'

const railwayStore = useRailwayStore()

// 表单数据
const newTrainNumber = ref('')
const newTrainSection = ref('')
const selectedTrain = ref('')
const targetSection = ref('')
const autoRunning = ref(false)
const autoRunInterval = ref(3)

// 自动运行定时器
let autoRunTimer = null

// 列车作业记录
const trainOperations = ref([])

// 计算属性
const trains = computed(() => railwayStore.trains)
const trackSections = computed(() => railwayStore.stationLayout.trackSections)
const trainList = computed(() => trains.value.trainList)
const trackSectionList = computed(() => Object.keys(trackSections.value))
const availableSections = computed(() => {
  return trackSectionList.value.filter(sectionId => {
    const section = trackSections.value[sectionId]
    return section && !section.occupied
  })
})

// 方法
const addTrain = () => {
  try {
    const section = trackSections.value[newTrainSection.value]
    if (!section) {
      throw new Error('区段不存在')
    }

    if (section.occupied) {
      throw new Error('区段已被占用')
    }

    const newTrain = {
      id: `T${trains.value.nextTrainId++}`,
      number: newTrainNumber.value,
      currentSection: newTrainSection.value,
      positionInSection: 0.1,
      direction: 'forward',
      speed: 0,
      status: 'stopped',
      entryTime: new Date()
    }

    trains.value.trainList.push(newTrain)
    section.occupied = true

    // 记录作业
    trainOperations.value.unshift({
      trainNumber: newTrain.number,
      operation: '入站',
      location: newTrainSection.value,
      timestamp: new Date()
    })

    railwayStore.addLog('列车管理', `列车${newTrain.number}添加到${newTrainSection.value}`)
    railwayStore.saveToStorage()

    ElMessage.success(`列车${newTrain.number}添加成功`)

    // 清空表单
    newTrainNumber.value = ''
    newTrainSection.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const removeTrain = (trainId) => {
  ElMessageBox.confirm('确定要删除此列车吗？', '删除列车', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      const trainIndex = trains.value.trainList.findIndex(t => t.id === trainId)
      if (trainIndex === -1) {
        throw new Error('列车不存在')
      }

      const train = trains.value.trainList[trainIndex]
      const section = trackSections.value[train.currentSection]
      if (section) {
        section.occupied = false
      }

      trains.value.trainList.splice(trainIndex, 1)

      // 记录作业
      trainOperations.value.unshift({
        trainNumber: train.number,
        operation: '出站',
        location: train.currentSection,
        timestamp: new Date()
      })

      railwayStore.addLog('列车管理', `列车${train.number}已删除`)
      railwayStore.saveToStorage()

      ElMessage.success(`列车${train.number}已删除`)
    } catch (error) {
      ElMessage.error(error.message)
    }
  }).catch(() => {
    // 取消操作
  })
}

const moveTrain = (trainId) => {
  const train = trains.value.trainList.find(t => t.id === trainId)
  if (!train) {
    ElMessage.error('列车不存在')
    return
  }

  selectedTrain.value = trainId
  ElMessage.info(`请选择列车${train.number}的目标区段`)
}

const simulateTrainMovement = () => {
  try {
    const train = trains.value.trainList.find(t => t.id === selectedTrain.value)
    if (!train) {
      throw new Error('列车不存在')
    }

    const currentSection = trackSections.value[train.currentSection]
    const newSection = trackSections.value[targetSection.value]

    if (!newSection) {
      throw new Error('目标区段不存在')
    }

    if (newSection.occupied) {
      throw new Error('目标区段已被占用')
    }

    // 检查是否有进路保护
    const hasRoute = railwayStore.routes.activeRoutes.some(route => {
      return route.path.includes(train.currentSection) && route.path.includes(targetSection.value)
    })

    if (!hasRoute) {
      ElMessage.warning('警告：没有建立进路保护')
    }

    // 移动列车
    if (currentSection) {
      currentSection.occupied = false
    }
    newSection.occupied = true
    train.currentSection = targetSection.value
    train.positionInSection = 0.5

    // 记录作业
    trainOperations.value.unshift({
      trainNumber: train.number,
      operation: '运行',
      location: `${train.currentSection} → ${targetSection.value}`,
      timestamp: new Date()
    })

    railwayStore.addLog('列车运行', `列车${train.number}从${train.currentSection}运行至${targetSection.value}`)
    railwayStore.saveToStorage()

    ElMessage.success(`列车${train.number}运行完成`)

    // 清空选择
    selectedTrain.value = ''
    targetSection.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const toggleAutoRunning = () => {
  if (autoRunning.value) {
    // 停止自动运行
    if (autoRunTimer) {
      clearInterval(autoRunTimer)
      autoRunTimer = null
    }
    autoRunning.value = false
    ElMessage.info('自动运行已停止')
  } else {
    // 启动自动运行
    autoRunning.value = true
    autoRunTimer = setInterval(() => {
      autoMoveTrains()
    }, autoRunInterval.value * 1000)
    ElMessage.success('自动运行已启动')
  }
}

const autoMoveTrains = () => {
  // 简单的自动运行逻辑
  trains.value.trainList.forEach(train => {
    // 随机选择一个可用的相邻区段移动
    const availableTargets = trackSectionList.value.filter(sectionId => {
      const section = trackSections.value[sectionId]
      return section && !section.occupied && sectionId !== train.currentSection
    })

    if (availableTargets.length > 0) {
      const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)]
      
      // 模拟移动
      const currentSection = trackSections.value[train.currentSection]
      const newSection = trackSections.value[randomTarget]
      
      if (currentSection) currentSection.occupied = false
      if (newSection) newSection.occupied = true
      
      train.currentSection = randomTarget
      
      railwayStore.addLog('自动运行', `列车${train.number}自动运行至${randomTarget}`)
    }
  })
  
  railwayStore.saveToStorage()
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 生命周期
onMounted(() => {
  // 加载历史作业记录
  const savedOperations = localStorage.getItem('trainOperations')
  if (savedOperations) {
    try {
      trainOperations.value = JSON.parse(savedOperations)
    } catch (error) {
      console.error('加载列车作业记录失败:', error)
    }
  }
})

onUnmounted(() => {
  if (autoRunTimer) {
    clearInterval(autoRunTimer)
  }
  
  // 保存作业记录
  localStorage.setItem('trainOperations', JSON.stringify(trainOperations.value))
})
</script>

<style scoped>
.train-management {
  padding: 15px;
  height: 100%;
  overflow-y: auto;
}

.control-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
}

.control-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-button-group .el-button) {
  padding: 3px 5px;
  font-size: 11px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style> 