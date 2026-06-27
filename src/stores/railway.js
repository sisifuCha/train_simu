import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useRailwayStore = defineStore('railway', () => {
  // ─── 站场设备（三股道中间站，对应 img.png）────────────────────────────────
  // 布局：JXG — IIAG — 1# — 3G(上) / IIG(中) / 1G(下) — 4#/2# — IIBG — JSG
  //                          3#渡线在 3G↔IIG 之间
  //                          5#道岔在 1G 上，反位通向安全线 SFXG
  const stationLayout = reactive({
    trackSections: {
      'JXG':  { id: 'JXG',  name: '进站区间',   occupied: false, locked: false, blocked: false },
      'IIAG': { id: 'IIAG', name: '进站咽喉区', occupied: false, locked: false, blocked: false },
      '3G':   { id: '3G',   name: '3号股道',    occupied: false, locked: false, blocked: false },
      'IIG':  { id: 'IIG',  name: 'II正线股道', occupied: false, locked: false, blocked: false },
      '1G':   { id: '1G',   name: '1号股道',    occupied: false, locked: false, blocked: false },
      'SFXG': { id: 'SFXG', name: '安全线',     occupied: false, locked: false, blocked: false },
      'IIBG': { id: 'IIBG', name: '出站咽喉区', occupied: false, locked: false, blocked: false },
      'JSG':  { id: 'JSG',  name: '出站区间',   occupied: false, locked: false, blocked: false }
    },

    // 1号：进站侧主分叉（定→IIG中，反→3G上，另一腿→1G下由同侧几何处理）
    // 3号：进站侧 3G↔IIG 之间的渡线道岔（img中3在1右侧，连通3G和IIG）
    // 5号：1G上，定→直行，反→安全线SFXG
    // 4号：出站侧 3G→IIBG 斜线汇合道岔
    // 2号：出站侧 1G→IIBG 斜线汇合道岔
    turnouts: {
      '1': { id: '1', name: '1号道岔', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '3': { id: '3', name: '3号道岔', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '4': { id: '4', name: '4号道岔', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '2': { id: '2', name: '2号道岔', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '5': { id: '5', name: '5号道岔', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false }
    },

    // automated: 进站/出站信号由进路驱动(true)，调车信号可手动(false)
    // X, D1 进站端；S3,SII,S1 侧线端；XII,X3,X1 股道出站端；D2,S 出站端
    signals: {
      'X':   { id: 'X',   name: 'X进站信号',   aspect: 'red', type: 'entry',    automated: true,  defective: false },
      'D1':  { id: 'D1',  name: 'D1调车信号',  aspect: 'red', type: 'shunting', automated: false, defective: false },
      'S3':  { id: 'S3',  name: 'S3出站信号',  aspect: 'red', type: 'exit',     automated: true,  defective: false },
      'SII': { id: 'SII', name: 'SII调车信号', aspect: 'red', type: 'shunting', automated: false, defective: false },
      'S1':  { id: 'S1',  name: 'S1出站信号',  aspect: 'red', type: 'exit',     automated: true,  defective: false },
      'XII': { id: 'XII', name: 'XII通过信号',  aspect: 'red', type: 'exit',     automated: true,  defective: false },
      'X3':  { id: 'X3',  name: 'X3出站信号',  aspect: 'red', type: 'exit',     automated: true,  defective: false },
      'X1':  { id: 'X1',  name: 'X1出站信号',  aspect: 'red', type: 'exit',     automated: true,  defective: false },
      'D2':  { id: 'D2',  name: 'D2调车信号',  aspect: 'red', type: 'shunting', automated: false, defective: false },
      'S':   { id: 'S',   name: 'S进站信号',   aspect: 'red', type: 'entry',    automated: true,  defective: false }
    },

    // 其他设备（D1/D2 调车信号机底座，PZA 安全线标识）
    devices: {
      'D1':  { id: 'D1',  locked: false },
      'D2':  { id: 'D2',  locked: false },
      'PZA': { id: 'PZA', locked: false },
    }
  })

  // ─── 进路模板（三股道）────────────────────────────────────────────────────
  // 1号定位 → IIG中股；1号反位 → 3G上股（通过3号）
  // 下股1G：从IIAG区段经由1G直接连（img中1G在最下，进站侧由IIAG咽喉引出）
  const routeTemplates = [
    // ── 接车（X方向进站）
    {
      id: 'X-IIG',
      name: 'X→IIG（接车进正线）',
      type: 'reception',
      path: ['JXG', 'IIAG', 'IIG'],
      entrySignal: 'X',
      turnouts: [{ id: '1', position: 'normal' }]
    },
    {
      id: 'X-3G',
      name: 'X→3G（接车进上股）',
      type: 'reception',
      path: ['JXG', 'IIAG', '3G'],
      entrySignal: 'X',
      turnouts: [{ id: '1', position: 'reverse' }, { id: '3', position: 'normal' }]
    },
    {
      id: 'X-1G',
      name: 'X→1G（接车进下股）',
      type: 'reception',
      path: ['JXG', 'IIAG', '1G'],
      entrySignal: 'X',
      turnouts: [{ id: '1', position: 'reverse' }, { id: '3', position: 'reverse' }]
    },
    // ── 接车（S方向反向进站）
    {
      id: 'S-IIG',
      name: 'S→IIG（反向接车正线）',
      type: 'reception',
      path: ['JSG', 'IIBG', 'IIG'],
      entrySignal: 'S',
      turnouts: [{ id: '4', position: 'normal' }, { id: '2', position: 'normal' }]
    },
    {
      id: 'S-3G',
      name: 'S→3G（反向接车上股）',
      type: 'reception',
      path: ['JSG', 'IIBG', '3G'],
      entrySignal: 'S',
      turnouts: [{ id: '4', position: 'reverse' }]
    },
    {
      id: 'S-1G',
      name: 'S→1G（反向接车下股）',
      type: 'reception',
      path: ['JSG', 'IIBG', '1G'],
      entrySignal: 'S',
      turnouts: [{ id: '2', position: 'reverse' }]
    },
    // ── 发车（向X方向上行）
    {
      id: 'IIG-X',
      name: 'IIG→X（正线发车上行）',
      type: 'departure',
      path: ['IIG', 'IIAG', 'JXG'],
      entrySignal: 'XII',
      turnouts: [{ id: '1', position: 'normal' }]
    },
    {
      id: '3G-X',
      name: '3G→X（上股发车上行）',
      type: 'departure',
      path: ['3G', 'IIAG', 'JXG'],
      entrySignal: 'X3',
      turnouts: [{ id: '1', position: 'reverse' }, { id: '3', position: 'normal' }]
    },
    {
      id: '1G-X',
      name: '1G→X（下股发车上行）',
      type: 'departure',
      path: ['1G', 'IIAG', 'JXG'],
      entrySignal: 'S1',
      turnouts: [{ id: '1', position: 'reverse' }, { id: '3', position: 'reverse' }]
    },
    // ── 发车（向S方向下行）
    {
      id: 'IIG-S',
      name: 'IIG→S（正线发车下行）',
      type: 'departure',
      path: ['IIG', 'IIBG', 'JSG'],
      entrySignal: 'XII',
      turnouts: [{ id: '4', position: 'normal' }, { id: '2', position: 'normal' }]
    },
    {
      id: '3G-S',
      name: '3G→S（上股发车下行）',
      type: 'departure',
      path: ['3G', 'IIBG', 'JSG'],
      entrySignal: 'X3',
      turnouts: [{ id: '4', position: 'reverse' }]
    },
    {
      id: '1G-S',
      name: '1G→S（下股发车下行）',
      type: 'departure',
      path: ['1G', 'IIBG', 'JSG'],
      entrySignal: 'S1',
      turnouts: [{ id: '2', position: 'reverse' }]
    },
    // ── 调车
    {
      id: '1G-SF',
      name: '1G→安全线（调车）',
      type: 'shunting',
      path: ['1G', 'SFXG'],
      entrySignal: 'SII',
      turnouts: [{ id: '5', position: 'reverse' }]
    }
  ]

  const activeRoutes = reactive([])
  const trains = reactive([])
  const nextTrainId = ref(1)
  const operationLog = ref([])

  function addLog(operation, detail, level = 'info') {
    operationLog.value.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      operation, detail, level
    })
    if (operationLog.value.length > 500) operationLog.value.splice(500)
  }

  function saveToStorage() {
    try {
      localStorage.setItem('railway_state', JSON.stringify({
        trackSections: stationLayout.trackSections,
        turnouts: stationLayout.turnouts,
        signals: stationLayout.signals,
        activeRoutes, trains,
        nextTrainId: nextTrainId.value,
        operationLog: operationLog.value.slice(0, 100)
      }))
    } catch (e) { console.warn('存储失败', e) }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem('railway_state')
      if (!raw) return
      const data = JSON.parse(raw)
      // 逐字段合并（保留新增的默认字段，如 signals.automated），只覆盖已存在的设备的动态状态
      const mergeInto = (target, saved) => {
        if (!saved) return
        for (const key of Object.keys(saved)) {
          if (target[key]) Object.assign(target[key], saved[key])
        }
      }
      mergeInto(stationLayout.trackSections, data.trackSections)
      mergeInto(stationLayout.turnouts, data.turnouts)
      mergeInto(stationLayout.signals, data.signals)
      if (data.activeRoutes)  activeRoutes.splice(0, activeRoutes.length, ...data.activeRoutes)
      if (data.trains)        trains.splice(0, trains.length, ...data.trains)
      if (data.nextTrainId)   nextTrainId.value = data.nextTrainId
      if (data.operationLog)  operationLog.value = data.operationLog
    } catch (e) { console.warn('加载存储失败', e) }
  }

  function resetAll() {
    Object.values(stationLayout.trackSections).forEach(s => { s.occupied = false; s.locked = false; s.blocked = false })
    Object.values(stationLayout.turnouts).forEach(t => { t.position = 'normal'; t.locked = false; t.singleLocked = false; t.blocked = false; t.defective = false })
    Object.values(stationLayout.signals).forEach(s => { s.aspect = 'red'; s.defective = false })
    activeRoutes.splice(0); trains.splice(0); nextTrainId.value = 1
    localStorage.removeItem('railway_state')
    addLog('系统复位', '所有设备已恢复初始状态', 'warn')
  }

  loadFromStorage()

  return {
    stationLayout, routeTemplates, activeRoutes, trains, nextTrainId,
    operationLog, addLog, saveToStorage, loadFromStorage, resetAll
  }
})
