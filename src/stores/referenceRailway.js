import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

// 参考项目的 store 结构，独立于主项目，仅供参考页面使用
export const useReferenceRailwayStore = defineStore('referenceRailway', () => {
  const systemState = ref('normal')

  const stationLayout = reactive({
    trackSections: {
      'JXG':   { id: 'JXG',   occupied: false, locked: false },
      'I IAG': { id: 'I IAG', occupied: false, locked: false },
      '3G':    { id: '3G',    occupied: false, locked: false },
      'I IG':  { id: 'I IG',  occupied: false, locked: false },
      '1G':    { id: '1G',    occupied: false, locked: false },
      'I IBG': { id: 'I IBG', occupied: false, locked: false },
      'JSG':   { id: 'JSG',   occupied: false, locked: false },
      '安全线': { id: '安全线', occupied: false, locked: false },
    },
    turnouts: {
      '3': { id: '3', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '5': { id: '5', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '4': { id: '4', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
      '2': { id: '2', position: 'normal', locked: false, singleLocked: false, blocked: false, defective: false },
    },
    signals: {
      'X':   { id: 'X',   aspect: 'red', type: 'entry',    automated: true,  locked: false },
      'S3':  { id: 'S3',  aspect: 'red', type: 'shunting', automated: false, locked: false },
      'SII': { id: 'SII', aspect: 'red', type: 'shunting', automated: false, locked: false },
      'S1':  { id: 'S1',  aspect: 'red', type: 'shunting', automated: false, locked: false },
      'K3':  { id: 'K3',  aspect: 'red', type: 'exit',     automated: true,  locked: false },
      'XII': { id: 'XII', aspect: 'red', type: 'exit',     automated: true,  locked: false },
      'X1':  { id: 'X1',  aspect: 'red', type: 'exit',     automated: true,  locked: false },
      'S':   { id: 'S',   aspect: 'red', type: 'exit',     automated: true,  locked: false },
    },
    devices: {
      'D1':  { id: 'D1',  locked: false },
      'D2':  { id: 'D2',  locked: false },
      'PZA': { id: 'PZA', locked: false },
    }
  })

  const operationLog = ref([])

  function addLog(operation, details) {
    operationLog.value.unshift({
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      operation,
      details
    })
    if (operationLog.value.length > 200) operationLog.value.splice(200)
  }

  function reset() {
    Object.values(stationLayout.trackSections).forEach(s => { s.occupied = false; s.locked = false })
    Object.values(stationLayout.turnouts).forEach(t => { t.position = 'normal'; t.locked = false; t.singleLocked = false; t.blocked = false; t.defective = false })
    Object.values(stationLayout.signals).forEach(s => { s.aspect = 'red' })
    operationLog.value = []
  }

  return { systemState, stationLayout, operationLog, addLog, reset }
})
