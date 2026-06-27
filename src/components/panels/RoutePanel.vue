<template>
  <div class="route-panel">
    <div class="panel-row">
      <!-- 左：进路选排 -->
      <div class="panel-card flex-1">
        <div class="card-title">进路办理</div>
        <div class="route-list">
          <div
            v-for="rt in railway.routeTemplates"
            :key="rt.id"
            class="route-item"
            :class="{ selected: selectedRouteId === rt.id, active: isActive(rt.id) }"
            @click="selectRoute(rt.id)"
          >
            <div class="route-info">
              <span class="route-name">{{ rt.name }}</span>
              <span class="route-type" :class="`type-${rt.type}`">{{ typeLabel(rt.type) }}</span>
            </div>
            <div class="route-detail">
              <span class="route-path">{{ rt.path.join(' → ') }}</span>
              <span class="route-turnouts">道岔: {{ rt.turnouts.map(t => `${t.id}#${t.position === 'normal' ? '定' : '反'}`).join(', ') }}</span>
            </div>
            <div v-if="isActive(rt.id)" class="route-status-chip">
              <span :class="`status-${getActive(rt.id).status}`">● {{ statusLabel(getActive(rt.id).status) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <button class="btn btn-primary" :disabled="!selectedRouteId || isActive(selectedRouteId)" @click="doEstablish">
            锁闭进路
          </button>
          <button class="btn btn-success" :disabled="!canOpen" @click="doOpen">
            开放信号
          </button>
          <button class="btn btn-warn" :disabled="!canUnlock" @click="doUnlock">
            正常解锁
          </button>
          <button class="btn btn-danger" :disabled="!isActive(selectedRouteId)" @click="startCancel">
            取消进路
          </button>
        </div>

        <!-- 取消倒计时 -->
        <div v-if="cancelCountdown > 0" class="countdown-bar">
          <div class="countdown-text">
            取消进路倒计时：{{ cancelCountdown }}s &nbsp;
            <button class="btn-sm btn-danger" @click="doForceUnlock">立即解锁（人工）</button>
          </div>
          <div class="countdown-progress">
            <div class="countdown-fill" :style="{ width: `${(cancelCountdown / 30) * 100}%` }"></div>
          </div>
        </div>
      </div>

      <!-- 右：活动进路列表 -->
      <div class="panel-card" style="min-width:320px">
        <div class="card-title">活动进路 <span class="badge-count">{{ railway.activeRoutes.length }}</span></div>
        <div v-if="railway.activeRoutes.length === 0" class="empty-tip">暂无活动进路</div>
        <div v-for="ar in railway.activeRoutes" :key="ar.id" class="active-route-card">
          <div class="ar-header">
            <span class="ar-name">{{ ar.name }}</span>
            <span :class="`ar-status status-${ar.status}`">{{ statusLabel(ar.status) }}</span>
          </div>
          <div class="ar-meta">
            <span>区段: {{ ar.path.join('→') }}</span>
            <span>建立: {{ formatTime(ar.establishedAt) }}</span>
          </div>
          <div class="ar-meta">
            <span>信号: {{ ar.entrySignal }}</span>
            <span>道岔: {{ ar.turnouts.map(t => `${t.id}#${t.position === 'normal' ? '定' : '反'}`).join(',') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="message-toast" :class="`toast-${messageType}`">
      {{ message }}
    </div>

    <!-- 列车作业办理 -->
    <div class="panel-row">
      <!-- 列车作业（接车/发车/通过） -->
      <div class="panel-card flex-1">
        <div class="card-title">列车作业办理</div>
        <div class="form-inline">
          <input class="form-input" v-model="trainOpNumber" placeholder="列车车次" maxlength="8"/>
          <div class="seg-ctrl">
            <button
              v-for="t in trainOpTypes" :key="t.value"
              class="seg-btn"
              :class="{ active: trainOpType === t.value }"
              @click="trainOpType = t.value"
            >{{ t.label }}</button>
          </div>
          <button class="btn btn-primary" :disabled="!trainOpNumber.trim()" @click="doTrainOp">办理</button>
        </div>
      </div>

      <!-- 调车作业表单 -->
      <div class="panel-card flex-1">
        <div class="card-title">调车作业办理</div>
        <div class="form-inline">
          <input class="form-input" v-model="shuntNumber" placeholder="调车号" maxlength="8"/>
          <select class="form-select" v-model="shuntFrom">
            <option value="" disabled>起始区段</option>
            <option v-for="(s, id) in railway.stationLayout.trackSections" :key="id" :value="id">{{ id }}</option>
          </select>
          <span class="arrow-label">→</span>
          <select class="form-select" v-model="shuntTo">
            <option value="" disabled>目标区段</option>
            <option v-for="(s, id) in railway.stationLayout.trackSections" :key="id" :value="id">{{ id }}</option>
          </select>
          <button class="btn btn-success" :disabled="!shuntNumber.trim() || !shuntFrom || !shuntTo || shuntFrom === shuntTo" @click="doShuntOp">办理</button>
        </div>
      </div>
    </div>
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

const selectedRouteId = ref(null)
const message = ref('')
const messageType = ref('info')
const cancelCountdown = ref(0)
let cancelTimer = null

// 统一改走全局消息条
function showMsg(msg, type = 'info') {
  ({ success: ok, error: err, warn, info }[type] || info)(msg)
}

function selectRoute(id) {
  if (isActive(id)) {
    selectedRouteId.value = id
    return
  }
  selectedRouteId.value = selectedRouteId.value === id ? null : id
}

function isActive(id) {
  return railway.activeRoutes.some(r => r.id === id)
}
function getActive(id) {
  return railway.activeRoutes.find(r => r.id === id)
}

const canOpen = computed(() => {
  if (!selectedRouteId.value) return false
  const ar = getActive(selectedRouteId.value)
  return ar && ar.status === 'locked'
})
const canUnlock = computed(() => {
  if (!selectedRouteId.value) return false
  const ar = getActive(selectedRouteId.value)
  return ar && (ar.status === 'locked' || ar.status === 'opened' || ar.status === 'occupied')
})

function doEstablish() {
  const res = interlocking.establishRoute(selectedRouteId.value)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function doOpen() {
  const res = interlocking.openRoute(selectedRouteId.value)
  showMsg(res.message, res.success ? 'success' : 'error')
}
function doUnlock() {
  const res = interlocking.unlockRoute(selectedRouteId.value)
  showMsg(res.message, res.success ? 'success' : 'error')
  if (res.success) selectedRouteId.value = null
}

function startCancel() {
  if (!selectedRouteId.value || !isActive(selectedRouteId.value)) return
  cancelCountdown.value = 30
  clearInterval(cancelTimer)
  cancelTimer = setInterval(() => {
    cancelCountdown.value--
    if (cancelCountdown.value <= 0) {
      clearInterval(cancelTimer)
      const res = interlocking.cancelRoute(selectedRouteId.value, false)
      if (res.needForce) {
        showMsg('区段有车，已转为人工解锁模式', 'warn')
        cancelCountdown.value = 0
      } else {
        showMsg(res.message, res.success ? 'success' : 'error')
        if (res.success) selectedRouteId.value = null
        cancelCountdown.value = 0
      }
    }
  }, 1000)
}

function doForceUnlock() {
  clearInterval(cancelTimer)
  cancelCountdown.value = 0
  const res = interlocking.cancelRoute(selectedRouteId.value, true)
  showMsg(res.message, res.success ? 'success' : 'error')
  if (res.success) selectedRouteId.value = null
}

function typeLabel(t) {
  return { reception: '接车', departure: '发车', shunting: '调车', pass: '通过' }[t] || t
}
function statusLabel(s) {
  return { locked: '锁闭', opened: '开放', occupied: '占用' }[s] || s
}
function formatTime(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
}

// ── 列车作业办理 ──────────────────────────────────────────────
const trainOpNumber = ref('')
const trainOpType   = ref('reception')
const trainOpTypes  = [
  { value: 'reception', label: '接车' },
  { value: 'departure', label: '发车' },
  { value: 'pass',      label: '通过' }
]

function doTrainOp() {
  const typeText = trainOpTypes.find(t => t.value === trainOpType.value)?.label || trainOpType.value
  railway.addLog('列车作业', `办理 ${trainOpNumber.value} 次列车${typeText}作业`, 'success')
  showMsg(`${trainOpNumber.value} 次列车${typeText}作业办理完成`, 'success')
  trainOpNumber.value = ''
}

// ── 调车作业办理 ──────────────────────────────────────────────
const shuntNumber = ref('')
const shuntFrom   = ref('')
const shuntTo     = ref('')

function doShuntOp() {
  railway.addLog('调车作业', `调车 ${shuntNumber.value} 从 ${shuntFrom.value} → ${shuntTo.value}`, 'info')
  showMsg(`调车 ${shuntNumber.value} 作业（${shuntFrom.value}→${shuntTo.value}）办理完成`, 'success')
  shuntNumber.value = ''; shuntFrom.value = ''; shuntTo.value = ''
}
</script>

<style scoped>
.route-panel { display: flex; flex-direction: column; gap: 12px; }
.panel-row { display: flex; gap: 12px; align-items: flex-start; }
.flex-1 { flex: 1; }

.panel-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
}
.card-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge-count {
  background: var(--bg-panel);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
}

.route-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }

.route-item {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-panel);
}
.route-item:hover { border-color: var(--accent-green); background: var(--bg-hover); }
.route-item.selected { border-color: var(--accent-green); background: rgba(57,211,83,0.08); }
.route-item.active { border-color: var(--track-locked); }

.route-info { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.route-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.route-type { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 600; }
.type-reception { background: rgba(88,166,255,0.2); color: var(--accent-blue); }
.type-departure  { background: rgba(57,211,83,0.2);  color: var(--track-free); }
.type-shunting   { background: rgba(255,204,0,0.2);   color: var(--signal-yellow); }

.route-detail { display: flex; gap: 12px; }
.route-path, .route-turnouts { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }

.route-status-chip { margin-top: 4px; font-size: 10px; }
.status-locked   { color: var(--track-locked); }
.status-opened   { color: var(--track-free); }
.status-occupied { color: var(--track-occupied); }

.action-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-primary { background: #1a3e5c; color: var(--accent-blue); border: 1px solid var(--accent-blue); }
.btn-primary:not(:disabled):hover { background: #1e4a6e; }
.btn-success { background: #1a3a1e; color: var(--track-free); border: 1px solid var(--track-free); }
.btn-success:not(:disabled):hover { background: #1f4424; }
.btn-warn    { background: #3a2a00; color: var(--track-locked); border: 1px solid var(--track-locked); }
.btn-warn:not(:disabled):hover { background: #442f00; }
.btn-danger  { background: #3a1a1a; color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.btn-danger:not(:disabled):hover { background: #451f1f; }

.countdown-bar { margin-top: 10px; }
.countdown-text { font-size: 12px; color: var(--track-occupied); margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
.countdown-progress { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.countdown-fill { height: 100%; background: var(--track-occupied); transition: width 1s linear; }
.btn-sm { padding: 2px 8px; border: none; border-radius: 3px; font-size: 11px; cursor: pointer; background: var(--track-occupied); color: #fff; }

/* 活动进路 */
.empty-tip { font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0; }
.active-route-card { padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 6px; background: var(--bg-panel); }
.ar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ar-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.ar-status { font-size: 10px; font-weight: 700; }
.ar-meta { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); display: flex; gap: 12px; }

/* 通过作业 + 调车作业表单 */
.form-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.form-input {
  padding: 5px 9px; background: var(--bg-panel);
  border: 1px solid var(--border); border-radius: 4px;
  color: var(--text-primary); font-size: 12px; outline: none; width: 90px;
}
.form-input:focus { border-color: var(--accent-blue); }
.form-select {
  padding: 5px 8px; background: var(--bg-panel);
  border: 1px solid var(--border); border-radius: 4px;
  color: var(--text-primary); font-size: 12px; outline: none;
}
.form-select:focus { border-color: var(--accent-blue); }
.seg-ctrl { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.seg-btn {
  padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
  border: none; background: var(--bg-panel); color: var(--text-secondary);
  border-right: 1px solid var(--border);
}
.seg-btn:last-child { border-right: none; }
.seg-btn:hover { background: var(--bg-hover); }
.seg-btn.active { background: var(--accent-blue); color: #fff; }
.arrow-label { font-size: 14px; color: var(--text-muted); }
.type-pass { background: rgba(130,80,223,.15); color: var(--accent-purple); }
.message-toast {
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}
.toast-success { background: rgba(57,211,83,0.15); color: var(--track-free); border: 1px solid var(--track-free); }
.toast-error   { background: rgba(255,71,87,0.15);  color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.toast-warn    { background: rgba(255,149,0,0.15);  color: var(--track-locked); border: 1px solid var(--track-locked); }
.toast-info    { background: rgba(88,166,255,0.15); color: var(--accent-blue);  border: 1px solid var(--accent-blue); }
</style>
