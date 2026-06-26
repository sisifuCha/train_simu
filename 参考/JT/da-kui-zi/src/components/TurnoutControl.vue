<template>
  <div class="turnout-control">
    <div class="control-section">
      <h4>道岔状态监控</h4>
      <el-table :data="turnoutList" size="small" height="200">
        <el-table-column prop="id" label="道岔编号" width="80" />
        <el-table-column label="位置" width="80">
          <template #default="{ row }">
            <el-tag :type="row.position === 'normal' ? 'success' : 'warning'" size="small">
              {{ row.position === 'normal' ? '定位' : '反位' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <div class="status-indicators">
              <el-tag v-if="row.locked" type="danger" size="small">进路锁</el-tag>
              <el-tag v-if="row.singleLocked" type="warning" size="small">单锁</el-tag>
              <el-tag v-if="row.blocked" type="info" size="small">封锁</el-tag>
              <el-tag v-if="row.defective" type="danger" size="small">故障</el-tag>
              <el-tag v-if="!row.locked && !row.singleLocked && !row.blocked && !row.defective" type="success" size="small">正常</el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="control-section">
      <h4>道岔单独操作</h4>
      <el-row :gutter="10">
        <el-col :span="8">
          <el-select v-model="selectedTurnout" placeholder="选择道岔" size="small" style="width: 100%">
            <el-option v-for="(turnout, id) in turnouts" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="targetPosition" placeholder="目标位置" size="small" style="width: 100%">
            <el-option label="定位" value="normal" />
            <el-option label="反位" value="reverse" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-button 
            type="primary" 
            size="small" 
            @click="operateTurnout"
            :disabled="!selectedTurnout || !targetPosition"
            style="width: 100%"
          >
            操作
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>道岔锁闭控制</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-select v-model="lockTurnout" placeholder="选择道岔" size="small" style="width: 100%">
            <el-option v-for="(turnout, id) in turnouts" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-button-group style="width: 100%">
            <el-button 
              size="small" 
              type="warning" 
              @click="singleLockTurnout"
              :disabled="!lockTurnout"
            >
              单锁
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="unlockTurnout"
              :disabled="!lockTurnout"
            >
              解锁
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>道岔封锁控制</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-select v-model="blockTurnout" placeholder="选择道岔" size="small" style="width: 100%">
            <el-option v-for="(turnout, id) in turnouts" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-button-group style="width: 100%">
            <el-button 
              size="small" 
              type="danger" 
              @click="blockTurnoutAction"
              :disabled="!blockTurnout"
            >
              封锁
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="unblockTurnout"
              :disabled="!blockTurnout"
            >
              解封
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>故障模拟</h4>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-select v-model="faultTurnout" placeholder="选择道岔" size="small" style="width: 100%">
            <el-option v-for="(turnout, id) in turnouts" :key="id" :label="id" :value="id" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-button-group style="width: 100%">
            <el-button 
              size="small" 
              type="danger" 
              @click="setTurnoutFault"
              :disabled="!faultTurnout"
            >
              设置故障
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="clearTurnoutFault"
              :disabled="!faultTurnout"
            >
              恢复正常
            </el-button>
          </el-button-group>
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
const selectedTurnout = ref('')
const targetPosition = ref('')
const lockTurnout = ref('')
const blockTurnout = ref('')
const faultTurnout = ref('')

// 计算属性
const turnouts = computed(() => railwayStore.stationLayout.turnouts)
const turnoutList = computed(() => {
  return Object.entries(turnouts.value).map(([id, turnout]) => ({
    id,
    ...turnout
  }))
})

// 方法
const operateTurnout = () => {
  try {
    const turnout = turnouts.value[selectedTurnout.value]
    if (!turnout) {
      throw new Error('道岔不存在')
    }

    if (turnout.locked) {
      throw new Error('道岔被进路锁闭，无法操作')
    }

    if (turnout.singleLocked) {
      throw new Error('道岔被单独锁闭，无法操作')
    }

    if (turnout.blocked) {
      throw new Error('道岔被封锁，无法操作')
    }

    if (turnout.defective) {
      throw new Error('道岔故障，无法操作')
    }

    if (turnout.position === targetPosition.value) {
      throw new Error('道岔已在目标位置')
    }

    turnout.position = targetPosition.value
    
    const positionText = targetPosition.value === 'normal' ? '定位' : '反位'
    railwayStore.addLog('道岔操作', `道岔${selectedTurnout.value}操作至${positionText}`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`道岔${selectedTurnout.value}操作至${positionText}`)
    
    // 清空选择
    selectedTurnout.value = ''
    targetPosition.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const singleLockTurnout = () => {
  try {
    const turnout = turnouts.value[lockTurnout.value]
    if (!turnout) {
      throw new Error('道岔不存在')
    }

    if (turnout.locked) {
      throw new Error('道岔被进路锁闭，无法单锁')
    }

    if (turnout.singleLocked) {
      throw new Error('道岔已经单锁')
    }

    turnout.singleLocked = true
    
    railwayStore.addLog('道岔操作', `道岔${lockTurnout.value}单独锁闭`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`道岔${lockTurnout.value}单独锁闭`)
    
    lockTurnout.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const unlockTurnout = () => {
  try {
    const turnout = turnouts.value[lockTurnout.value]
    if (!turnout) {
      throw new Error('道岔不存在')
    }

    if (turnout.locked) {
      throw new Error('道岔被进路锁闭，无法解锁')
    }

    if (!turnout.singleLocked) {
      throw new Error('道岔未单锁')
    }

    turnout.singleLocked = false
    
    railwayStore.addLog('道岔操作', `道岔${lockTurnout.value}解锁`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`道岔${lockTurnout.value}解锁`)
    
    lockTurnout.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const blockTurnoutAction = () => {
  ElMessageBox.confirm('确定要封锁此道岔吗？封锁后道岔将无法操作。', '道岔封锁', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      const turnout = turnouts.value[blockTurnout.value]
      if (!turnout) {
        throw new Error('道岔不存在')
      }

      turnout.blocked = true
      
      railwayStore.addLog('道岔操作', `道岔${blockTurnout.value}封锁`)
      railwayStore.saveToStorage()
      
      ElMessage.success(`道岔${blockTurnout.value}已封锁`)
      
      blockTurnout.value = ''
    } catch (error) {
      ElMessage.error(error.message)
    }
  }).catch(() => {
    // 取消操作
  })
}

const unblockTurnout = () => {
  try {
    const turnout = turnouts.value[blockTurnout.value]
    if (!turnout) {
      throw new Error('道岔不存在')
    }

    if (!turnout.blocked) {
      throw new Error('道岔未封锁')
    }

    turnout.blocked = false
    
    railwayStore.addLog('道岔操作', `道岔${blockTurnout.value}解封`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`道岔${blockTurnout.value}解封`)
    
    blockTurnout.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const setTurnoutFault = () => {
  ElMessageBox.confirm('确定要设置道岔故障吗？故障道岔将无法操作。', '设置故障', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      const turnout = turnouts.value[faultTurnout.value]
      if (!turnout) {
        throw new Error('道岔不存在')
      }

      turnout.defective = true
      
      railwayStore.addLog('道岔故障', `道岔${faultTurnout.value}设置故障`)
      railwayStore.saveToStorage()
      
      ElMessage.warning(`道岔${faultTurnout.value}故障`)
      
      faultTurnout.value = ''
    } catch (error) {
      ElMessage.error(error.message)
    }
  }).catch(() => {
    // 取消操作
  })
}

const clearTurnoutFault = () => {
  try {
    const turnout = turnouts.value[faultTurnout.value]
    if (!turnout) {
      throw new Error('道岔不存在')
    }

    if (!turnout.defective) {
      throw new Error('道岔无故障')
    }

    turnout.defective = false
    
    railwayStore.addLog('道岔维修', `道岔${faultTurnout.value}故障恢复`)
    railwayStore.saveToStorage()
    
    ElMessage.success(`道岔${faultTurnout.value}故障已恢复`)
    
    faultTurnout.value = ''
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<style scoped>
.turnout-control {
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

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 3px;
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