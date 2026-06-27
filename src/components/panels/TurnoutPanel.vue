<template>
  <div class="turnout-panel">
    <div class="panel-row">
      <div v-for="(t, id) in ts.turnouts" :key="id" class="turnout-card">
        <!-- 标题行 -->
        <div class="tc-header">
          <span class="tc-name">{{ t.name }}</span>
          <div class="tc-badges">
            <span v-if="t.defective" class="badge-chip chip-red">故障</span>
            <span v-if="t.blocked"   class="badge-chip chip-gray">封锁</span>
            <span v-if="t.locked"    class="badge-chip chip-blue">进路锁</span>
            <span v-if="t.singleLocked" class="badge-chip chip-purple">单锁</span>
          </div>
        </div>

        <!-- 位置显示 -->
        <div class="tc-position">
          <div class="pos-indicator" :class="t.position === 'normal' ? 'pos-normal' : 'pos-reverse'">
            <span class="pos-dot"></span>
            <span class="pos-label">{{ t.position === 'normal' ? '定位' : '反位' }}</span>
          </div>
          <div class="pos-arrow">{{ t.position === 'normal' ? '→ 1G' : '→ 3G/SFG' }}</div>
        </div>

        <!-- 单操按钮 -->
        <div class="tc-section">
          <div class="section-title">单独操作</div>
          <div class="btn-row">
            <button class="btn btn-outline" :class="{ active: t.position === 'normal' }"
              :disabled="!canOperate(id)" @click="operate(id, 'normal')">
              定位
            </button>
            <button class="btn btn-outline-warn" :class="{ active: t.position === 'reverse' }"
              :disabled="!canOperate(id)" @click="operate(id, 'reverse')">
              反位
            </button>
          </div>
        </div>

        <!-- 单锁 / 封锁 -->
        <div class="tc-section">
          <div class="section-title">锁定操作</div>
          <div class="btn-row">
            <button v-if="!t.singleLocked" class="btn btn-outline-purple"
              :disabled="t.locked || t.blocked" @click="singleLock(id)">
              单锁
            </button>
            <button v-else class="btn btn-purple" @click="singleUnlock(id)">
              解单锁
            </button>
            <button v-if="!t.blocked" class="btn btn-outline-red"
              :disabled="t.locked" @click="block(id)">
              封锁
            </button>
            <button v-else class="btn btn-red" @click="unblock(id)">
              解封锁
            </button>
          </div>
        </div>

        <!-- 故障仿真 -->
        <div class="tc-section">
          <div class="section-title">故障仿真</div>
          <button class="btn w-full" :class="t.defective ? 'btn-red' : 'btn-outline-red'"
            @click="toggleDefective(id, !t.defective)">
            {{ t.defective ? '● 故障中（点击恢复）' : '模拟故障' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 消息 -->
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

function canOperate(id) {
  const t = ts.value.turnouts[id]
  return t && !t.locked && !t.singleLocked && !t.blocked && !t.defective
}

function operate(id, pos) {
  const res = interlocking.operateTurnout(id, pos)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function singleLock(id) {
  const res = interlocking.singleLockTurnout(id)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function singleUnlock(id) {
  const res = interlocking.unlockSingleLock(id)
  showMsg(res.message, res.success ? 'info' : 'error')
}
function block(id) {
  const res = interlocking.blockTurnout(id)
  showMsg(res.message, res.success ? 'warn' : 'error')
}
function unblock(id) {
  const res = interlocking.unblockTurnout(id)
  showMsg(res.message, res.success ? 'info' : 'error')
}
function toggleDefective(id, defective) {
  const res = interlocking.setTurnoutDefective(id, defective)
  showMsg(res.message, defective ? 'error' : 'success')
}
</script>

<style scoped>
.turnout-panel { display: flex; flex-direction: column; gap: 10px; }
.panel-row { display: flex; gap: 12px; flex-wrap: wrap; }

.turnout-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  min-width: 220px;
  flex: 1;
  max-width: 300px;
}

.tc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.tc-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.tc-badges { display: flex; gap: 4px; flex-wrap: wrap; }
.badge-chip { font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
.chip-red    { background: rgba(255,71,87,0.2);    color: var(--track-occupied); }
.chip-gray   { background: rgba(72,79,88,0.4);     color: var(--track-blocked); }
.chip-blue   { background: rgba(88,166,255,0.2);   color: var(--accent-blue); }
.chip-purple { background: rgba(188,140,255,0.2);  color: var(--accent-purple); }

.tc-position {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--bg-panel);
  border-radius: 4px;
  margin-bottom: 10px;
}
.pos-indicator { display: flex; align-items: center; gap: 6px; }
.pos-dot { width: 10px; height: 10px; border-radius: 50%; }
.pos-label { font-size: 13px; font-weight: 700; }
.pos-normal .pos-dot  { background: var(--turnout-normal);  box-shadow: 0 0 6px var(--turnout-normal); }
.pos-normal .pos-label { color: var(--turnout-normal); }
.pos-reverse .pos-dot  { background: var(--turnout-reverse); box-shadow: 0 0 6px var(--turnout-reverse); }
.pos-reverse .pos-label { color: var(--turnout-reverse); }
.pos-arrow { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }

.tc-section { margin-bottom: 8px; }
.section-title { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }

.btn-row { display: flex; gap: 6px; }
.btn {
  flex: 1;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  text-align: center;
}
.btn:disabled { opacity: 0.3; cursor: not-allowed; }
.w-full { width: 100%; flex: unset; }

.btn-outline        { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline:not(:disabled):hover { border-color: var(--track-free); color: var(--track-free); }
.btn-outline.active { border-color: var(--track-free); color: var(--track-free); background: rgba(57,211,83,0.1); }

.btn-outline-warn        { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline-warn:not(:disabled):hover { border-color: var(--track-locked); color: var(--track-locked); }
.btn-outline-warn.active { border-color: var(--track-locked); color: var(--track-locked); background: rgba(255,149,0,0.1); }

.btn-outline-purple { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline-purple:not(:disabled):hover { border-color: var(--accent-purple); color: var(--accent-purple); }
.btn-purple { background: rgba(188,140,255,0.15); border: 1px solid var(--accent-purple); color: var(--accent-purple); }

.btn-outline-red { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-outline-red:not(:disabled):hover { border-color: var(--track-occupied); color: var(--track-occupied); }
.btn-red { background: rgba(255,71,87,0.15); border: 1px solid var(--track-occupied); color: var(--track-occupied); }

.message-toast { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.toast-success { background: rgba(57,211,83,0.15);  color: var(--track-free);     border: 1px solid var(--track-free); }
.toast-error   { background: rgba(255,71,87,0.15);  color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.toast-warn    { background: rgba(255,149,0,0.15);  color: var(--track-locked);   border: 1px solid var(--track-locked); }
.toast-info    { background: rgba(88,166,255,0.15); color: var(--accent-blue);    border: 1px solid var(--accent-blue); }
</style>
