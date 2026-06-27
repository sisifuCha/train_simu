<template>
  <div class="log-panel">
    <div class="log-toolbar">
      <div class="filter-btns">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeFilter === f.value }"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <span class="log-count">共 {{ filteredLogs.length }} 条</span>
        <button class="btn-sm btn-outline" @click="clearLog">清空</button>
        <button class="btn-sm btn-outline" @click="exportLog">导出</button>
      </div>
    </div>

    <div class="log-table">
      <div class="log-header">
        <span class="col-time">时间</span>
        <span class="col-op">操作</span>
        <span class="col-detail">详情</span>
      </div>
      <div class="log-body">
        <div v-if="filteredLogs.length === 0" class="empty-tip">暂无日志记录</div>
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="log-row"
          :class="`row-${log.level}`"
        >
          <span class="col-time">{{ log.time }}</span>
          <span class="col-op">{{ log.operation }}</span>
          <span class="col-detail">{{ log.detail }}</span>
        </div>
      </div>
    </div>

    <!-- 系统状态概览 -->
    <div class="status-overview">
      <div class="card-title">设备状态概览</div>
      <div class="overview-grid">
        <div class="ov-item">
          <span class="ov-val">{{ sectionStats.total }}</span>
          <span class="ov-label">轨道区段</span>
        </div>
        <div class="ov-item green">
          <span class="ov-val">{{ sectionStats.free }}</span>
          <span class="ov-label">空闲</span>
        </div>
        <div class="ov-item orange">
          <span class="ov-val">{{ sectionStats.locked }}</span>
          <span class="ov-label">锁闭</span>
        </div>
        <div class="ov-item red">
          <span class="ov-val">{{ sectionStats.occupied }}</span>
          <span class="ov-label">占用</span>
        </div>
        <div class="ov-sep"></div>
        <div class="ov-item">
          <span class="ov-val">{{ turnoutStats.total }}</span>
          <span class="ov-label">道岔</span>
        </div>
        <div class="ov-item green">
          <span class="ov-val">{{ turnoutStats.normal }}</span>
          <span class="ov-label">正常</span>
        </div>
        <div class="ov-item red">
          <span class="ov-val">{{ turnoutStats.fault }}</span>
          <span class="ov-label">故障/封锁</span>
        </div>
        <div class="ov-sep"></div>
        <div class="ov-item">
          <span class="ov-val">{{ railway.activeRoutes.length }}</span>
          <span class="ov-label">活动进路</span>
        </div>
        <div class="ov-item">
          <span class="ov-val">{{ railway.trains.length }}</span>
          <span class="ov-label">在站列车</span>
        </div>
      </div>
    </div>

    <!-- 重置系统 -->
    <div class="reset-section">
      <button class="btn btn-danger" @click="confirmReset">系统全体复位</button>
      <span class="reset-hint">清除所有进路、列车及设备故障，恢复初始状态</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'

const railway = useRailwayStore()

const activeFilter = ref('all')
const filters = [
  { value: 'all',     label: '全部' },
  { value: 'success', label: '成功' },
  { value: 'error',   label: '错误' },
  { value: 'warn',    label: '警告' },
  { value: 'info',    label: '信息' }
]

const filteredLogs = computed(() => {
  if (activeFilter.value === 'all') return railway.operationLog
  return railway.operationLog.filter(l => l.level === activeFilter.value)
})

const sectionStats = computed(() => {
  const sections = Object.values(railway.stationLayout.trackSections)
  return {
    total: sections.length,
    free: sections.filter(s => !s.occupied && !s.locked && !s.blocked).length,
    locked: sections.filter(s => s.locked && !s.occupied).length,
    occupied: sections.filter(s => s.occupied).length
  }
})
const turnoutStats = computed(() => {
  const turnouts = Object.values(railway.stationLayout.turnouts)
  return {
    total: turnouts.length,
    normal: turnouts.filter(t => !t.defective && !t.blocked).length,
    fault: turnouts.filter(t => t.defective || t.blocked).length
  }
})

function clearLog() {
  railway.operationLog.splice(0)
}

function exportLog() {
  const lines = filteredLogs.value.map(l => `${l.time}\t${l.operation}\t${l.detail}`)
  const csv = '时间\t操作\t详情\n' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `操作日志_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.txt`
  a.click()
}

function confirmReset() {
  if (confirm('确定要重置系统吗？所有进路、列车和故障状态将被清除。')) {
    railway.resetAll()
  }
}
</script>

<style scoped>
.log-panel { display: flex; flex-direction: column; gap: 10px; }

.log-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-btns { display: flex; gap: 4px; }
.filter-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  transition: all 0.1s;
}
.filter-btn:hover { border-color: var(--accent-green); color: var(--accent-green); }
.filter-btn.active { border-color: var(--accent-green); color: var(--accent-green); background: rgba(57,211,83,0.1); }

.toolbar-right { display: flex; align-items: center; gap: 8px; }
.log-count { font-size: 11px; color: var(--text-muted); }
.btn-sm { padding: 3px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; }
.btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline:hover { border-color: var(--accent-green); color: var(--accent-green); }

.log-table {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.log-header {
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}
.log-body { max-height: 260px; overflow-y: auto; }
.empty-tip { font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px; }
.log-row {
  display: flex;
  gap: 12px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--border-light);
  font-size: 11px;
  transition: background 0.1s;
}
.log-row:hover { background: var(--bg-hover); }
.row-success { border-left: 2px solid var(--track-free); }
.row-error   { border-left: 2px solid var(--track-occupied); }
.row-warn    { border-left: 2px solid var(--track-locked); }
.row-info    { border-left: 2px solid var(--border); }

.col-time   { width: 70px; flex-shrink: 0; color: var(--text-muted); font-family: var(--font-mono); }
.col-op     { width: 100px; flex-shrink: 0; font-weight: 600; color: var(--text-primary); }
.col-detail { flex: 1; color: var(--text-secondary); }

/* 状态概览 */
.status-overview {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
}
.card-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.overview-grid { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.ov-item { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 50px; }
.ov-val { font-size: 22px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }
.ov-label { font-size: 10px; color: var(--text-muted); }
.ov-item.green .ov-val { color: var(--track-free); }
.ov-item.orange .ov-val { color: var(--track-locked); }
.ov-item.red .ov-val { color: var(--track-occupied); }
.ov-sep { width: 1px; height: 40px; background: var(--border); }

/* 重置 */
.reset-section { display: flex; align-items: center; gap: 12px; }
.btn { padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; }
.btn-danger { background: rgba(255,71,87,0.15); border: 1px solid var(--track-occupied); color: var(--track-occupied); }
.btn-danger:hover { background: rgba(255,71,87,0.25); }
.reset-hint { font-size: 11px; color: var(--text-muted); }
</style>
