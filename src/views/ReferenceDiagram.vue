<template>
  <div class="ref-page">
    <!-- 顶部导航栏 -->
    <div class="ref-header">
      <button class="back-btn" @click="$router.push('/')">← 返回主系统</button>
      <h2>参考系统站场图（原版）</h2>
      <div class="ref-controls">
        <button class="ctrl-btn reset" @click="refStore.reset()">复位</button>
        <span class="tip">点击区段切换占用 · 点击道岔切换定/反位 · 点击信号机切换灯色</span>
      </div>
    </div>

    <!-- 日志区 -->
    <div class="ref-log" v-if="refStore.operationLog.length">
      <span v-for="log in refStore.operationLog.slice(0,5)" :key="log.id" class="log-item">
        [{{ log.timestamp }}] {{ log.operation }}：{{ log.details }}
      </span>
    </div>

    <!-- ══ 参考 StationDiagram 原版（仅改 store 引用）══ -->
    <div class="station-diagram">
      <svg width="100%" height="100%" viewBox="0 0 1200 400">
        <!-- 轨道线路 -->
        <g class="tracks">
          <path d="M 50 200 H 280" class="track-line" />
          <path d="M 280 200 L 330 150 H 780" class="track-line" />
          <path d="M 280 200 H 780" class="track-line" />
          <path d="M 230 200 L 280 250 H 780" class="track-line" />
          <path d="M 230 200 L 180 250 H 130" class="track-line" />
          <path d="M 130 260 H 120" class="track-line" />
          <path d="M 130 240 H 120" class="track-line" />
          <path d="M 820 150 L 870 200" class="track-line" />
          <path d="M 820 250 L 870 200" class="track-line" />
          <path d="M 780 200 H 1150" class="track-line" />
        </g>

        <!-- 轨道区段高亮 -->
        <g class="track-sections">
          <path d="M 100 200 H 280" :class="getSectionClass('I IAG')" @click="toggleOcc('I IAG')" />
          <text x="190" y="215">I IAG</text>

          <path d="M 330 150 H 780" :class="getSectionClass('3G')" @click="toggleOcc('3G')" />
          <text x="555" y="135">3G</text>

          <path d="M 330 200 H 780" :class="getSectionClass('I IG')" @click="toggleOcc('I IG')" />
          <text x="555" y="215">I IG</text>

          <path d="M 280 250 H 780" :class="getSectionClass('1G')" @click="toggleOcc('1G')" />
          <text x="555" y="265">1G</text>

          <path d="M 870 200 H 1100" :class="getSectionClass('I IBG')" @click="toggleOcc('I IBG')" />
          <text x="985" y="215">I IBG</text>

          <path d="M 50 200 H 100" :class="getSectionClass('JXG')" @click="toggleOcc('JXG')" />
          <text x="75" y="215">JXG</text>

          <path d="M 1100 200 H 1150" :class="getSectionClass('JSG')" @click="toggleOcc('JSG')" />
          <text x="1125" y="215">JSG</text>

          <path d="M 180 250 H 130" :class="getSectionClass('安全线')" @click="toggleOcc('安全线')" />
          <text x="155" y="235">安全线</text>
        </g>

        <!-- 道岔 -->
        <g v-for="(t, id) in ts.turnouts" :key="id" class="turnout-group" @click="operateTurnout(id)">
          <g :transform="`translate(${pos(id).x}, ${pos(id).y})`">
            <circle r="8" :class="getTurnoutClass(t)" />
            <text y="-10" class="device-label">{{ id }}</text>
            <text y="20" class="position-label">{{ t.position === 'normal' ? '定位' : '反位' }}</text>
          </g>
        </g>

        <!-- 信号机 -->
        <g v-for="(sig, id) in ts.signals" :key="id" class="signal-group" @click="operateSignal(id)">
          <g :transform="`translate(${pos(id).x}, ${pos(id).y})`">
            <rect x="-4" y="-15" width="8" height="30" class="signal-pole" />
            <circle r="6" :fill="sigColor(sig)" class="signal-light" />
            <text y="25" class="device-label">{{ id }}</text>
          </g>
        </g>

        <!-- 其他设备 -->
        <g v-for="(dev, id) in ts.devices" :key="id" class="device-group">
          <g :transform="`translate(${pos(id).x}, ${pos(id).y})`">
            <circle r="6" :class="['device-circle', { locked: dev.locked }]" />
            <text y="-10" class="device-label">{{ id }}</text>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useReferenceRailwayStore } from '@/stores/referenceRailway.js'

const refStore = useReferenceRailwayStore()
const ts = computed(() => refStore.stationLayout)

// 设备坐标（原版完整保留）
const POSITIONS = {
  'X':   { x: 80,   y: 200 },
  'S3':  { x: 340,  y: 150 },
  'SII': { x: 340,  y: 200 },
  'S1':  { x: 340,  y: 250 },
  'K3':  { x: 790,  y: 150 },
  'XII': { x: 790,  y: 200 },
  'X1':  { x: 790,  y: 250 },
  'S':   { x: 1120, y: 200 },
  '3':   { x: 280,  y: 200 },
  '5':   { x: 230,  y: 200 },
  '4':   { x: 820,  y: 150 },
  '2':   { x: 870,  y: 200 },
  'D1':  { x: 150,  y: 200 },
  'D2':  { x: 1000, y: 200 },
  'PZA': { x: 200,  y: 300 },
}
function pos(id) { return POSITIONS[id] || { x: 0, y: 0 } }

function getSectionClass(id) {
  const s = ts.value.trackSections[id]
  if (!s) return 'track-highlight'
  return ['track-highlight', { occupied: s.occupied, locked: s.locked }]
}
function getTurnoutClass(t) {
  return ['turnout-circle', { locked: t.locked, 'single-locked': t.singleLocked, blocked: t.blocked, defective: t.defective }]
}
function sigColor(sig) {
  if (!sig) return '#555'
  return { green: '#00ff00', yellow: '#ffff00', red: '#ff0000' }[sig.aspect] ?? '#ff0000'
}

function toggleOcc(id) {
  const s = ts.value.trackSections[id]
  if (s) { s.occupied = !s.occupied; refStore.addLog('轨道操作', `区段 ${id} ${s.occupied ? '占用' : '出清'}`) }
}
function operateTurnout(id) {
  const t = ts.value.turnouts[id]
  if (t && !t.locked && !t.singleLocked) {
    t.position = t.position === 'normal' ? 'reverse' : 'normal'
    refStore.addLog('道岔操作', `道岔 ${id} → ${t.position === 'normal' ? '定位' : '反位'}`)
  }
}
function operateSignal(id) {
  const sig = ts.value.signals[id]
  if (sig && !sig.automated) {
    const aspects = ['red', 'yellow', 'green']
    sig.aspect = aspects[(aspects.indexOf(sig.aspect) + 1) % aspects.length]
    refStore.addLog('信号操作', `信号 ${id} → ${sig.aspect}`)
  }
}
</script>

<style scoped>
.ref-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.ref-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}
.ref-header h2 { margin: 0; font-size: 18px; font-weight: 600; flex: 1; }

.back-btn {
  padding: 6px 14px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.4);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.back-btn:hover { background: rgba(255,255,255,0.25); }

.ref-controls { display: flex; align-items: center; gap: 12px; }
.ctrl-btn {
  padding: 5px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}
.ctrl-btn.reset { background: #e74c3c; color: white; }
.ctrl-btn.reset:hover { background: #c0392b; }
.tip { font-size: 11px; color: rgba(255,255,255,0.7); }

.ref-log {
  background: #1a1a2e;
  padding: 6px 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
  border-bottom: 1px solid #333;
}
.log-item { font-size: 11px; color: #a0c4ff; font-family: 'Courier New', monospace; }

/* ══ 参考原版样式（原封不动）══ */
.station-diagram {
  flex: 1;
  background: #2c3e50;
  color: #bdc3c7;
  overflow: hidden;
}
.tracks .track-line {
  stroke: #7f8c8d;
  stroke-width: 3;
  fill: none;
}
.track-sections text {
  font-size: 10px;
  fill: #ecf0f1;
  text-anchor: middle;
  pointer-events: none;
}
.track-highlight {
  stroke: transparent;
  stroke-width: 15;
  fill: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.track-highlight.occupied { stroke: #e74c3c; opacity: 0.8; }
.track-highlight.locked   { stroke: #f1c40f; opacity: 0.7; }

.device-label, .position-label {
  font-size: 10px;
  fill: #ecf0f1;
  text-anchor: middle;
}

.turnout-group { cursor: pointer; }
.turnout-circle {
  fill: #2ecc71;
  stroke: #ecf0f1;
  stroke-width: 1.5;
  transition: all 0.2s ease-in-out;
}
.turnout-circle:hover { r: 10; }
.turnout-circle.locked        { fill: #f1c40f; }
.turnout-circle.single-locked { fill: #e67e22; }
.turnout-circle.blocked,
.turnout-circle.defective     { fill: #c0392b; }

.signal-group { cursor: pointer; }
.signal-pole  { fill: #7f8c8d; }
.signal-light { stroke: #34495e; stroke-width: 1.5; }

.device-group  { cursor: pointer; }
.device-circle { fill: #95a5a6; }
.device-circle.locked { fill: #e74c3c; }
</style>
