<template>
  <div class="signal-control">
    <div class="control-section">
      <h4>信号机状态监控</h4>
      <el-table :data="signalList" size="small" height="250">
        <el-table-column prop="id" label="信号机" width="80" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getSignalTypeColor(row.type)" size="small">
              {{ getSignalTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="显示" width="80">
          <template #default="{ row }">
            <div class="signal-aspect">
              <div 
                class="signal-light" 
                :style="{ backgroundColor: getAspectColor(row.aspect) }"
              ></div>
              <span>{{ getAspectText(row.aspect) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="控制方式" width="80">
          <template #default="{ row }">
            <el-tag :type="row.automated ? 'success' : 'warning'" size="small">
              {{ row.automated ? '自动' : '人工' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="60">
          <template #default="{ row }">
            <el-tag v-if="row.locked" type="danger" size="small">锁定</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="control-section">
      <h4>人工信号控制</h4>
      <div class="manual-control">
        <el-row :gutter="10">
          <el-col :span="8">
            <el-select v-model="selectedSignal" placeholder="选择信号机" size="small" style="width: 100%">
              <el-option 
                v-for="(signal, id) in manualSignals" 
                :key="id" 
                :label="id" 
                :value="id" 
              />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-select v-model="targetAspect" placeholder="目标显示" size="small" style="width: 100%">
              <el-option label="红灯" value="red" />
              <el-option label="黄灯" value="yellow" />
              <el-option label="绿灯" value="green" />
              <el-option label="双黄灯" value="double_yellow" />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-button 
              type="primary" 
              size="small" 
              @click="changeSignalAspect"
              :disabled="!selectedSignal || !targetAspect"
              style="width: 100%"
            >
              变更显示
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>

    <div class="control-section">
      <h4>信号机故障模拟</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-select v-model="faultSignal" placeholder="选择信号机" size="small" style="width: 100%">
            <el-option v-for="(signal, id) in signals" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-button-group style="width: 100%">
            <el-button 
              size="small" 
              type="danger" 
              @click="setSignalFault"
              :disabled="!faultSignal"
            >
              设置故障
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="clearSignalFault"
              :disabled="!faultSignal"
            >
              恢复正常
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>信号封锁控制</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-select v-model="lockSignal" placeholder="选择信号机" size="small" style="width: 100%">
            <el-option v-for="(signal, id) in signals" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-button-group style="width: 100%">
            <el-button 
              size="small" 
              type="warning" 
              @click="lockSignal"
              :disabled="!lockSignal"
            >
              封锁
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="unlockSignal"
              :disabled="!lockSignal"
            >
              解封
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>信号机维护</h4>
      <el-row :gutter="10">
        <el-col :span="24">
          <el-button 
            type="info" 
            size="small" 
            @click="resetAllSignals"
            style="width: 100%"
          >
            所有信号机复示红灯
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="10" style="margin-top: 10px;">
        <el-col :span="12">
          <el-button 
            type="success" 
            size="small" 
            @click="enableAllAutomatic"
            style="width: 100%"
          >
            启用自动控制
          </el-button>
        </el-col>
        <el-col :span="12">
          <el-button 
            type="warning" 
            size="small" 
            @click="disableAllAutomatic"
            style="width: 100%"
          >
            转人工控制
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
const selectedSignal = ref('')
const targetAspect = ref('')
const faultSignal = ref('')
const lockSignal = ref('')

// 计算属性
const signals = computed(() => railwayStore.stationLayout.signals)
const signalList = computed(() => {
  return Object.entries(signals.value).map(([id, signal]) => ({
    id,
    ...signal
  }))
})

const manualSignals = computed(() => {
  return Object.fromEntries(
    Object.entries(signals.value).filter(([id, signal]) => !signal.automated)
  )
})

// 方法
const getSignalTypeText = (type) => {
  const types = {
    'entry': '进站',
    'exit': '出站',
    'block': '区间',
    'shunting': '调车',
    'home': '进路',
    'distant': '预告'
  }
  return types[type] || type
}

const getSignalTypeColor = (type) => {
  const colors = {
    'entry': 'success',
    'exit': 'primary',
    'block': 'info',
    'shunting': 'warning'
  }
  return colors[type] || 'info'
}

const getAspectText = (aspect) => {
  const aspects = {
    'red': '红灯',
    'yellow': '黄灯',
    'green': '绿灯',
    'double_yellow': '双黄'
  }
  return aspects[aspect] || aspect
}

const getAspectColor = (aspect) => {
  const colors = {
    'red': '#ff0000',
    'yellow': '#ffff00',
    'green': '#00ff00',
    'double_yellow': '#ffaa00'
  }
  return colors[aspect] || '#ff0000'
}

const changeSignalAspect = () => {
  try {
    const signal = signals.value[selectedSignal.value]
    if (!signal) {
      throw new Error('信号机不存在')
    }

    if (signal.automated) {
      throw new Error('自动控制信号机无法人工操作')
    }

    if (signal.locked) {
      throw new Error('信号机被锁定，无法操作')
    }

    signal.aspect = targetAspect.value
    
    railwayStore.addLog('信号操作', `信号机${selectedSignal.value}变更为${getAspectText(targetAspect.value)}`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`信号机${selectedSignal.value}变更为${getAspectText(targetAspect.value)}`)
    
    // 清空选择
    selectedSignal.value = ''
    targetAspect.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const setSignalFault = () => {
  ElMessageBox.confirm('确定要设置信号机故障吗？故障信号机将显示红灯。', '设置故障', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      const signal = signals.value[faultSignal.value]
      if (!signal) {
        throw new Error('信号机不存在')
      }

      signal.aspect = 'red'
      signal.locked = true
      
      railwayStore.addLog('信号故障', `信号机${faultSignal.value}设置故障`)
      railwayStore.saveToStorage()
      
      ElMessage.warning(`信号机${faultSignal.value}故障`)
      
      faultSignal.value = ''
    } catch (error) {
      ElMessage.error(error.message)
    }
  }).catch(() => {
    // 取消操作
  })
}

const clearSignalFault = () => {
  try {
    const signal = signals.value[faultSignal.value]
    if (!signal) {
      throw new Error('信号机不存在')
    }

    signal.locked = false
    
    railwayStore.addLog('信号维修', `信号机${faultSignal.value}故障恢复`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`信号机${faultSignal.value}故障已恢复`)
    
    faultSignal.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const lockSignalFunc = () => {
  try {
    const signal = signals.value[lockSignal.value]
    if (!signal) {
      throw new Error('信号机不存在')
    }

    signal.locked = true
    signal.aspect = 'red'
    
    railwayStore.addLog('信号操作', `信号机${lockSignal.value}封锁`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`信号机${lockSignal.value}已封锁`)
    
    lockSignal.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const unlockSignalFunc = () => {
  try {
    const signal = signals.value[lockSignal.value]
    if (!signal) {
      throw new Error('信号机不存在')
    }

    signal.locked = false
    
    railwayStore.addLog('信号操作', `信号机${lockSignal.value}解封`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`信号机${lockSignal.value}解封`)
    
    lockSignal.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const resetAllSignals = () => {
  ElMessageBox.confirm('确定要将所有信号机复示红灯吗？', '复示红灯', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    Object.values(signals.value).forEach(signal => {
      signal.aspect = 'red'
    })
    
    railwayStore.addLog('信号操作', '所有信号机复示红灯')
    railwayStore.saveToStorage()
    
    ElMessage.success('所有信号机已复示红灯')
  }).catch(() => {
    // 取消操作
  })
}

const enableAllAutomatic = () => {
  Object.values(signals.value).forEach(signal => {
    if (['entry', 'exit', 'block'].includes(signal.type)) {
      signal.automated = true
    }
  })
  
  railwayStore.addLog('信号操作', '启用所有信号机自动控制')
  railwayStore.saveToStorage()
  
  ElMessage.success('已启用自动控制')
}

const disableAllAutomatic = () => {
  Object.values(signals.value).forEach(signal => {
    signal.automated = false
  })
  
  railwayStore.addLog('信号操作', '转为人工控制')
  railwayStore.saveToStorage()
  
  ElMessage.success('已转为人工控制')
}
</script>

<style scoped>
.signal-control {
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

.signal-aspect {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #333;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-button-group) {
  display: flex;
  width: 100%;
}

:deep(.el-button-group .el-button) {
  flex: 1;
  margin: 0;
}
</style> 