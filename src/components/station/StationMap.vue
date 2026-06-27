<template>
  <div class="station-map-container">
    <div class="map-header">
      <span class="map-title">XX中间站 — 站场平面图</span>
      <div class="map-legend">
        <span class="leg"><span class="leg-line free"></span>空闲</span>
        <span class="leg"><span class="leg-line locked"></span>锁闭</span>
        <span class="leg"><span class="leg-line occupied"></span>占用</span>
        <span class="leg-sep"></span>
        <span class="leg"><span class="leg-dot sig-g"></span>绿灯</span>
        <span class="leg"><span class="leg-dot sig-y"></span>黄灯</span>
        <span class="leg"><span class="leg-dot sig-r"></span>红灯</span>
        <span class="leg-sep"></span>
        <span class="leg tip">点击轨道切换占用 · 点击道岔/信号弹窗操作</span>
      </div>
    </div>

    <svg width="100%" viewBox="0 0 1200 320"
         class="station-svg" @click.self="closePopup">

      <defs>
        <filter id="gf-green"  x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gf-orange" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gf-red"    x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- 白色背景 -->
      <rect width="1200" height="320" fill="#ffffff"/>

      <!-- ════════════════════════════════════════════════════
           坐标（精确对照 img.png 比例，viewBox 1200×320）

           Y 轴：
             Y3G  = 80    3G 上股
             YIIG = 130   IIG 中股（主轴）
             Y1G  = 180   1G 下股
             YSF  = 240   安全线

           X 轴关键点：
             50   JXG 左端
             105  JXG 右端 / 绝缘节左
             115  绝缘节右 / IIAG 左端
             270  IIAG 右端 / 1号道岔中心
             340  三股道左端（道岔落脚）
             800  三股道右端（道岔起点）
             870  IIBG 左端（汇合落脚）
             980  IIBG 右端 / 绝缘节左
             990  绝缘节右 / JSG 左端
             1150 JSG 右端
           安全线：从 1G x=270 斜左下到 x=200,YSF
           3号渡线：在 x=370，3G↔IIG
           ════════════════════════════════════════════════════ -->

      <!-- ── 棕黄色轨道线（img.png 的颜色） ─────────────────── -->
      <!-- JXG + IIAG 主轴 -->
      <line x1="50"  y1="130" x2="370" y2="130" class="rail"/>
      <!-- 1号道岔三叉（分支随道岔位置接通/断开） -->
      <line x1="270" y1="130" x2="320" y2="80"  :stroke="armColor(arm3G)" stroke-width="3"/><!-- →3G -->
      <line x1="370" y1="130" x2="340" y2="130" class="rail"/><!-- →IIG -->
      <line x1="300" y1="130" x2="340" y2="180" :stroke="armColor(arm1G)" stroke-width="3"/><!-- →1G -->
      <!-- 三股道水平段 -->
      <line x1="320" y1="80"  x2="800" y2="80"  class="rail"/><!-- 3G -->
      <line x1="340" y1="130" x2="800" y2="130" class="rail"/><!-- IIG -->
      <line x1="340" y1="180" x2="870" y2="180" class="rail"/><!-- 1G -->
      <!-- 4号道岔汇合 3G→IIBG -->
      <line x1="800" y1="80"  x2="850" y2="130" :stroke="armColor(arm4)" stroke-width="3"/>
      <!-- IIG 直通 -->
      <line x1="800" y1="130" x2="870" y2="130" class="rail"/>
      <!-- 2号道岔汇合 1G→IIBG -->
      <line x1="870" y1="180" x2="890" y2="130" :stroke="armColor(arm2)" stroke-width="3"/>
      <!-- IIBG + JSG 主轴 -->
      <line x1="870" y1="130" x2="1150" y2="130" class="rail"/>
      <!-- 安全线：1G→安全线（随5号道岔接通/断开） -->
      <line x1="200" y1="180" x2="340" y2="180" :stroke="armColor(armSF)" stroke-width="3"/>
      <!-- 安全挡（⊢型：一竖 + 上下两短横） -->
      <line x1="200" y1="168" x2="200" y2="192" stroke="#555" stroke-width="3"/>
      <line x1="188" y1="168" x2="200" y2="168" stroke="#555" stroke-width="2"/>
      <line x1="188" y1="192" x2="200" y2="192" stroke="#555" stroke-width="2"/>

      <!-- ── 区段彩色高亮（点击切换占用，叠在轨道线上） ──────── -->

      <!-- JXG（轨道: 50,130 → 105,130） -->
      <line x1="50" y1="130" x2="105" y2="130"
        :stroke="secColor('JXG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('JXG')"/>

      <!-- IIAG（轨道: 115,130 → 270,130） -->
      <line x1="115" y1="130" x2="270" y2="130"
        :stroke="secColor('IIAG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('IIAG')"/>

      <!-- 3G（轨道: 270,130 →斜上 320,80 →水平 800,80 →斜下到4号道岔 850,130） -->
      <polyline :points="`270,130 320,80 800,80 850,130`"
        :stroke="secColor('3G')" stroke-width="5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"
        class="sec-hit" @click.stop="onSectionClick('3G')"/>

      <!-- IIG（轨道: 270,130 → 一直捅到4号道岔 850,130） -->
      <line x1="270" y1="130" x2="850" y2="130"
        :stroke="secColor('IIG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('IIG')"/>

      <!-- 1G（轨道: 300,130 →斜下 340,180 →水平 870,180） -->
      <polyline :points="`300,130 340,180 870,180`"
        :stroke="secColor('1G')" stroke-width="5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"
        class="sec-hit" @click.stop="onSectionClick('1G')"/>

      <!-- SFXG 安全线（轨道: 200,180 → 340,180） -->
      <line x1="200" y1="180" x2="340" y2="180"
        :stroke="secColor('SFXG')" stroke-width="4" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('SFXG')"/>

      <!-- IIBG：2号汇合 + 主轴到绝缘节（4号汇合斜线已并入3G） -->
      <!-- 2号汇合 1G→主线 -->
      <line x1="870" y1="180" x2="890" y2="130"
        :stroke="secColor('IIBG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('IIBG')"/>
      <!-- 主轴段：4号道岔 850 → 绝缘节 1028 -->
      <line x1="850" y1="130" x2="1028" y2="130"
        :stroke="secColor('IIBG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('IIBG')"/>

      <!-- JSG（轨道: 1030,130 → 1150,130） -->
      <line x1="1030" y1="130" x2="1150" y2="130"
        :stroke="secColor('JSG')" stroke-width="5" stroke-linecap="round"
        class="sec-hit" @click.stop="onSectionClick('JSG')"/>

      <!-- ── 区段名称文字 ────────────────────────────────────── -->
      <text x="50"   y="118" class="sec-label">JXG</text>
      <text x="192"  y="118" class="sec-label">I IAG</text>
      <text x="570"  y="66"  class="sec-label">3G</text>
      <text x="570"  y="118" class="sec-label">I IG</text>
      <text x="570"  y="192" class="sec-label">1G</text>
      <text x="220"  y="200" class="sec-label">安全线</text>
      <text x="1005"  y="120" class="sec-label">I IBG</text>
      <text x="1100" y="115" class="sec-label">JSG</text>

      <!-- ── 绝缘节（竖向小矩形，img 里是青色小方块） ──────────── -->
      <rect x="103" y="123" width="5" height="14" fill="#00bcd4" rx="1"/>
      <rect x="1028" y="123" width="5" height="14" fill="#00bcd4" rx="1"/>

      <!-- ── 轨道电路（双青色实心正圆，img 左右各两个） ────────── -->
      <!-- 左端（JXG区域），下移并避开绝缘节竖条 -->
      <circle cx="105" cy="143" r="7" fill="#00bcd4"/>
      <circle cx="117" cy="143" r="7" fill="#00bcd4"/>
      <!-- 右端（JSG区域） -->
      <circle cx="1030" cy="143" r="7" fill="#00bcd4"/>
      <circle cx="1040" cy="143" r="7" fill="#00bcd4"/>

      <!-- ── 坡度标注（右上角）────────────────────────────────── -->
      <text x="1090" y="55" class="grade-label">6%</text>
      <line x1="1080" y1="50" x2="1130" y2="38" stroke="#aaa" stroke-width="1.2" stroke-dasharray="3,2"/>

      <!-- ── 道岔圆点（img 里是深灰圆圈）────────────────────────
           位置：1号(270,130)，3号(370,80)，5号(270,180)（安全线分叉）
                 4号(800,80)，2号(800,180)
      ═══════════════════════════════════════════════════════ -->
      <g v-for="(t, id) in ts.turnouts" :key="'t'+id"
         class="turnout-hit" @click.stop="onTurnoutClick(id,$event)">
        <circle :cx="tPos(id).x" :cy="tPos(id).y" r="16" fill="transparent"/>
        <!-- 外圈（深灰，img风格） -->
        <circle :cx="tPos(id).x" :cy="tPos(id).y" r="8"
          fill="#f5f5f5" :stroke="tRingColor(t)" stroke-width="2.5"/>
        <!-- 内点（状态色） -->
        <circle :cx="tPos(id).x" :cy="tPos(id).y" r="4"
          :fill="tDotColor(t)"/>
        <!-- 编号 -->
        <text :x="tPos(id).x" :y="tPos(id).y - 13" class="t-label">{{ id }}</text>
        <!-- 定/反位 -->
        <text :x="tPos(id).x" :y="tPos(id).y + 20"
          class="t-pos" :class="t.position==='normal'?'pos-n':'pos-r'">
          {{ t.position==='normal'?'定':'反' }}
        </text>
        <text v-if="t.locked"       :x="tPos(id).x" :y="tPos(id).y+30" class="t-lock">锁</text>
        <text v-if="t.singleLocked" :x="tPos(id).x" :y="tPos(id).y+30" class="t-single">S</text>
      </g>

      <!-- ── 信号机（img 里是粉色实心方块，旁边有灰色小圆） ────────
           方块尺寸约 10×12，灯圆在方块旁侧
           信号机坐标和 img 对应：
             X(80,130上方)，D1(140,130下方)
             S3(330,80上方)，SII(330,130下方)，S1(330,180下方)
             X3(790,80上方)，XII(790,130上方)，X1(790,180上方)
             D2(960,130下方)，S(1000,130上方)
      ═══════════════════════════════════════════════════════ -->
      <g v-for="(sig, id) in ts.signals" :key="'s'+id"
         class="signal-hit" @click.stop="onSignalClick(id,$event)">
        <!-- 透明热区 -->
        <rect :x="sPos(id).x-14" :y="sPos(id).y-10" width="32" height="20" fill="transparent"/>
        <!-- 信号灯（灰圆 = 灯泡，随状态变色），在左 -->
        <circle :cx="sPos(id).x-7" :cy="sPos(id).y" r="6"
          :fill="sigColor(sig)" :stroke="sigStroke(sig)" stroke-width="1.5" :filter="sigFilter(sig)"/>
        <!-- 粉色方块（信号机标识），在右 -->
        <rect :x="sPos(id).x+2" :y="sPos(id).y-6" width="11" height="12"
          fill="#e91e8c" rx="1"/>
        <!-- 编号文字 -->
        <text :x="sPos(id).x+1" :y="sPos(id).y-12" class="s-label">{{ id }}</text>
      </g>

      <!-- ── PZA 标注 ────────────────────────────────────────── -->
      <text x="240" y="268" class="sec-label">PZA</text>

    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRailwayStore } from '@/stores/railway.js'
import { useInterlockingStore } from '@/stores/interlocking.js'
import { useNotify } from '@/composables/useNotify.js'

const railway = useRailwayStore()
const interlocking = useInterlockingStore()
const { ok, err } = useNotify()
const ts = computed(() => railway.stationLayout)
const emit = defineEmits(['sectionClick','turnoutClick','signalClick','closePopup'])

// ── 道岔坐标（对照 img.png）────────────────────────────────────
const TPOS = {
  '1': { x: 270, y: 130 },  // 进站主分叉
  '3': { x: 300, y: 130  },  // 3G↔IIG 渡线
  '5': { x: 340, y: 180 },  // 1G→安全线
  '4': { x: 850, y: 130  },  // 出站 3G→IIBG
  '2': { x: 890, y: 130 },  // 出站 1G→IIBG
}
function tPos(id) { return TPOS[id] || { x:0, y:0 } }

// ── 信号机坐标（对照 img.png）──────────────────────────────────
// img 里信号机=粉色方块，旁边是灰色小圆（轨道电路）
// 上方信号机 y 比轨道小，下方反之
const SPOS = {
  'X':   { x:  80, y: 120 },  // 主轴左，上方
  'D1':  { x: 230, y: 120 },  // 主轴左，下方
  'S3':  { x: 450, y:  90 },  // 3G 左端，上方
  'SII': { x: 450, y: 140 },  // IIG 左端，下方
  'S1':  { x: 450, y: 190 },  // 1G 左端，下方
  'X3':  { x: 700, y:  70 },  // 3G 右端，上方
  'XII': { x: 700, y: 120 },  // IIG 右端，上方
  'X1':  { x: 700, y: 170 },  // 1G 右端，上方
  'D2':  { x: 960, y: 140 },  // 主轴右，下方
  'S':   { x:1075, y: 140 },  // 主轴右，上方
}
function sPos(id) { return SPOS[id] || { x:0, y:0 } }

// ── 区段颜色 ──────────────────────────────────────────────────
function secColor(id) {
  const s = ts.value.trackSections[id]
  if (!s || s.blocked) return 'transparent'  // 透明=不覆盖轨道线
  if (s.occupied) return '#e53935'
  if (s.locked)   return '#fb8c00'
  return 'transparent'  // 空闲时不叠色，只靠棕黄轨道线本身
}

// ── 道岔分支轨道：随道岔位置接通/断开 ──────────────────────────
// 接通(active)=亮棕黄，断开=浅灰。扳动道岔后对应分支轨道实时变化。
function tp(id) { return ts.value.turnouts[id]?.position }
function armColor(active) { return active ? '#c8960c' : '#dcdcdc' }
// 各分支接通条件（与进路模板的道岔要求一致）：
const arm3G   = computed(() => tp('1') === 'reverse' && tp('3') === 'normal')  // 进站→3G
const arm1G   = computed(() => tp('1') === 'reverse' && tp('3') === 'reverse') // 进站→1G
const arm4    = computed(() => tp('4') === 'reverse')                          // 出站3G汇合
const arm2    = computed(() => tp('2') === 'reverse')                          // 出站1G汇合
const armSF   = computed(() => tp('5') === 'reverse')                          // 1G→安全线

// ── 道岔颜色 ──────────────────────────────────────────────────
function tRingColor(t) {
  if (t.defective || t.blocked) return '#e53935'
  if (t.locked)       return '#1e88e5'
  if (t.singleLocked) return '#8e24aa'
  return '#616161'
}
function tDotColor(t) {
  if (t.defective || t.blocked) return '#e53935'
  if (t.locked)       return '#1e88e5'
  if (t.singleLocked) return '#8e24aa'
  return t.position === 'normal' ? '#43a047' : '#fb8c00'
}

// ── 信号颜色 ──────────────────────────────────────────────────
function sigColor(sig) {
  if (!sig || sig.defective) return '#bdbdbd'
  return { green:'#43a047', yellow:'#fdd835', red:'#e53935' }[sig.aspect] ?? '#e53935'
}
function sigStroke(sig) {
  if (!sig || sig.defective) return '#9e9e9e'
  return { green:'#2e7d32', yellow:'#c9a800', red:'#b71c1c' }[sig.aspect] ?? '#b71c1c'
}
function sigFilter(sig) {
  if (!sig || sig.defective) return 'none'
  if (sig.aspect==='green')  return 'url(#gf-green)'
  if (sig.aspect==='yellow') return 'url(#gf-orange)'
  return 'url(#gf-red)'
}

// ── 事件 ──────────────────────────────────────────────────────
// 区段点击：出清随时允许（触发驶过自动复红）；占用须满足进路驱动联锁
function onSectionClick(id) {
  const s = ts.value.trackSections[id]
  if (!s) { emit('sectionClick', id); return }

  if (s.occupied) {
    interlocking.clearSection(id)   // 出清 + 自动复红
    emit('sectionClick', id)
    return
  }

  const res = interlocking.occupySection(id)   // 含联锁门控
  res.success ? ok(res.message) : err(res.message)
  emit('sectionClick', id)
}
function onTurnoutClick(id,e) { emit('turnoutClick', id, {x:e.clientX, y:e.clientY}) }
function onSignalClick(id,e)  { emit('signalClick',  id, {x:e.clientX, y:e.clientY}) }
function closePopup()         { emit('closePopup') }
</script>

<style scoped>
.station-map-container {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.map-title {
  font-size: 13px;
  font-weight: 700;
  color: #0550ae;
  letter-spacing: 1px;
}
.map-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.leg  { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #57606a; }
.leg-line { display: inline-block; width: 22px; height: 4px; border-radius: 2px; }
.leg-line.free     { background: #c8960c; }
.leg-line.locked   { background: #fb8c00; }
.leg-line.occupied { background: #e53935; }
.leg-dot  { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.leg-dot.sig-g { background: #43a047; }
.leg-dot.sig-y { background: #fdd835; border: 1px solid #e0c000; }
.leg-dot.sig-r { background: #e53935; }
.leg-sep { width: 1px; height: 12px; background: #d0d7de; }
.leg.tip { color: #9ea7b0; font-style: italic; font-size: 10px; }

/* SVG 白色背景，img.png 风格 */
.station-svg {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: block;
  width: 100%;
  height: auto;
  background: #fff;
  cursor: default;
}

/* 棕黄色轨道线（img.png 的颜色） */
.rail {
  stroke: #c8960c;
  stroke-width: 3;
  fill: none;
}

/* 区段点击热区 */
.sec-hit { cursor: pointer; }
.sec-hit:hover { opacity: 0.75; }

/* 区段名称 */
.sec-label {
  font-size: 11px;
  fill: #333;
  text-anchor: middle;
  font-family: 'Arial', sans-serif;
  pointer-events: none;
  user-select: none;
}

/* 坡度 */
.grade-label {
  font-size: 11px;
  fill: #888;
  font-style: italic;
  pointer-events: none;
}

/* 道岔 */
.turnout-hit { cursor: pointer; }
.turnout-hit:hover circle[r="8"] { r: 9.5; }
.t-label {
  font-size: 10px;
  fill: #444;
  text-anchor: middle;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  pointer-events: none;
}
.t-pos {
  font-size: 9px;
  text-anchor: middle;
  pointer-events: none;
  font-weight: 600;
}
.pos-n { fill: #43a047; }
.pos-r { fill: #fb8c00; }
.t-lock   { font-size: 8px; fill: #1e88e5; text-anchor: middle; pointer-events: none; }
.t-single { font-size: 8px; fill: #8e24aa; text-anchor: middle; font-weight: 700; pointer-events: none; }

/* 信号机 */
.signal-hit { cursor: pointer; }
.signal-hit:hover rect { filter: brightness(1.15); }
.s-label {
  font-size: 9px;
  fill: #333;
  text-anchor: middle;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  pointer-events: none;
}
</style>
