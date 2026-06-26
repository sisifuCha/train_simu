import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useRailwayStore = defineStore('railway', () => {
  // 系统状态
  const systemState = ref('normal') // normal, emergency, maintenance

  // 站场设备定义（基于图片1.png的站场图）
  const stationLayout = reactive({
    // 轨道区段
    trackSections: {
      'JXG': { id: 'JXG', occupied: false, locked: false },
      'I IAG': { id: 'I IAG', occupied: false, locked: false },
      '3G': { id: '3G', occupied: false, locked: false },
      'I IG': { id: 'I IG', occupied: false, locked: false },
      '1G': { id: '1G', occupied: false, locked: false },
      'I IBG': { id: 'I IBG', occupied: false, locked: false },
      'JSG': { id: 'JSG', occupied: false, locked: false },
      '安全线': { id: '安全线', occupied: false, locked: false },
    },

    // 道岔
    turnouts: {
      '3': { id: '3', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '5': { id: '5', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '4': { id: '4', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '2': { id: '2', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
    },

    // 信号机
    signals: {
      'X': { id: 'X', aspect: 'red', type: 'entry', automated: true, locked: false },
      'S3': { id: 'S3', aspect: 'red', type: 'shunting', automated: false, locked: false },
      'SII': { id: 'SII', aspect: 'red', type: 'shunting', automated: false, locked: false },
      'S1': { id: 'S1', aspect: 'red', type: 'shunting', automated: false, locked: false },
      'K3': { id: 'K3', aspect: 'red', type: 'exit', automated: true, locked: false },
      'XII': { id: 'XII', aspect: 'red', type: 'exit', automated: true, locked: false },
      'X1': { id: 'X1', aspect: 'red', type: 'exit', automated: true, locked: false },
      'S': { id: 'S', aspect: 'red', type: 'exit', automated: true, locked: false },
    },

    // 其他设备 (如脱轨器)
    devices: {
      'D1': { id: 'D1', locked: false },
      'D2': { id: 'D2', locked: false },
      'PZA': { id: 'PZA', locked: false },
    }
  })

  // 进路管理
  const routes = reactive({
    activeRoutes: [], // 当前活动进路
    routeTemplates: [
      // 接车进路
      { id: 'X-3G', name: 'X→3G', type: 'reception', path: ['I IAG', '3G'], entrySignal: 'X', turnouts: [{ id: '3', position: 'reverse' }] },
      { id: 'X-IIG', name: 'X→I IG', type: 'reception', path: ['I IAG', 'I IG'], entrySignal: 'X', turnouts: [{ id: '3', position: 'normal' }] },
      { id: 'X-1G', name: 'X→1G', type: 'reception', path: ['I IAG', '1G'], entrySignal: 'X', turnouts: [{ id: '5', position: 'reverse' }] },
      // 发车进路
      { id: '3G-S', name: '3G→S', type: 'departure', path: ['3G', 'I IBG'], entrySignal: 'K3', turnouts: [{ id: '4', position: 'reverse' }] },
      { id: 'IIG-S', name: 'I IG→S', type: 'departure', path: ['I IG', 'I IBG'], entrySignal: 'XII', turnouts: [{ id: '4', position: 'normal' }, { id: '2', position: 'normal' }] },
      { id: '1G-S', name: '1G→S', type: 'departure', path: ['1G', 'I IBG'], entrySignal: 'X1', turnouts: [{ id: '2', position: 'reverse' }] },
    ]
  })

  // 列车管理
  const trains = reactive({
    trainList: [],
    nextTrainId: 1
  })

  // 操作日志
  const operationLog = ref([])

  // LocalStorage 持久化
  const saveToStorage = () => {
    const data = {
      stationLayout: stationLayout,
      routes: routes,
      trains: trains,
      operationLog: operationLog.value
    }
    localStorage.setItem('railwaySystemData', JSON.stringify(data))
  }

  const loadFromStorage = () => {
    const data = localStorage.getItem('railwaySystemData')
    if (data) {
      try {
        const parsed = JSON.parse(data)
        Object.assign(stationLayout, parsed.stationLayout)
        Object.assign(routes, parsed.routes)
        Object.assign(trains, parsed.trains)
        operationLog.value = parsed.operationLog || []
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }
  }

  // 记录操作日志
  const addLog = (operation, details) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      operation,
      details,
      operator: '系统操作员'
    }
    operationLog.value.unshift(logEntry)
    if (operationLog.value.length > 1000) {
      operationLog.value = operationLog.value.slice(0, 1000)
    }
    saveToStorage()
  }

  return {
    systemState,
    stationLayout,
    routes,
    trains,
    operationLog,
    saveToStorage,
    loadFromStorage,
    addLog
  }
}) 