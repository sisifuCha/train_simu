<template>
  <!-- 道岔弹窗 -->
  <div v-if="type === 'turnout' && device" class="device-popup" :style="popupStyle">
    <div class="popup-header">
      <span class="popup-title">{{ device.name }}</span>
      <span class="popup-status-dot" :class="turnoutStatusClass"></span>
      <button class="popup-close" @click="$emit('close')">✕</button>
    </div>
    <div class="popup-body">
      <div class="status-row">
        <span class="status-label">当前位置</span>
        <span class="status-val" :class="device.position === 'normal' ? 'val-green' : 'val-orange'">
          {{ device.position === 'normal' ? '定位 ▶' : '反位 ◀' }}
        </span>
      </div>
      <div class="status-row" v-if="device.locked || device.singleLocked || device.blocked || device.defective">
        <span class="status-label">锁定状态</span>
        <div class="tag-row">
          <span v-if="device.locked"       class="tag tag-blue">进路锁</span>
          <span v-if="device.singleLocked" class="tag tag-purple">单锁</span>
          <span v-if="device.blocked"      class="tag tag-gray">封锁</span>
          <span v-if="device.defective"    class="tag tag-red">故障</span>
        </div>
      </div>
      <div class="btn-grid">
        <button class="pb pb-green"
          :disabled="!canOperateTurnout || device.position === 'normal'"
          @click="operate('normal')">定位</button>
        <button class="pb pb-orange"
          :disabled="!canOperateTurnout || device.position === 'reverse'"
          @click="operate('reverse')">反位</button>
        <button class="pb pb-purple" v-if="!device.singleLocked"
          :disabled="device.locked || device.blocked"
          @click="singleLock">单锁</button>
        <button class="pb pb-purple-out" v-else @click="singleUnlock">解单锁</button>
        <button class="pb pb-red-out" v-if="!device.blocked"
          :disabled="device.locked"
          @click="block">封锁</button>
        <button class="pb pb-red" v-else @click="unblock">解封锁</button>
        <button class="pb pb-fault" :class="device.defective ? 'active-fault' : ''"
          @click="toggleDefective">{{ device.defective ? '恢复正常' : '模拟故障' }}</button>
      </div>
      <div v-if="msg" class="popup-msg" :class="`msg-${msgType}`">{{ msg }}</div>
    </div>
  </div>

  <!-- 信号机弹窗 -->
  <div v-else-if="type === 'signal' && device" class="device-popup" :style="popupStyle">
    <div class="popup-header">
      <span class="popup-title">{{ device.name }}</span>
      <div class="sig-lamp" :class="`lamp-${device.defective ? 'off' : device.aspect}`"></div>
      <button class="popup-close" @click="$emit('close')">✕</button>
    </div>
    <div class="popup-body">
      <div class="status-row">
        <span class="status-label">当前显示</span>
        <span class="status-val" :class="sigValClass">{{ sigAspectText }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">类型</span>
        <span class="tag" :class="sigTypeTagClass">{{ sigTypeText }}</span>
      </div>
      <div v-if="device.defective" class="defect-warn">⚠ 断丝故障 — 强制红灯</div>
      <div v-else-if="device.automated" class="defect-warn warn-hint">本信号由进路自动控制，请办理进路开放</div>
      <div class="btn-grid">
        <button class="pb pb-green" :disabled="device.defective || device.automated || device.aspect === 'green'"
          @click="setAspect('green')">绿灯</button>
        <button class="pb pb-yellow" :disabled="device.defective || device.automated || device.aspect === 'yellow'"
          @click="setAspect('yellow')">黄灯</button>
        <button class="pb pb-red-out" :disabled="device.defective || device.automated || device.aspect === 'red'"
          @click="setAspect('red')">红灯</button>
        <button class="pb pb-fault" :class="device.defective ? 'active-fault' : ''"
          @click="toggleSigDefective">{{ device.defective ? '恢复正常' : '模拟断丝' }}</button>
      </div>
      <div v-if="msg" class="popup-msg" :class="`msg-${msgType}`">{{ msg }}</div>
    </div>
  </div>

  <!-- 区段弹窗 -->
  <div v-else-if="type === 'section' && device" class="device-popup" :style="popupStyle">
    <div class="popup-header">
      <span class="popup-title">{{ device.name }}</span>
      <span class="popup-status-dot" :class="sectionStatusClass"></span>
      <button class="popup-close" @click="$emit('close')">✕</button>
    </div>
    <div class="popup-body">
      <div class="status-row">
        <span class="status-label">区段状态</span>
        <div class="tag-row">
          <span v-if="device.occupied" class="tag tag-red">占用</span>
          <span v-else-if="device.locked" class="tag tag-orange">锁闭</span>
          <span v-else-if="device.blocked" class="tag tag-gray">封锁</span>
          <span v-else class="tag tag-green">空闲</span>
        </div>
      </div>
      <div class="hint-text">点击「添加列车」面板可在此区段放置列车</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInterlockingStore } from '@/stores/interlocking.js'
import { useNotify } from '@/composables/useNotify.js'

const props = defineProps({
  type:    { type: String, default: null },  // 'turnout' | 'signal' | 'section'
  device:  { type: Object, default: null },
  pos:     { type: Object, default: () => ({ x: 0, y: 0 }) }
})
defineEmits(['close'])

const interlocking = useInterlockingStore()
const { message } = useNotify()
const msg     = ref('')   // 保留以兼容模板（已不再使用）
const msgType = ref('info')

// 统一改走全局消息条
function showMsg(m, t = 'info') {
  const fn = { success: 'success', error: 'error', warn: 'warning', info: 'info' }[t] || 'info'
  message[fn](m)
}

// popup 位置（视口坐标 → clamp 到屏幕内）
const popupStyle = computed(() => {
  const x = Math.min(props.pos.x + 10, window.innerWidth  - 260)
  const y = Math.min(props.pos.y + 10, window.innerHeight - 300)
  return { left: `${x}px`, top: `${y}px` }
})

// ── 道岔相关 ──────────────────────────────────────────────────
const canOperateTurnout = computed(() => {
  const t = props.device
  return t && !t.locked && !t.singleLocked && !t.blocked && !t.defective
})
const turnoutStatusClass = computed(() => {
  const t = props.device
  if (!t) return ''
  if (t.defective || t.blocked) return 'dot-red'
  if (t.locked)       return 'dot-blue'
  if (t.singleLocked) return 'dot-purple'
  return t.position === 'normal' ? 'dot-green' : 'dot-orange'
})

function operate(pos) {
  const res = interlocking.operateTurnout(props.device.id, pos)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function singleLock()   { const r = interlocking.singleLockTurnout(props.device.id);  showMsg(r.message, r.success ? 'success' : 'error') }
function singleUnlock() { const r = interlocking.unlockSingleLock(props.device.id);  showMsg(r.message, r.success ? 'info' : 'error') }
function block()        { const r = interlocking.blockTurnout(props.device.id);       showMsg(r.message, r.success ? 'warn' : 'error') }
function unblock()      { const r = interlocking.unblockTurnout(props.device.id);     showMsg(r.message, r.success ? 'info' : 'error') }
function toggleDefective() {
  const r = interlocking.setTurnoutDefective(props.device.id, !props.device.defective)
  showMsg(r.message, props.device.defective ? 'success' : 'error')
}

// ── 信号机相关 ────────────────────────────────────────────────
const sigAspectText = computed(() => {
  const a = props.device?.aspect
  return { green: '● 绿灯', yellow: '● 黄灯', red: '● 红灯' }[a] || '--'
})
const sigValClass = computed(() => {
  return { green: 'val-green', yellow: 'val-yellow', red: 'val-red' }[props.device?.aspect] || ''
})
const sigTypeText = computed(() => ({ entry: '进站', exit: '出站', shunting: '调车' }[props.device?.type] || '--'))
const sigTypeTagClass = computed(() => ({ entry: 'tag-blue', exit: 'tag-green', shunting: 'tag-yellow' }[props.device?.type] || ''))

function setAspect(a) {
  const r = interlocking.manualSetSignal(props.device.id, a)
  showMsg(r.message, r.success ? 'success' : 'error')
}
function toggleSigDefective() {
  const r = interlocking.setSignalDefective(props.device.id, !props.device.defective)
  showMsg(r.message, props.device.defective ? 'success' : 'error')
}

// ── 区段相关 ──────────────────────────────────────────────────
const sectionStatusClass = computed(() => {
  const s = props.device
  if (!s) return ''
  if (s.occupied) return 'dot-red'
  if (s.locked)   return 'dot-orange'
  if (s.blocked)  return 'dot-gray'
  return 'dot-green'
})
</script>

<style scoped>
.device-popup {
  position: fixed;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  width: 240px;
  box-shadow: 0 8px 24px rgba(140,149,159,0.3), 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
  animation: pop-in 0.12s ease-out;
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.92) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #d0d7de;
}
.popup-title { flex: 1; font-size: 13px; font-weight: 700; color: #24292f; }
.popup-close {
  width: 20px; height: 20px;
  background: transparent;
  border: none;
  color: #57606a;
  cursor: pointer;
  font-size: 12px;
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
}
.popup-close:hover { background: #ffd8d3; color: #cf222e; }

.popup-status-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-green  { background: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
.dot-orange { background: #e67e22; box-shadow: 0 0 6px #e67e22; }
.dot-red    { background: #e74c3c; box-shadow: 0 0 6px #e74c3c; }
.dot-blue   { background: #3498db; box-shadow: 0 0 6px #3498db; }
.dot-purple { background: #9b59b6; box-shadow: 0 0 6px #9b59b6; }
.dot-gray   { background: #555; }

.sig-lamp {
  width: 16px; height: 16px; border-radius: 50%;
  flex-shrink: 0;
}
.lamp-green  { background: #00ff7f; box-shadow: 0 0 8px #00ff7f; }
.lamp-yellow { background: #ffcc00; box-shadow: 0 0 8px #ffcc00; }
.lamp-red    { background: #ff3333; box-shadow: 0 0 6px #ff3333; }
.lamp-off    { background: #2a2a2a; border: 1px solid #444; }

.popup-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }

.status-row { display: flex; align-items: center; justify-content: space-between; }
.status-label { font-size: 11px; color: #57606a; }
.status-val { font-size: 12px; font-weight: 700; font-family: 'Courier New', monospace; }
.val-green  { color: #2ecc71; }
.val-orange { color: #e67e22; }
.val-yellow { color: #ffcc00; }
.val-red    { color: #e74c3c; }

.tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
.tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 700; }
.tag-blue   { background: rgba(52,152,219,0.2);  color: #3498db; }
.tag-purple { background: rgba(155,89,182,0.2);  color: #9b59b6; }
.tag-gray   { background: rgba(85,85,85,0.3);    color: #888; }
.tag-red    { background: rgba(231,76,60,0.2);   color: #e74c3c; }
.tag-orange { background: rgba(230,126,34,0.2);  color: #e67e22; }
.tag-green  { background: rgba(46,204,113,0.2);  color: #2ecc71; }
.tag-yellow { background: rgba(255,204,0,0.2);   color: #ffcc00; }

.btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.pb {
  padding: 5px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.12s;
  text-align: center;
}
.pb:disabled { opacity: 0.3; cursor: not-allowed; }
.pb-green     { border-color: #2ecc71; color: #2ecc71; background: rgba(46,204,113,0.1); }
.pb-green:not(:disabled):hover  { background: rgba(46,204,113,0.22); }
.pb-orange    { border-color: #e67e22; color: #e67e22; background: rgba(230,126,34,0.1); }
.pb-orange:not(:disabled):hover { background: rgba(230,126,34,0.22); }
.pb-yellow    { border-color: #ffcc00; color: #ffcc00; background: rgba(255,204,0,0.1); }
.pb-yellow:not(:disabled):hover { background: rgba(255,204,0,0.22); }
.pb-purple    { border-color: #9b59b6; color: #9b59b6; background: rgba(155,89,182,0.15); }
.pb-purple:not(:disabled):hover { background: rgba(155,89,182,0.28); }
.pb-purple-out{ border-color: #9b59b6; color: #c39bd3; background: rgba(155,89,182,0.08); }
.pb-red-out   { border-color: #e74c3c; color: #e74c3c; background: rgba(231,76,60,0.08); }
.pb-red-out:not(:disabled):hover { background: rgba(231,76,60,0.2); }
.pb-red       { border-color: #e74c3c; color: #fff;    background: rgba(231,76,60,0.3); }
.pb-fault     { border-color: #555; color: #888; background: transparent; grid-column: 1 / -1; }
.pb-fault:hover { border-color: #e74c3c; color: #e74c3c; }
.active-fault { border-color: #e74c3c; color: #e74c3c; background: rgba(231,76,60,0.15); animation: blink-b 1.5s infinite; }
@keyframes blink-b { 0%,100% { opacity:1; } 50% { opacity:.6; } }

.defect-warn {
  font-size: 10px; color: #e74c3c;
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.3);
  border-radius: 3px;
  padding: 4px 8px;
}
.warn-hint {
  color: #b8860b;
  background: rgba(230,126,34,0.1);
  border-color: rgba(230,126,34,0.3);
}
.hint-text { font-size: 11px; color: #9ea7b0; }

.popup-msg {
  font-size: 11px; font-weight: 600;
  padding: 4px 8px; border-radius: 3px;
}
.msg-success { background: rgba(46,204,113,0.12); color: #2ecc71; }
.msg-error   { background: rgba(231,76,60,0.12);  color: #e74c3c; }
.msg-warn    { background: rgba(230,126,34,0.12); color: #e67e22; }
.msg-info    { background: rgba(52,152,219,0.12); color: #3498db; }
</style>
