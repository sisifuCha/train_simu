<template>
  <div class="dashboard" @click="closePopup">
    <AppHeader />

    <div class="dashboard-body">
      <AppSidebar :active-panel="activePanel" @change="activePanel = $event" />

      <main class="main-area">
        <!-- 站场图 -->
        <div class="map-section">
          <StationMap
            @turnout-click="onTurnoutClick"
            @signal-click="onSignalClick"
            @section-click="onSectionClick"
            @close-popup="closePopup"
          />
        </div>

        <!-- 控制面板 -->
        <div class="control-section">
          <RoutePanel   v-if="activePanel === 'route'" />
          <TurnoutPanel v-else-if="activePanel === 'turnout'" />
          <SignalPanel  v-else-if="activePanel === 'signal'" />
          <TrainPanel   v-else-if="activePanel === 'train'" />
          <LogPanel     v-else-if="activePanel === 'log'" />
        </div>
      </main>
    </div>

    <!-- 设备点击弹窗（全局浮层） -->
    <DevicePopup
      v-if="popup.visible"
      :type="popup.type"
      :device="popup.device"
      :pos="popup.pos"
      @close="closePopup"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'
import AppHeader    from '@/components/layout/AppHeader.vue'
import AppSidebar   from '@/components/layout/AppSidebar.vue'
import StationMap   from '@/components/station/StationMap.vue'
import DevicePopup  from '@/components/common/DevicePopup.vue'
import RoutePanel   from '@/components/panels/RoutePanel.vue'
import TurnoutPanel from '@/components/panels/TurnoutPanel.vue'
import SignalPanel  from '@/components/panels/SignalPanel.vue'
import TrainPanel   from '@/components/panels/TrainPanel.vue'
import LogPanel     from '@/components/panels/LogPanel.vue'

const railway     = useRailwayStore()
const activePanel = ref('route')

const popup = reactive({
  visible: false,
  type:    null,   // 'turnout' | 'signal' | 'section'
  device:  null,
  pos:     { x: 0, y: 0 }
})

function openPopup(type, deviceId, clientPos) {
  let device = null
  if (type === 'turnout') device = railway.stationLayout.turnouts[deviceId]
  if (type === 'signal')  device = railway.stationLayout.signals[deviceId]
  if (type === 'section') device = railway.stationLayout.trackSections[deviceId]
  if (!device) return
  popup.type    = type
  popup.device  = device
  popup.pos     = clientPos ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  popup.visible = true
}

function closePopup() { popup.visible = false }

function onTurnoutClick(id, pos)  { openPopup('turnout', id, pos) }
function onSignalClick(id, pos)   { openPopup('signal',  id, pos) }
function onSectionClick(id)       { openPopup('section', id) }
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.dashboard-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px 12px;
  gap: 10px;
}

.map-section { flex-shrink: 0; }

.control-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
