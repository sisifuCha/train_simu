<template>
  <div class="station-diagram" ref="diagramContainer">
    <svg width="100%" height="100%" viewBox="0 0 1200 400">
      <!-- 轨道线路 -->
      <g class="tracks">
        <!-- 进站部分 -->
        <path d="M 50 200 H 280" class="track-line" />

        <!-- 道岔3 -->
        <path d="M 280 200 L 330 150 H 780" class="track-line" /> <!-- to 3G -->
        <path d="M 280 200 H 780" class="track-line" /> <!-- to I IG -->
        
        <!-- 道岔5 -->
        <path d="M 230 200 L 280 250 H 780" class="track-line" /> <!-- to 1G -->
        
        <!-- 安全线 -->
        <path d="M 230 200 L 180 250 H 130" class="track-line" />
        <path d="M 130 260 H 120" class="track-line" />
        <path d="M 130 240 H 120" class="track-line" />

        <!-- 出站部分 -->
        <path d="M 820 150 L 870 200" class="track-line" /> <!-- from 3G -->
        <path d="M 820 250 L 870 200" class="track-line" /> <!-- from 1G -->
        <path d="M 780 200 H 1150" class="track-line" /> <!-- Main exit -->
      </g>

      <!-- 轨道区段高亮 -->
      <g class="track-sections">
        <path d="M 100 200 H 280" :class="getTrackSectionClass('I IAG')" @click="toggleOccupation('I IAG')" />
        <text x="190" y="215">I IAG</text>

        <path d="M 330 150 H 780" :class="getTrackSectionClass('3G')" @click="toggleOccupation('3G')" />
        <text x="555" y="135">3G</text>

        <path d="M 330 200 H 780" :class="getTrackSectionClass('I IG')" @click="toggleOccupation('I IG')" />
        <text x="555" y="215">I IG</text>
        
        <path d="M 280 250 H 780" :class="getTrackSectionClass('1G')" @click="toggleOccupation('1G')" />
        <text x="555" y="265">1G</text>

        <path d="M 870 200 H 1100" :class="getTrackSectionClass('I IBG')" @click="toggleOccupation('I IBG')" />
        <text x="985" y="215">I IBG</text>

        <path d="M 50 200 H 100" :class="getTrackSectionClass('JXG')" @click="toggleOccupation('JXG')" />
        <text x="75" y="215">JXG</text>

        <path d="M 1100 200 H 1150" :class="getTrackSectionClass('JSG')" @click="toggleOccupation('JSG')" />
        <text x="1125" y="215">JSG</text>
        
        <path d="M 180 250 H 130" :class="getTrackSectionClass('安全线')" @click="toggleOccupation('安全线')" />
        <text x="155" y="235">安全线</text>
      </g>
      
      <!-- 道岔 -->
      <g v-for="(turnout, id) in turnouts" :key="id" class="turnout-group" @click="operateTurnout(id)">
        <g :transform="`translate(${getDevicePosition(id).x}, ${getDevicePosition(id).y})`">
          <circle r="8" :class="getTurnoutClass(turnout)" />
          <text y="-10" class="device-label">{{ id }}</text>
          <text v-if="turnout.position === 'normal'" y="20" class="position-label">定位</text>
          <text v-else y="20" class="position-label">反位</text>
        </g>
      </g>

      <!-- 信号机 -->
      <g v-for="(signal, id) in signals" :key="id" class="signal-group" @click="operateSignal(id)">
        <g :transform="`translate(${getDevicePosition(id).x}, ${getDevicePosition(id).y})`">
          <rect x="-4" y="-15" width="8" height="30" class="signal-pole" />
          <circle r="6" :fill="getSignalColor(signal)" class="signal-light" />
          <text y="25" class="device-label">{{ id }}</text>
        </g>
      </g>

      <!-- 其他设备 -->
      <g v-for="(device, id) in devices" :key="id" class="device-group">
        <g :transform="`translate(${getDevicePosition(id).x}, ${getDevicePosition(id).y})`">
           <circle r="6" :class="getDeviceClass(device)" />
           <text y="-10" class="device-label">{{ id }}</text>
        </g>
      </g>

    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRailwayStore } from '@/stores/railway'

const railwayStore = useRailwayStore()

const trackSections = computed(() => railwayStore.stationLayout.trackSections)
const turnouts = computed(() => railwayStore.stationLayout.turnouts)
const signals = computed(() => railwayStore.stationLayout.signals)
const devices = computed(() => railwayStore.stationLayout.devices)

const getDevicePosition = (id) => {
  const positions = {
    // Signals
    'X': { x: 80, y: 200 },
    'S3': { x: 340, y: 150 },
    'SII': { x: 340, y: 200 },
    'S1': { x: 340, y: 250 },
    'K3': { x: 790, y: 150 },
    'XII': { x: 790, y: 200 },
    'X1': { x: 790, y: 250 },
    'S': { x: 1120, y: 200 },
    // Turnouts
    '3': { x: 280, y: 200 },
    '5': { x: 230, y: 200 },
    '4': { x: 820, y: 150 },
    '2': { x: 870, y: 200 },
    // Other Devices
    'D1': { x: 150, y: 200 },
    'D2': { x: 1000, y: 200 },
    'PZA': { x: 200, y: 300}, // Placeholder
  }
  return positions[id] || { x: 0, y: 0 }
}

const getTrackSectionClass = (id) => {
  const section = trackSections.value[id]
  if (!section) return 'track-highlight'
  return [
    'track-highlight',
    { 
      'occupied': section.occupied, 
      'locked': section.locked 
    }
  ]
}

const getTurnoutClass = (turnout) => {
  return [
    'turnout-circle',
    {
      'locked': turnout.locked,
      'single-locked': turnout.singleLocked,
      'blocked': turnout.blocked,
      'defective': turnout.defective
    }
  ]
}

const getDeviceClass = (device) => {
  return [ 'device-circle', { 'locked': device.locked }]
}

const getSignalColor = (signal) => {
  if (!signal) return '#555'
  switch (signal.aspect) {
    case 'green': return '#00ff00'
    case 'yellow': return '#ffff00'
    case 'red': return '#ff0000'
    default: return '#ff0000'
  }
}

const toggleOccupation = (id) => {
  const section = trackSections.value[id]
  if (section) {
    section.occupied = !section.occupied
    railwayStore.addLog('轨道操作', `区段 ${id} ${section.occupied ? '占用' : '出清'}`)
  }
}

const operateTurnout = (id) => {
  const turnout = turnouts.value[id]
  if (turnout && !turnout.locked && !turnout.singleLocked) {
    turnout.position = turnout.position === 'normal' ? 'reverse' : 'normal'
    railwayStore.addLog('道岔操作', `道岔 ${id} 转换到 ${turnout.position} 位置`)
  }
}

const operateSignal = (id) => {
  const signal = signals.value[id]
  if (signal && !signal.automated) {
    const aspects = ['red', 'yellow', 'green']
    const currentIndex = aspects.indexOf(signal.aspect)
    signal.aspect = aspects[(currentIndex + 1) % aspects.length]
    railwayStore.addLog('信号操作', `信号 ${id} 手动操作`)
  }
}
</script>

<style scoped>
.station-diagram {
  background: #2c3e50;
  color: #bdc3c7;
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
.track-highlight.occupied {
  stroke: #e74c3c;
  opacity: 0.8;
}
.track-highlight.locked {
  stroke: #f1c40f;
  opacity: 0.7;
}

/* Devices */
.device-label, .position-label {
  font-size: 10px;
  fill: #ecf0f1;
  text-anchor: middle;
}

/* Turnout */
.turnout-group { cursor: pointer; }
.turnout-circle {
  fill: #2ecc71; /* Normal green */
  stroke: #ecf0f1;
  stroke-width: 1.5;
  transition: all 0.2s ease-in-out;
}
.turnout-circle:hover { transform: scale(1.2); }
.turnout-circle.locked { fill: #f1c40f; } /* Locked yellow */
.turnout-circle.single-locked { fill: #e67e22; } /* Single lock orange */
.turnout-circle.blocked, .turnout-circle.defective { fill: #c0392b; } /* Blocked/Defective red */

/* Signal */
.signal-group { cursor: pointer; }
.signal-pole { fill: #7f8c8d; }
.signal-light { stroke: #34495e; stroke-width: 1.5; }

/* Other Devices */
.device-group { cursor: pointer; }
.device-circle { fill: #95a5a6; }
.device-circle.locked { fill: #e74c3c; }
</style> 