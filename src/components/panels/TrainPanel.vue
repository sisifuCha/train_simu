<template>
  <div class="train-panel">
    <div class="panel-row">
      <!-- 左列：添加列车 + 自动运行 -->
      <div class="left-col">
        <!-- 添加列车 -->
        <div class="panel-card">
          <div class="card-title">添加列车</div>
          <div class="form-group">
            <label class="form-label">车次号</label>
            <input class="form-input" v-model="newNumber" placeholder="K1234 / T56 ..." maxlength="8"/>
          </div>
          <div class="form-group">
            <label class="form-label">初始区段</label>
            <div class="section-select">
              <div
                v-for="(sec, id) in ts.trackSections" :key="id"
                class="section-option"
                :class="{ selected: selectedSection === id, occupied: sec.occupied }"
                @click="!sec.occupied && (selectedSection = id)"
              >
                <span class="so-id">{{ id }}</span>
                <span class="so-name">{{ sec.name }}</span>
                <span v-if="sec.occupied" class="so-status occ">占用</span>
                <span v-else-if="sec.locked" class="so-status lck">锁闭</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">运行方向</label>
            <div class="dir-btns">
              <button class="dir-btn" :class="{ active: newDirection === 'forward' }" @click="newDirection = 'forward'">↑ 上行</button>
              <button class="dir-btn" :class="{ active: newDirection === 'backward' }" @click="newDirection = 'backward'">↓ 下行</button>
            </div>
          </div>
          <button class="btn btn-success w-full" :disabled="!selectedSection || !newNumber.trim()" @click="doAdd">
            ＋ 添加列车
          </button>
        </div>

        <!-- 自动运行控制 -->
        <div class="panel-card">
          <div class="card-title">自动运行</div>
          <div class="auto-run-row">
            <div class="interval-group">
              <label class="form-label">间隔（秒）</label>
              <input class="form-input num-input" type="number" v-model.number="autoInterval" :min="1" :max="30"/>
            </div>
            <button
              class="btn w-full"
              :class="autoRunning ? 'btn-danger' : 'btn-success'"
              :disabled="railway.trains.length === 0"
              @click="toggleAutoRun"
            >
              {{ autoRunning ? '⏹ 停止自动运行' : '▶ 启动自动运行' }}
            </button>
          </div>
          <div v-if="autoRunning" class="auto-status">
            <span class="pulse-dot"></span> 自动运行中，每 {{ autoInterval }}s 推进一步
          </div>
        </div>
      </div>

      <!-- 右列：在站列车 + 移动 -->
      <div class="panel-card flex-1">
        <div class="card-title">在站列车 <span class="badge-count">{{ railway.trains.length }}</span></div>
        <div v-if="railway.trains.length === 0" class="empty-tip">暂无列车在站</div>
        <div v-for="train in railway.trains" :key="train.id" class="train-card">
          <div class="tc-header">
            <div class="tc-info">
              <span class="tc-number">{{ train.number }}</span>
              <span class="tc-dir" :class="train.direction === 'forward' ? 'dir-up' : 'dir-dn'">
                {{ train.direction === 'forward' ? '↑上行' : '↓下行' }}
              </span>
              <span class="tc-section">{{ ts.trackSections[train.currentSection]?.name || train.currentSection }}</span>
              <span class="tc-speed">{{ train.speed }} km/h</span>
            </div>
            <button class="btn-icon btn-remove" @click="doRemove(train.id)">✕</button>
          </div>
          <!-- 移动到区段 -->
          <div class="move-row">
            <span class="move-label">移动至：</span>
            <div class="move-grid">
              <button
                v-for="(sec, id) in ts.trackSections" :key="id"
                class="move-btn"
                :class="{ current: train.currentSection === id, occupied: sec.occupied && train.currentSection !== id }"
                :disabled="train.currentSection === id || (sec.occupied && train.currentSection !== id)"
                @click="doMove(train.id, id)"
              >{{ id }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列车作业记录 -->
    <div class="panel-card">
      <div class="card-title">列车作业记录 <span class="badge-count">{{ trainOps.length }}</span></div>
      <div v-if="trainOps.length === 0" class="empty-tip">暂无作业记录</div>
      <div class="ops-table">
        <div class="ops-header">
          <span class="col-train">车次</span>
          <span class="col-op">作业</span>
          <span class="col-loc">位置</span>
          <span class="col-time">时间</span>
        </div>
        <div class="ops-body">
          <div v-for="op in trainOps.slice(0, 30)" :key="op.id" class="ops-row" :class="`op-${op.type}`">
            <span class="col-train">{{ op.trainNumber }}</span>
            <span class="col-op">{{ op.operation }}</span>
            <span class="col-loc">{{ op.location }}</span>
            <span class="col-time">{{ op.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" class="message-toast" :class="`toast-${messageType}`">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'
import { useInterlockingStore } from '@/stores/interlocking.js'
import { useNotify } from '@/composables/useNotify.js'

const railway = useRailwayStore()
const interlocking = useInterlockingStore()
const { ok, err, warn, info } = useNotify()
const ts = computed(() => railway.stationLayout)

const newNumber    = ref('')
const selectedSection = ref(null)
const newDirection = ref('forward')
const message      = ref('')
const messageType  = ref('info')
const autoRunning  = ref(false)
const autoInterval = ref(3)
const trainOps     = ref([])   // 列车作业记录

let autoTimer = null

// 统一改走全局消息条
function showMsg(msg, type = 'info') {
  ({ success: ok, error: err, warn, info }[type] || info)(msg)
}

function logOp(trainNumber, operation, location, type = 'info') {
  trainOps.value.unshift({
    id: Date.now(),
    trainNumber,
    operation,
    location,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    type
  })
  if (trainOps.value.length > 100) trainOps.value.splice(100)
}

function doAdd() {
  const res = interlocking.addTrain(newNumber.value.trim(), selectedSection.value, newDirection.value)
  showMsg(res.message, res.success ? 'success' : 'error')
  if (res.success) {
    logOp(newNumber.value.trim(), '入站', selectedSection.value, 'success')
    newNumber.value = ''; selectedSection.value = null
  }
}

function doMove(trainId, sectionId) {
  const train = railway.trains.find(t => t.id === trainId)
  const fromSection = train?.currentSection
  // 严格联锁：手动移动须沿已开放进路（enforce 默认 true）
  const res = interlocking.moveTrain(trainId, sectionId)
  showMsg(res.message, res.success ? 'success' : 'error')
  if (res.success) logOp(train?.number, '运行', `${fromSection}→${sectionId}`, 'info')
}

function doRemove(trainId) {
  const train = railway.trains.find(t => t.id === trainId)
  const res = interlocking.removeTrain(trainId)
  showMsg(res.message, res.success ? 'info' : 'error')
  if (res.success) logOp(train?.number, '出站', train?.currentSection, 'warn')
}

// 自动运行：每隔N秒把每辆列车随机推进一个空闲相邻区段
function toggleAutoRun() {
  if (autoRunning.value) {
    clearInterval(autoTimer); autoTimer = null
    autoRunning.value = false
    showMsg('自动运行已停止', 'info')
  } else {
    autoRunning.value = true
    autoTimer = setInterval(autoStep, autoInterval.value * 1000)
    showMsg('自动运行已启动', 'success')
  }
}

// 自动运行：每辆列车沿其所在的"已开放进路"path 一节一节顺序前进，遵守联锁
function autoStep() {
  railway.trains.forEach(train => {
    const from = train.currentSection
    // 找到包含当前区段、且已开放/占用中的进路
    const route = railway.activeRoutes.find(r =>
      ['opened', 'occupied'].includes(r.status) && r.path.includes(from)
    )
    if (!route) return  // 不在任何开放进路上 → 停（等你办进路）

    const idx = route.path.indexOf(from)
    if (idx === route.path.length - 1) return  // 已到进路终点 → 停

    const next = route.path[idx + 1]
    const nextSec = ts.value.trackSections[next]
    if (!nextSec || nextSec.occupied) return  // 下一节被占 → 停下等

    // enforce:true，遵守联锁（信号红/未接通会被拒，列车原地等）
    const res = interlocking.moveTrain(train.id, next)
    if (res.success) logOp(train.number, '自动运行', `${from}→${next}`, 'info')
  })
}

onUnmounted(() => { clearInterval(autoTimer) })
</script>

<style scoped>
.train-panel { display: flex; flex-direction: column; gap: 10px; }
.panel-row { display: flex; gap: 10px; align-items: flex-start; }
.left-col { display: flex; flex-direction: column; gap: 10px; min-width: 240px; }
.flex-1 { flex: 1; }

.panel-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
}
.card-title {
  font-size: 12px; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
}
.badge-count {
  background: var(--bg-panel); color: var(--text-primary);
  border-radius: 10px; padding: 1px 7px; font-size: 11px;
}

.form-group { margin-bottom: 8px; }
.form-label { display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 3px; }
.form-input {
  width: 100%; padding: 5px 9px;
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: 4px; color: var(--text-primary); font-size: 12px; outline: none;
}
.form-input:focus { border-color: var(--accent-green); }
.num-input { width: 70px; }

.section-select { display: flex; flex-direction: column; gap: 2px; max-height: 170px; overflow-y: auto; }
.section-option {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px; border: 1px solid var(--border);
  border-radius: 3px; cursor: pointer; background: var(--bg-panel); font-size: 11px;
}
.section-option:hover:not(.occupied) { border-color: var(--accent-green); }
.section-option.selected { border-color: var(--accent-green); background: var(--track-free-dim); }
.section-option.occupied { opacity: 0.4; cursor: not-allowed; }
.so-id   { font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); min-width: 38px; }
.so-name { flex: 1; color: var(--text-secondary); }
.so-status { font-size: 9px; font-weight: 700; }
.so-status.occ { color: var(--track-occupied); }
.so-status.lck { color: var(--track-locked); }

.dir-btns { display: flex; gap: 6px; }
.dir-btn {
  flex: 1; padding: 4px; border-radius: 4px; font-size: 11px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border); background: var(--bg-panel);
  color: var(--text-secondary);
}
.dir-btn.active { border-color: var(--accent-blue); color: var(--accent-blue); background: rgba(9,105,218,0.08); }

.auto-run-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 8px; }
.interval-group { display: flex; flex-direction: column; gap: 3px; }
.auto-status { font-size: 10px; color: var(--track-locked); display: flex; align-items: center; gap: 6px; }
.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--track-locked);
  animation: pulse 1.2s infinite;
}
@keyframes pulse { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:.4; transform: scale(.7); } }

.btn { padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; }
.btn:disabled { opacity: .3; cursor: not-allowed; }
.btn-success { background: var(--track-free-dim); border: 1px solid var(--track-free); color: var(--track-free); }
.btn-success:not(:disabled):hover { background: rgba(26,127,55,.2); }
.btn-danger  { background: var(--track-occupied-dim); border: 1px solid var(--track-occupied); color: var(--track-occupied); }
.btn-danger:not(:disabled):hover { background: rgba(207,34,46,.2); }
.w-full { width: 100%; }

.empty-tip { font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px 0; }

.train-card {
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: 4px; padding: 7px 9px; margin-bottom: 6px;
}
.tc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.tc-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tc-number { font-size: 13px; font-weight: 700; color: var(--track-occupied); font-family: var(--font-mono); }
.tc-dir { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; }
.dir-up { background: rgba(9,105,218,.1); color: var(--accent-blue); }
.dir-dn { background: rgba(130,80,223,.1); color: var(--accent-purple); }
.tc-section { font-size: 11px; color: var(--text-secondary); }
.tc-speed { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
.btn-icon { padding: 3px 7px; border-radius: 3px; font-size: 12px; cursor: pointer; border: none; }
.btn-remove { background: var(--track-occupied-dim); color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.btn-remove:hover { background: rgba(207,34,46,.25); }

.move-row { display: flex; align-items: flex-start; gap: 6px; }
.move-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; padding-top: 3px; }
.move-grid { display: flex; gap: 4px; flex-wrap: wrap; }
.move-btn {
  padding: 2px 6px; border-radius: 3px; font-size: 10px;
  font-family: var(--font-mono); font-weight: 600; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary);
}
.move-btn:not(:disabled):hover { border-color: var(--accent-blue); color: var(--accent-blue); }
.move-btn.current { border-color: var(--track-occupied); color: var(--track-occupied); background: var(--track-occupied-dim); }
.move-btn.occupied, .move-btn:disabled { opacity: .35; cursor: not-allowed; }

/* 作业记录表 */
.ops-table { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.ops-header {
  display: flex; gap: 8px; padding: 5px 9px;
  background: var(--bg-panel); font-size: 10px; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border);
}
.ops-body { max-height: 180px; overflow-y: auto; }
.ops-row {
  display: flex; gap: 8px; padding: 4px 9px;
  font-size: 11px; border-bottom: 1px solid var(--border-light);
  border-left: 2px solid transparent;
}
.ops-row:hover { background: var(--bg-hover); }
.op-success { border-left-color: var(--track-free); }
.op-warn    { border-left-color: var(--track-locked); }
.op-info    { border-left-color: var(--border); }
.col-train { width: 60px; flex-shrink: 0; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); }
.col-op    { width: 60px; flex-shrink: 0; color: var(--text-secondary); }
.col-loc   { flex: 1; color: var(--text-muted); font-family: var(--font-mono); font-size: 10px; }
.col-time  { width: 72px; flex-shrink: 0; color: var(--text-muted); font-family: var(--font-mono); font-size: 10px; }

.message-toast { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.toast-success { background: var(--track-free-dim);     color: var(--track-free);     border: 1px solid var(--track-free); }
.toast-error   { background: var(--track-occupied-dim); color: var(--track-occupied); border: 1px solid var(--track-occupied); }
.toast-warn    { background: var(--track-locked-dim);   color: var(--track-locked);   border: 1px solid var(--track-locked); }
.toast-info    { background: rgba(9,105,218,.1);        color: var(--accent-blue);    border: 1px solid var(--accent-blue); }
</style>
