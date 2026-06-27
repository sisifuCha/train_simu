<template>
  <header class="app-header">
    <div class="header-left">
      <div class="system-logo">
        <span class="logo-icon">▶</span>
        <div class="logo-text">
          <span class="logo-title">计算机联锁模拟仿真系统</span>
          <span class="logo-sub">Computer Interlocking Simulation System</span>
        </div>
      </div>
    </div>

    <div class="header-center">
      <div class="status-indicators">
        <div class="indicator" :class="systemOk ? 'ok' : 'warn'">
          <span class="led"></span>
          <span>{{ systemOk ? '系统正常' : '系统异常' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">进路</span>
          <span class="stat-value">{{ activeRouteCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">列车</span>
          <span class="stat-value">{{ trainCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">故障</span>
          <span class="stat-value" :class="faultCount > 0 ? 'fault' : ''">{{ faultCount }}</span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <router-link to="/ref" class="ref-link" title="查看参考系统站场图">参考图</router-link>
      <div class="clock">
        <span class="clock-time">{{ currentTime }}</span>
        <span class="clock-date">{{ currentDate }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'

const railway = useRailwayStore()

const currentTime = ref('')
const currentDate = ref('')

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

let timer
onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
})
onUnmounted(() => clearInterval(timer))

const activeRouteCount = computed(() => railway.activeRoutes.length)
const trainCount = computed(() => railway.trains.length)

const faultCount = computed(() => {
  let n = 0
  Object.values(railway.stationLayout.turnouts).forEach(t => { if (t.defective || t.blocked) n++ })
  Object.values(railway.stationLayout.signals).forEach(s => { if (s.defective) n++ })
  return n
})

const systemOk = computed(() => faultCount.value === 0)
</script>

<style scoped>
.app-header {
  height: 52px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  flex-shrink: 0;
}

.header-left, .header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.ref-link {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-panel);
  white-space: nowrap;
}
.ref-link:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.system-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon {
  font-size: 20px;
  color: var(--accent-green);
  filter: drop-shadow(0 0 6px var(--accent-green));
}
.logo-text {
  display: flex;
  flex-direction: column;
}
.logo-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
}
.logo-sub {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 20px;
}
.indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}
.indicator .led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.indicator.ok   { color: var(--track-free); }
.indicator.ok .led { background: var(--track-free); box-shadow: 0 0 6px var(--track-free); }
.indicator.warn { color: var(--track-occupied); }
.indicator.warn .led { background: var(--track-occupied); box-shadow: 0 0 6px var(--track-occupied); animation: blink 1s infinite; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.stat-label { color: var(--text-secondary); }
.stat-value { color: var(--text-primary); font-weight: 700; font-variant-numeric: tabular-nums; }
.stat-value.fault { color: var(--track-occupied); }

.clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.clock-time {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--accent-green);
  letter-spacing: 2px;
}
.clock-date {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
</style>
