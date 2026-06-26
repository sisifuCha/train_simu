<template>
  <div class="route-control">
    <div class="control-section">
      <h4>进路选排</h4>
      <div class="route-selection">
        <el-row :gutter="10" v-for="route in routeTemplates" :key="route.id">
          <el-col :span="16">
            <div class="route-info">
              <strong>{{ route.name }}</strong>
              <span class="route-type">{{ getRouteTypeText(route.type) }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <el-button 
              size="small" 
              type="primary" 
              @click="selectAndLockRoute(route.id)"
              :disabled="!canSelectRoute(route)"
            >
              选排锁闭
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>

    <div class="control-section">
      <h4>活动进路</h4>
      <div class="active-routes">
        <el-table :data="activeRoutes" size="small" height="200">
          <el-table-column prop="name" label="进路名称" width="150" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button-group>
                <el-button 
                  v-if="row.status === 'locked'" 
                  size="small" 
                  type="success" 
                  @click="openRoute(row.id)"
                >
                  开放
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="unlockRoute(row.id)"
                >
                  解锁
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="cancelRoute(row.id)"
                >
                  取消
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="control-section">
      <h4>列车作业</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-input 
            v-model="trainNumber" 
            placeholder="列车车次"
            size="small"
          />
        </el-col>
        <el-col :span="12">
          <el-select 
            v-model="selectedTrainOperation" 
            placeholder="选择作业类型"
            size="small"
            style="width: 100%"
          >
            <el-option label="接车作业" value="reception" />
            <el-option label="发车作业" value="departure" />
            <el-option label="通过作业" value="pass" />
          </el-select>
        </el-col>
      </el-row>
      <el-row style="margin-top: 10px;">
        <el-col :span="24">
          <el-button 
            type="primary" 
            size="small" 
            @click="handleTrainOperation"
            :disabled="!trainNumber || !selectedTrainOperation"
            style="width: 100%"
          >
            办理列车作业
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>调车作业</h4>
      <el-row :gutter="10">
        <el-col :span="8">
          <el-input 
            v-model="shuntingNumber" 
            placeholder="调车号"
            size="small"
          />
        </el-col>
        <el-col :span="8">
          <el-select 
            v-model="shuntingFrom" 
            placeholder="起始位置"
            size="small"
          >
            <el-option v-for="section in trackSectionList" :key="section" :label="section" :value="section" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select 
            v-model="shuntingTo" 
            placeholder="目标位置"
            size="small"
          >
            <el-option v-for="section in trackSectionList" :key="section" :label="section" :value="section" />
          </el-select>
        </el-col>
      </el-row>
      <el-row style="margin-top: 10px;">
        <el-col :span="24">
          <el-button 
            type="success" 
            size="small" 
            @click="handleShuntingOperation"
            :disabled="!shuntingNumber || !shuntingFrom || !shuntingTo"
            style="width: 100%"
          >
            办理调车作业
          </el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRailwayStore } from '@/stores/railway'

const railwayStore = useRailwayStore()

// 表单数据
const trainNumber = ref('')
const selectedTrainOperation = ref('')
const shuntingNumber = ref('')
const shuntingFrom = ref('')
const shuntingTo = ref('')

// 计算属性
const routeTemplates = computed(() => railwayStore.routes.routeTemplates)
const activeRoutes = computed(() => railwayStore.routes.activeRoutes)
const trackSectionList = computed(() => Object.keys(railwayStore.stationLayout.trackSections))

// 方法
const getRouteTypeText = (type) => {
  const types = {
    'reception': '接车',
    'departure': '发车',
    'shunting': '调车',
    'pass': '通过'
  }
  return types[type] || type
}

const getStatusType = (status) => {
  const types = {
    'locked': 'warning',
    'opened': 'success',
    'occupied': 'info'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    'locked': '锁闭',
    'opened': '开放',
    'occupied': '占用'
  }
  return texts[status] || status
}

const canSelectRoute = (route) => {
  // 检查是否存在冲突进路
  const hasConflict = activeRoutes.value.some(activeRoute => {
    return route.path.some(section => activeRoute.path.includes(section))
  })
  
  // 检查路径是否空闲
  const isPathFree = route.path.every(sectionId => {
    const section = railwayStore.stationLayout.trackSections[sectionId]
    return section && !section.occupied && !section.locked
  })
  
  return !hasConflict && isPathFree
}

const selectAndLockRoute = async (routeId) => {
  try {
    const routeTemplate = routeTemplates.value.find(r => r.id === routeId)
    if (!routeTemplate) {
      throw new Error('进路不存在')
    }

    // 检查道岔位置并自动转换
    for (const turnout of routeTemplate.turnouts) {
      const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
      if (currentTurnout.position !== turnout.position) {
        if (!currentTurnout.locked && !currentTurnout.singleLocked && !currentTurnout.blocked) {
          currentTurnout.position = turnout.position
          railwayStore.addLog('道岔操作', `道岔${turnout.id}自动转换到${turnout.position}位`)
        } else {
          throw new Error(`道岔${turnout.id}无法转换到所需位置`)
        }
      }
    }

    // 锁闭轨道区段
    routeTemplate.path.forEach(sectionId => {
      const section = railwayStore.stationLayout.trackSections[sectionId]
      if (section) {
        section.locked = true
      }
    })

    // 锁闭道岔
    routeTemplate.turnouts.forEach(turnout => {
      const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
      if (currentTurnout) {
        currentTurnout.locked = true
      }
    })

    // 添加到活动进路
    const activeRoute = {
      ...routeTemplate,
      establishedAt: new Date(),
      status: 'locked'
    }
    railwayStore.routes.activeRoutes.push(activeRoute)

    railwayStore.addLog('进路操作', `进路${routeTemplate.name}选排锁闭完成`)
    railwayStore.saveToStorage()
    ElMessage.success(`进路${routeTemplate.name}选排锁闭完成`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const openRoute = (routeId) => {
  try {
    const activeRoute = activeRoutes.value.find(r => r.id === routeId)
    if (!activeRoute) {
      throw new Error('进路不存在')
    }

    // 开放进路信号
    if (activeRoute.entrySignal) {
      const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
      if (signal) {
        switch (activeRoute.type) {
          case 'reception':
          case 'departure':
            signal.aspect = 'green'
            break
          case 'shunting':
            signal.aspect = 'yellow'
            break
        }
      }
    }

    activeRoute.status = 'opened'
    activeRoute.openedAt = new Date()

    railwayStore.addLog('进路操作', `进路${activeRoute.name}信号开放`)
    railwayStore.saveToStorage()
    ElMessage.success(`进路${activeRoute.name}信号开放`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const unlockRoute = (routeId) => {
  try {
    const routeIndex = activeRoutes.value.findIndex(r => r.id === routeId)
    if (routeIndex === -1) {
      throw new Error('进路不存在')
    }

    const activeRoute = activeRoutes.value[routeIndex]

    // 检查是否可以解锁
    const canUnlock = activeRoute.path.every(sectionId => {
      const section = railwayStore.stationLayout.trackSections[sectionId]
      return section && !section.occupied
    })

    if (!canUnlock) {
      throw new Error('进路区段仍有列车占用，无法解锁')
    }

    // 解锁轨道区段
    activeRoute.path.forEach(sectionId => {
      const section = railwayStore.stationLayout.trackSections[sectionId]
      if (section) {
        section.locked = false
      }
    })

    // 解锁道岔
    activeRoute.turnouts.forEach(turnout => {
      const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
      if (currentTurnout) {
        currentTurnout.locked = false
      }
    })

    // 关闭信号
    if (activeRoute.entrySignal) {
      const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
      if (signal) {
        signal.aspect = 'red'
      }
    }

    // 移除活动进路
    railwayStore.routes.activeRoutes.splice(routeIndex, 1)

    railwayStore.addLog('进路操作', `进路${activeRoute.name}解锁完成`)
    railwayStore.saveToStorage()
    ElMessage.success(`进路${activeRoute.name}解锁完成`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const cancelRoute = (routeId) => {
  ElMessageBox.confirm('确定要强制取消此进路吗？', '取消进路', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      const routeIndex = activeRoutes.value.findIndex(r => r.id === routeId)
      if (routeIndex === -1) {
        throw new Error('进路不存在')
      }

      const activeRoute = activeRoutes.value[routeIndex]

      // 强制解锁
      activeRoute.path.forEach(sectionId => {
        const section = railwayStore.stationLayout.trackSections[sectionId]
        if (section) {
          section.locked = false
        }
      })

      activeRoute.turnouts.forEach(turnout => {
        const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
        if (currentTurnout) {
          currentTurnout.locked = false
        }
      })

      // 关闭信号
      if (activeRoute.entrySignal) {
        const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
        if (signal) {
          signal.aspect = 'red'
        }
      }

      railwayStore.routes.activeRoutes.splice(routeIndex, 1)

      railwayStore.addLog('进路操作', `进路${activeRoute.name}强制取消`)
      railwayStore.saveToStorage()
      ElMessage.success(`进路${activeRoute.name}已强制取消`)
    } catch (error) {
      ElMessage.error(error.message)
    }
  }).catch(() => {
    // 取消操作
  })
}

const handleTrainOperation = () => {
  const operation = {
    trainNumber: trainNumber.value,
    type: selectedTrainOperation.value,
    timestamp: new Date()
  }

  railwayStore.addLog('列车作业', `办理${trainNumber.value}次列车${getRouteTypeText(selectedTrainOperation.value)}作业`)
  ElMessage.success(`${trainNumber.value}次列车作业办理完成`)
  
  // 清空表单
  trainNumber.value = ''
  selectedTrainOperation.value = ''
}

const handleShuntingOperation = () => {
  const operation = {
    shuntingNumber: shuntingNumber.value,
    from: shuntingFrom.value,
    to: shuntingTo.value,
    timestamp: new Date()
  }

  railwayStore.addLog('调车作业', `办理${shuntingNumber.value}调车从${shuntingFrom.value}到${shuntingTo.value}`)
  ElMessage.success(`调车作业办理完成`)
  
  // 清空表单
  shuntingNumber.value = ''
  shuntingFrom.value = ''
  shuntingTo.value = ''
}
</script>

<style scoped>
.route-control {
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

.route-selection {
  max-height: 200px;
  overflow-y: auto;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.route-type {
  font-size: 12px;
  color: #666;
}

.active-routes {
  margin-top: 10px;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-button-group .el-button) {
  padding: 3px 5px;
  font-size: 11px;
}
</style> 