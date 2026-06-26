<template>
  <div class="system-monitor">
    <div class="control-section">
      <h4>系统状态</h4>
      <el-row :gutter="15">
        <el-col :span="8">
          <div class="status-card">
            <div class="status-title">系统运行状态</div>
            <div class="status-value">
              <el-tag :type="systemStatusType" size="large">
                {{ systemStatusText }}
              </el-tag>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="status-card">
            <div class="status-title">活动进路数量</div>
            <div class="status-value">{{ activeRoutesCount }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="status-card">
            <div class="status-title">在线列车数量</div>
            <div class="status-value">{{ trainsCount }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>设备状态统计</h4>
      <el-table :data="deviceStatistics" size="small" height="150">
        <el-table-column prop="type" label="设备类型" width="100" />
        <el-table-column prop="total" label="总数" width="60" />
        <el-table-column prop="normal" label="正常" width="60" />
        <el-table-column prop="abnormal" label="异常" width="60" />
        <el-table-column prop="rate" label="正常率" width="80">
          <template #default="{ row }">
            {{ row.rate }}%
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.rate" 
              :color="getProgressColor(row.rate)"
              :show-text="false"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="control-section">
      <h4>操作日志</h4>
      <div class="log-controls">
        <el-row :gutter="10">
          <el-col :span="8">
            <el-select v-model="logFilter" placeholder="筛选类型" size="small" style="width: 100%">
              <el-option label="全部" value="" />
              <el-option label="进路操作" value="进路操作" />
              <el-option label="道岔操作" value="道岔操作" />
              <el-option label="信号操作" value="信号操作" />
              <el-option label="列车管理" value="列车管理" />
              <el-option label="系统操作" value="系统操作" />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-button size="small" @click="clearLogs" type="danger">清空日志</el-button>
          </el-col>
          <el-col :span="8">
            <el-button size="small" @click="exportLogs" type="primary">导出日志</el-button>
          </el-col>
        </el-row>
      </div>
      <div class="log-container">
        <el-table :data="filteredLogs" size="small" height="300">
          <el-table-column prop="timestamp" label="时间" width="140" />
          <el-table-column prop="operation" label="操作类型" width="100" />
          <el-table-column prop="details" label="详细信息" />
          <el-table-column prop="operator" label="操作员" width="100" />
        </el-table>
      </div>
    </div>

    <div class="control-section">
      <h4>性能监控</h4>
      <el-row :gutter="15">
        <el-col :span="12">
          <div class="performance-item">
            <span>系统运行时间</span>
            <span class="performance-value">{{ systemUptime }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="performance-item">
            <span>数据更新频率</span>
            <span class="performance-value">{{ updateFrequency }}ms</span>
          </div>
        </el-col>
      </el-row>
      <el-row :gutter="15" style="margin-top: 10px;">
        <el-col :span="12">
          <div class="performance-item">
            <span>存储使用量</span>
            <span class="performance-value">{{ storageUsage }}KB</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="performance-item">
            <span>今日操作次数</span>
            <span class="performance-value">{{ todayOperations }}</span>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="control-section">
      <h4>系统维护</h4>
      <el-row :gutter="10">
        <el-col :span="8">
          <el-button size="small" @click="backupData" type="success" style="width: 100%">
            备份数据
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button size="small" @click="restoreData" type="warning" style="width: 100%">
            恢复数据
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button size="small" @click="systemCheck" type="primary" style="width: 100%">
            系统自检
          </el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRailwayStore } from '@/stores/railway'

const railwayStore = useRailwayStore()

// 响应式数据
const logFilter = ref('')
const systemStartTime = ref(new Date())
const updateFrequency = ref(1000)

// 定时器
let performanceTimer = null

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

const trainsCount = computed(() => {
  return railwayStore.trains.trainList.length
})

const deviceStatistics = computed(() => {
  const stats = []
  
  // 道岔统计
  const turnouts = Object.values(railwayStore.stationLayout.turnouts)
  const turnoutNormal = turnouts.filter(t => !t.defective && !t.blocked).length
  stats.push({
    type: '道岔',
    total: turnouts.length,
    normal: turnoutNormal,
    abnormal: turnouts.length - turnoutNormal,
    rate: Math.round((turnoutNormal / turnouts.length) * 100)
  })
  
  // 信号机统计
  const signals = Object.values(railwayStore.stationLayout.signals)
  const signalNormal = signals.filter(s => !s.locked).length
  stats.push({
    type: '信号机',
    total: signals.length,
    normal: signalNormal,
    abnormal: signals.length - signalNormal,
    rate: Math.round((signalNormal / signals.length) * 100)
  })
  
  // 轨道区段统计
  const tracks = Object.values(railwayStore.stationLayout.trackSections)
  const trackNormal = tracks.filter(t => !t.locked).length
  stats.push({
    type: '轨道区段',
    total: tracks.length,
    normal: trackNormal,
    abnormal: tracks.length - trackNormal,
    rate: Math.round((trackNormal / tracks.length) * 100)
  })
  
  return stats
})

const filteredLogs = computed(() => {
  if (!logFilter.value) {
    return railwayStore.operationLog
  }
  return railwayStore.operationLog.filter(log => log.operation === logFilter.value)
})

const systemUptime = computed(() => {
  const now = new Date()
  const diff = now - systemStartTime.value
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}时${minutes}分`
})

const storageUsage = computed(() => {
  const data = localStorage.getItem('railwaySystemData')
  return data ? Math.round(data.length / 1024) : 0
})

const todayOperations = computed(() => {
  const today = new Date().toDateString()
  return railwayStore.operationLog.filter(log => {
    return new Date(log.timestamp).toDateString() === today
  }).length
})

// 方法
const getProgressColor = (rate) => {
  if (rate >= 90) return '#67c23a'
  if (rate >= 70) return '#e6a23c'
  return '#f56c6c'
}

const clearLogs = () => {
  ElMessageBox.confirm('确定要清空所有操作日志吗？', '清空日志', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    railwayStore.operationLog.length = 0
    railwayStore.saveToStorage()
    ElMessage.success('操作日志已清空')
  }).catch(() => {
    // 取消操作
  })
}

const exportLogs = () => {
  const logs = filteredLogs.value
  const csvContent = [
    ['时间', '操作类型', '详细信息', '操作员'],
    ...logs.map(log => [log.timestamp, log.operation, log.details, log.operator])
  ].map(row => row.join(',')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `操作日志_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success('日志导出成功')
}

const backupData = () => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      systemData: {
        stationLayout: railwayStore.stationLayout,
        routes: railwayStore.routes,
        trains: railwayStore.trains,
        operationLog: railwayStore.operationLog
      }
    }
    
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `系统备份_${new Date().toISOString().slice(0, 10)}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    railwayStore.addLog('系统维护', '系统数据备份完成')
    ElMessage.success('数据备份成功')
  } catch (error) {
    ElMessage.error('备份失败: ' + error.message)
  }
}

const restoreData = () => {
  ElMessageBox.confirm('恢复数据将覆盖当前所有数据，确定继续吗？', '恢复数据', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result)
            if (data.systemData) {
              Object.assign(railwayStore.stationLayout, data.systemData.stationLayout)
              Object.assign(railwayStore.routes, data.systemData.routes)
              Object.assign(railwayStore.trains, data.systemData.trains)
              railwayStore.operationLog.length = 0
              railwayStore.operationLog.push(...data.systemData.operationLog)
              
              railwayStore.saveToStorage()
              railwayStore.addLog('系统维护', '系统数据恢复完成')
              ElMessage.success('数据恢复成功')
            } else {
              throw new Error('无效的备份文件格式')
            }
          } catch (error) {
            ElMessage.error('恢复失败: ' + error.message)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }).catch(() => {
    // 取消操作
  })
}

const systemCheck = () => {
  ElMessage.info('正在进行系统自检...')
  
  setTimeout(() => {
    const issues = []
    
    // 检查道岔状态
    Object.entries(railwayStore.stationLayout.turnouts).forEach(([id, turnout]) => {
      if (turnout.defective) {
        issues.push(`道岔${id}故障`)
      }
    })
    
    // 检查信号机状态
    Object.entries(railwayStore.stationLayout.signals).forEach(([id, signal]) => {
      if (signal.locked && signal.aspect !== 'red') {
        issues.push(`信号机${id}状态异常`)
      }
    })
    
    // 检查进路冲突
    const activeRoutes = railwayStore.routes.activeRoutes
    for (let i = 0; i < activeRoutes.length; i++) {
      for (let j = i + 1; j < activeRoutes.length; j++) {
        const hasConflict = activeRoutes[i].path.some(section => 
          activeRoutes[j].path.includes(section)
        )
        if (hasConflict) {
          issues.push(`进路${activeRoutes[i].name}与${activeRoutes[j].name}存在冲突`)
        }
      }
    }
    
    if (issues.length === 0) {
      ElMessage.success('系统自检通过，未发现问题')
    } else {
      ElMessageBox.alert(
        issues.join('\n'),
        '系统自检发现问题',
        {
          confirmButtonText: '确定',
          type: 'warning'
        }
      )
    }
    
    railwayStore.addLog('系统维护', `系统自检完成，发现${issues.length}个问题`)
  }, 2000)
}

// 生命周期
onMounted(() => {
  systemStartTime.value = new Date()
  
  // 定时更新性能数据
  performanceTimer = setInterval(() => {
    // 更新性能指标
  }, 5000)
})

onUnmounted(() => {
  if (performanceTimer) {
    clearInterval(performanceTimer)
  }
})
</script>

<style scoped>
.system-monitor {
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

.status-card {
  background: white;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e8e8e8;
}

.status-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.status-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.log-controls {
  margin-bottom: 15px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
}

.performance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  font-size: 14px;
}

.performance-value {
  font-weight: bold;
  color: #409eff;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-progress-bar__outer) {
  height: 8px !important;
}
</style> 