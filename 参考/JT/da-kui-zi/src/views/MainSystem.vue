<template>
  <div class="main-system">
    <!-- 系统标题栏 -->
    <div class="system-header">
      <h1>计算机联锁模拟仿真系统</h1>
      <div class="system-status">
        <el-tag :type="systemStatusType" size="large">
          {{ systemStatusText }}
        </el-tag>
        <el-button 
          type="danger" 
          size="small" 
          @click="emergencyStop"
          style="margin-left: 10px;"
        >
          紧急停车
        </el-button>
      </div>
    </div>

    <!-- 主要工作区域 -->
    <div class="main-workspace">
      <!-- 左侧站场图区域 -->
      <div class="station-diagram-area">
        <div class="diagram-header">
          <h3>站场示意图</h3>
          <div class="diagram-controls">
            <el-button size="small" @click="resetSystem">系统复位</el-button>
            <el-button size="small" @click="clearAllTrains">清除所有列车</el-button>
          </div>
        </div>
        <StationDiagram />
      </div>

      <!-- 右侧控制面板 -->
      <div class="control-panel">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 进路控制 -->
          <el-tab-pane label="进路控制" name="routes">
            <RouteControl />
          </el-tab-pane>
          
          <!-- 道岔控制 -->
          <el-tab-pane label="道岔控制" name="turnouts">
            <TurnoutControl />
          </el-tab-pane>
          
          <!-- 信号控制 -->
          <el-tab-pane label="信号控制" name="signals">
            <SignalControl />
          </el-tab-pane>
          
          <!-- 列车管理 -->
          <el-tab-pane label="列车管理" name="trains">
            <TrainManagement />
          </el-tab-pane>
          
          <!-- 系统监控 -->
          <el-tab-pane label="系统监控" name="monitor">
            <SystemMonitor />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-info">
        <span>活动进路: {{ activeRoutesCount }}</span>
        <span>占用区段: {{ occupiedSectionsCount }}</span>
        <span>在线列车: {{ trainsCount }}</span>
      </div>
      <div class="system-time">
        {{ currentTime }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRailwayStore } from '@/stores/railway'
import StationDiagram from '@/components/StationDiagram.vue'
import RouteControl from '@/components/RouteControl.vue'
import TurnoutControl from '@/components/TurnoutControl.vue'
import SignalControl from '@/components/SignalControl.vue'
import TrainManagement from '@/components/TrainManagement.vue'
import SystemMonitor from '@/components/SystemMonitor.vue'

const railwayStore = useRailwayStore()
const activeTab = ref('routes')
const currentTime = ref('')

// 计算属性
const systemStatusType = computed(() => {
  switch (railwayStore.systemState) {
    case 'normal': return 'success'
    case 'emergency': return 'danger'
    case 'maintenance': return 'warning'
    default: return 'info'
  }
})

const systemStatusText = computed(() => {
  switch (railwayStore.systemState) {
    case 'normal': return '正常运行'
    case 'emergency': return '紧急状态'
    case 'maintenance': return '维护模式'
    default: return '未知状态'
  }
})

const activeRoutesCount = computed(() => {
  return railwayStore.routes.activeRoutes.length
})

const occupiedSectionsCount = computed(() => {
  return Object.values(railwayStore.stationLayout.trackSections)
    .filter(section => section.occupied).length
})

const trainsCount = computed(() => {
  return railwayStore.trains.trainList.length
})

// 方法
const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

const emergencyStop = () => {
  railwayStore.systemState = 'emergency'
  // 所有信号关闭
  Object.values(railwayStore.stationLayout.signals).forEach(signal => {
    signal.aspect = 'red'
  })
  railwayStore.addLog('紧急操作', '系统紧急停车')
  ElMessage.warning('系统已进入紧急状态')
}

const resetSystem = () => {
  ElMessageBox.confirm('确定要重置系统吗？所有数据将被清除。', '系统重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 重置所有状态
    railwayStore.systemState = 'normal'
    
    // 清除所有进路
    railwayStore.routes.activeRoutes = []
    
    // 重置轨道区段
    Object.values(railwayStore.stationLayout.trackSections).forEach(section => {
      section.occupied = false
      section.locked = false
    })
    
    // 重置道岔
    Object.values(railwayStore.stationLayout.turnouts).forEach(turnout => {
      turnout.position = 'normal'
      turnout.locked = false
      turnout.singleLocked = false
      turnout.blocked = false
      turnout.defective = false
    })
    
    // 重置信号
    Object.values(railwayStore.stationLayout.signals).forEach(signal => {
      signal.aspect = 'red'
      signal.locked = false
    })
    
    // 清除所有列车
    railwayStore.trains.trainList = []
    
    railwayStore.addLog('系统操作', '系统已重置')
    ElMessage.success('系统重置完成')
  }).catch(() => {
    // 取消操作
  })
}

const clearAllTrains = () => {
  ElMessageBox.confirm('确定要清除所有列车吗？', '清除列车', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    railwayStore.trains.trainList = []
    // 清除轨道占用
    Object.values(railwayStore.stationLayout.trackSections).forEach(section => {
      section.occupied = false
    })
    railwayStore.addLog('列车管理', '所有列车已清除')
    ElMessage.success('所有列车已清除')
  }).catch(() => {
    // 取消操作
  })
}

// 生命周期
let timeInterval = null

onMounted(() => {
  railwayStore.loadFromStorage()
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.main-system {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

.system-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.system-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.system-status {
  display: flex;
  align-items: center;
}

.main-workspace {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}

.station-diagram-area {
  flex: 2;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.diagram-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diagram-header h3 {
  margin: 0;
  color: #333;
}

.control-panel {
  flex: 1;
  min-width: 400px;
}

.status-bar {
  background: #333;
  color: white;
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.status-info {
  display: flex;
  gap: 20px;
}

.system-time {
  font-family: 'Courier New', monospace;
}

:deep(.el-tabs__content) {
  height: calc(100vh - 200px);
  overflow-y: auto;
}
</style> 