<template>
  <div class="signal-panel">
    <div class="panel-row">
      <div v-for="(sig, id) in ts.signals" :key="id" class="signal-card">
        <!-- 信号灯显示 -->
        <div class="sig-lamp-row">
          <div class="sig-lamp" :class="`lamp-${sig.defective ? 'off' : sig.aspect}`"></div>
          <div class="sig-id-col">
            <span class="sig-id">{{ sig.id }}</span>
            <span class="sig-name">{{ sig.name }}</span>
            <span class="sig-type" :class="`type-${sig.type}`">{{ typeLabel(sig.type) }}</span>
          </div>
        </div>

        <!-- 故障标记 -->
        <div v-if="sig.defective" class="defective-banner">⚠ 信号机故障 — 断丝状态</div>

        <!-- 人工控制 -->
        <div class="sig-section">
          <div class="section-title">人工控制</div>
          <div v-if="sig.automated" class="open-hint">本信号由进路自动控制，请办理进路开放</div>
          <div class="aspect-btns">
            <button class="asp-btn green" :disabled="sig.defective || sig.automated || sig.aspect === 'green'"
              @click="setAspect(id, 'green')">绿灯</button>
            <button class="asp-btn yellow" :disabled="sig.defective || sig.automated || sig.aspect === 'yellow' || sig.type !== 'shunting'"
              @click="setAspect(id, 'yellow')">黄灯</button>
            <button class="asp-btn red" :disabled="sig.defective || sig.automated || sig.aspect === 'red'"
              @click="setAspect(id, 'red')">红灯</button>
          </div>
        </div>

        <!-- 故障仿真（断丝模拟） -->
        <div class="sig-section">
          <div class="section-title">故障仿真（断丝）</div>
          <button class="btn w-full" :class="sig.defective ? 'btn-red' : 'btn-outline-red'"
            @click="toggleDefective(id, !sig.defective)">
            {{ sig.defective ? '● 断丝中（点击恢复）' : '模拟断丝故障' }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="message" class="message-toast" :class="`toast-${messageType}`">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'
import { useInterlockingStore } from '@/stores/interlocking.js'
import { useNotify } from '@/composables/useNotify.js'

const railway = useRailwayStore()
const interlocking = useInterlockingStore()
const { ok, err, warn, info } = useNotify()
const ts = computed(() => railway.stationLayout)

const message = ref('')
const messageType = ref('info')

// 统一改走全局消息条
function showMsg(msg, type = 'info') {
  ({ success: ok, error: err, warn, info }[type] || info)(msg)
}

function typeLabel(t) {
  return { entry: '进站', exit: '出站', shunting: '调车' }[t] || t
}

function setAspect(id, aspect) {
  const res = interlocking.manualSetSignal(id, aspect)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function toggleDefective(id, defective) {
  const res = interlocking.setSignalDefective(id, defective)
  showMsg(res.message, defective ? 'error' : 'success')
}
</script>

<style scoped>
.signal-panel { display: flex; flex-direction: column; gap: 10px; }
.panel-row { display: flex; gap: 10px; flex-wrap: wrap; }

.signal-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  min-width: 180px;
  flex: 1;
  max-width: 220px;
}

.sig-lamp-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.sig-lamp {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #30363d;
}
.lamp-green  { background: var(--signal-green);  box-shadow: 0 0 12px var(--signal-green);  border-color: var(--signal-green); }
.lamp-yellow { background: var(--signal-yellow); box-shadow: 0 0 12px var(--signal-yellow); border-color: var(--signal-yellow); }
.lamp-red    { background: var(--signal-red);    box-shadow: 0 0 8px var(--signal-red);     border-color: var(--signal-red); }
.lamp-off    { background: #2a2a2a; border-color: #484f58; }

.sig-id-col { display: flex; flex-direction: column; }
.sig-id   { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
.sig-name { font-size: 10px; color: var(--text-muted); }
.sig-type { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-top: 2px; width: fit-content; }
.type-entry    { background: rgba(88,166,255,0.2); color: var(--accent-blue); }
.type-exit     { background: rgba(57,211,83,0.2);  color: var(--track-free); }
.type-shunting { background: rgba(255,204,0,0.2);  color: var(--signal-yellow); }

.open-hint {
  font-size: 10px;
  color: var(--track-locked);
  margin-bottom: 5px;
}
.defective-banner {
  background: rgba(255,71,87,0.15);
  border: 1px solid var(--track-occupied);
  border-radius: 3px;
  color: var(--track-occupied);
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  margin-bottom: 8px;
  animation: blink-border 1.5s infinite;
}
@keyframes blink-border { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.sig-section { margin-bottom: 8px; }
.section-title { font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }

.aspect-btns { display: flex; gap: 4px; }
.asp-btn {
  flex: 1;
  padding: 5px 4px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.asp-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.asp-btn.green  { border-color: var(--signal-green);  color: var(--signal-green);  background: rgba(0,255,136,0.08); }
.asp-btn.yellow { border-color: var(--signal-yellow); color: var(--signal-yellow); background: rgba(255,204,0,0.08); }
.asp-btn.red    { border-color: var(--signal-red);    color: var(--signal-red);    background: rgba(255,68,68,0.08); }
.asp-btn.green:not(:disabled):hover  { background: rgba(0,255,136,0.2); }
.asp-btn.yellow:not(:disabled):hover { background: rgba(255,204,0,0.2); }
.asp-btn.red:not(:disabled):hover    { background: rgba(255,68,68,0.2); }

.btn { padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.w-full { width: 100%; }
.btn-red { background: rgba(255,71,87,0.15); border: 1px solid var(--track-occupied); color: var(--track-occupied); }
.btn-outline-red { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline-red:hover { border-color: var(--track-occupied); color: var(--track-occupied); }

.message-toast { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.toast-success { background: rgba(57,211,83,0.15);  color: var(--track-free);     border: 1px solid var(--track-free); }
.toast-error   { background: rgba(255,71,87,0.15);  color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.toast-warn    { background: rgba(255,149,0,0.15);  color: var(--track-locked);   border: 1px solid var(--track-locked); }
.toast-info    { background: rgba(88,166,255,0.15); color: var(--accent-blue);    border: 1px solid var(--accent-blue); }
</style>
