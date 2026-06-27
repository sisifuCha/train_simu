import { defineStore } from 'pinia'
import { useRailwayStore } from './railway.js'

export const useInterlockingStore = defineStore('interlocking', () => {
  // ─── 联锁条件检查 ──────────────────────────────────────────────────────────

  function isTrackSectionFree(sectionId) {
    const railway = useRailwayStore()
    const section = railway.stationLayout.trackSections[sectionId]
    return section && !section.occupied && !section.locked && !section.blocked
  }

  function isRoutePathFree(path) {
    return path.every(sectionId => isTrackSectionFree(sectionId))
  }

  function isTurnoutAvailable(turnoutId) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    return t && !t.locked && !t.singleLocked && !t.blocked && !t.defective
  }

  function hasConflictingRoutes(newRoute) {
    const railway = useRailwayStore()
    for (const active of railway.activeRoutes) {
      // 路径区段交叉
      const pathConflict = newRoute.path.some(s => active.path.includes(s))
      // 道岔位置冲突（同一道岔要求不同位置）
      const turnoutConflict = newRoute.turnouts.some(nt =>
        active.turnouts.some(at => at.id === nt.id && at.position !== nt.position)
      )
      if (pathConflict || turnoutConflict) {
        return active
      }
    }
    return null
  }

  // ─── 联锁判定（供操作层调用）──────────────────────────────────────────────
  // 进路驱动模型：区间 JXG/JSG 自由占用；其余区段须属于一条已开放/占用中的进路
  //（信号红=无开放进路=不可占用，体现"红灯挡占用"）。
  const APPROACH_SECTIONS = ['JXG', 'JSG']
  function sectionOccupiable(sectionId) {
    const railway = useRailwayStore()
    if (APPROACH_SECTIONS.includes(sectionId)) return { ok: true }
    const onOpenRoute = railway.activeRoutes.some(r =>
      ['opened', 'occupied'].includes(r.status) && r.path.includes(sectionId)
    )
    if (onOpenRoute) return { ok: true }
    return { ok: false, reason: '无开放进路（信号红灯），不能占用' }
  }

  // 占用一个区段（含门控 + 进路状态置占用）
  function occupySection(sectionId) {
    const railway = useRailwayStore()
    const s = railway.stationLayout.trackSections[sectionId]
    if (!s) return { success: false, message: '区段不存在' }
    if (s.occupied) return { success: false, message: `区段 ${sectionId} 已被占用` }

    const judge = sectionOccupiable(sectionId)
    if (!judge.ok) {
      railway.addLog('占用被拒', `区段 ${sectionId}：${judge.reason}`, 'error')
      return { success: false, message: `区段 ${sectionId}：${judge.reason}` }
    }

    s.occupied = true
    // 所属已开放进路 → 置占用
    railway.activeRoutes.forEach(r => {
      if (r.status === 'opened' && r.path.includes(sectionId)) r.status = 'occupied'
    })
    railway.addLog('轨道占用', `区段 ${sectionId} 占用（列车压入）`, 'warn')
    autoReleaseFulfilledRoutes()
    railway.saveToStorage()
    return { success: true, message: `区段 ${sectionId} 已占用` }
  }

  // 出清一个区段（含"列车驶过 → 防护信号自动复红"）
  function clearSection(sectionId) {
    const railway = useRailwayStore()
    const s = railway.stationLayout.trackSections[sectionId]
    if (!s) return { success: false, message: '区段不存在' }
    s.occupied = false

    // 自动复红：列车驶离信号机内方第一区段(进路 path[0]) → entrySignal 自动复红
    railway.activeRoutes.forEach(r => {
      if (!['opened', 'occupied'].includes(r.status)) return
      if (r.path[0] !== sectionId) return
      const sig = railway.stationLayout.signals[r.entrySignal]
      if (sig && sig.aspect !== 'red') {
        sig.aspect = 'red'
        railway.addLog('信号自动复红', `列车驶过，${sig.name}自动复红`, 'info')
      }
    })
    railway.addLog('轨道出清', `区段 ${sectionId} 出清`, 'info')
    autoReleaseFulfilledRoutes()
    railway.saveToStorage()
    return { success: true, message: `区段 ${sectionId} 已出清` }
  }

  // 进路兑现自动解锁：列车到达进路终点(末段占用)且前段全部出清 → 进路兑现，
  // 自动释放区段锁、道岔锁、移除进路（终点股道仍占用，留待列车后续操作）。
  function autoReleaseFulfilledRoutes() {
    const railway = useRailwayStore()
    const ts = railway.stationLayout.trackSections
    for (const route of [...railway.activeRoutes]) {
      if (route.status !== 'occupied') continue
      const path = route.path
      const dest = path[path.length - 1]
      const destOccupied = ts[dest]?.occupied
      const earlierClear = path.slice(0, -1).every(sid => !ts[sid]?.occupied)
      if (destOccupied && earlierClear) {
        _doUnlock(route, railway)   // 释放区段/道岔锁 + 信号复红
        const i = railway.activeRoutes.findIndex(r => r.id === route.id)
        if (i !== -1) railway.activeRoutes.splice(i, 1)
        railway.addLog('进路兑现', `「${route.name}」列车到达终点，进路自动解锁`, 'success')
      }
    }
  }

  // ─── 进路操作 ──────────────────────────────────────────────────────────────

  /**
   * 选排并锁闭进路（两步合一：选排即锁闭）
   * 返回 { success, message }
   */
  function establishRoute(routeId) {
    const railway = useRailwayStore()
    const template = railway.routeTemplates.find(r => r.id === routeId)
    if (!template) return { success: false, message: '进路模板不存在' }

    // 1. 敌对进路检查
    const conflicting = hasConflictingRoutes(template)
    if (conflicting) {
      return { success: false, message: `存在敌对进路「${conflicting.name}」，无法办理` }
    }

    // 2. 进路区段空闲检查
    //    发车进路：始端股道(path[0])允许有待发列车占用，仅检查其余区段
    const checkPath = template.type === 'departure' ? template.path.slice(1) : template.path
    const busy = checkPath.find(s => !isTrackSectionFree(s))
    if (busy) {
      const sec = railway.stationLayout.trackSections[busy]
      return { success: false, message: `区段「${sec?.name || busy}」被占用或锁闭，无法办理` }
    }

    // 3. 道岔可操作检查及自动转换
    for (const req of template.turnouts) {
      const t = railway.stationLayout.turnouts[req.id]
      if (!t) return { success: false, message: `道岔${req.id}不存在` }
      if (t.position !== req.position) {
        if (!isTurnoutAvailable(req.id)) {
          const reason = t.defective ? '故障' : t.locked ? '被进路锁闭' : t.singleLocked ? '单锁' : '封锁'
          return { success: false, message: `${t.name}${reason}，无法自动转换` }
        }
        t.position = req.position
        railway.addLog('道岔自动转换', `${t.name} → ${req.position === 'normal' ? '定位' : '反位'}`, 'info')
      }
    }

    // 4. 锁闭轨道区段
    template.path.forEach(sid => {
      railway.stationLayout.trackSections[sid].locked = true
    })

    // 5. 锁闭道岔
    template.turnouts.forEach(req => {
      railway.stationLayout.turnouts[req.id].locked = true
    })

    // 6. 添加活动进路
    railway.activeRoutes.push({
      ...template,
      status: 'locked',
      establishedAt: new Date().toISOString(),
      openedAt: null,
      cancelCountdown: null
    })

    railway.addLog('进路锁闭', `「${template.name}」锁闭成功`, 'success')
    railway.saveToStorage()
    return { success: true, message: `「${template.name}」进路锁闭成功` }
  }

  /**
   * 开放进路信号
   */
  function openRoute(routeId) {
    const railway = useRailwayStore()
    const route = railway.activeRoutes.find(r => r.id === routeId)
    if (!route) return { success: false, message: '活动进路不存在' }
    if (route.status !== 'locked') return { success: false, message: '进路状态不符，无法开放' }

    // 检查信号机是否故障
    const signal = railway.stationLayout.signals[route.entrySignal]
    if (!signal) return { success: false, message: '信号机不存在' }
    if (signal.defective) return { success: false, message: '信号机故障，无法开放' }

    // 按进路类型设置信号
    signal.aspect = route.type === 'shunting' ? 'yellow' : 'green'
    route.status = 'opened'
    route.openedAt = new Date().toISOString()

    railway.addLog('信号开放', `「${route.name}」${route.type === 'shunting' ? '调车黄灯' : '绿灯'}开放`, 'success')
    railway.saveToStorage()
    return { success: true, message: `「${route.name}」信号已开放` }
  }

  /**
   * 正常解锁进路（需所有区段出清）
   */
  function unlockRoute(routeId) {
    const railway = useRailwayStore()
    const idx = railway.activeRoutes.findIndex(r => r.id === routeId)
    if (idx === -1) return { success: false, message: '活动进路不存在' }
    const route = railway.activeRoutes[idx]

    // 检查是否所有区段出清
    const busySection = route.path.find(sid => {
      const s = railway.stationLayout.trackSections[sid]
      return s && s.occupied
    })
    if (busySection) {
      const sec = railway.stationLayout.trackSections[busySection]
      return { success: false, message: `区段「${sec?.name || busySection}」仍有列车，无法解锁` }
    }

    _doUnlock(route, railway)
    railway.activeRoutes.splice(idx, 1)
    railway.addLog('进路解锁', `「${route.name}」已正常解锁`, 'success')
    railway.saveToStorage()
    return { success: true, message: `「${route.name}」进路已解锁` }
  }

  /**
   * 取消进路（人工解锁）—— 调用方负责实现 30s 倒计时，倒计时结束后调用此函数
   */
  function cancelRoute(routeId, force = false) {
    const railway = useRailwayStore()
    const idx = railway.activeRoutes.findIndex(r => r.id === routeId)
    if (idx === -1) return { success: false, message: '活动进路不存在' }
    const route = railway.activeRoutes[idx]

    if (!force) {
      // 普通取消：仍需区段出清
      const busySection = route.path.find(sid => {
        const s = railway.stationLayout.trackSections[sid]
        return s && s.occupied
      })
      if (busySection) {
        return { success: false, message: '区段有车占用，请使用人工解锁', needForce: true }
      }
    }

    _doUnlock(route, railway)
    railway.activeRoutes.splice(idx, 1)
    railway.addLog('取消进路', `「${route.name}」已${force ? '人工强制' : ''}取消`, 'warn')
    railway.saveToStorage()
    return { success: true, message: `「${route.name}」已取消` }
  }

  function _doUnlock(route, railway) {
    // 解锁区段
    route.path.forEach(sid => {
      const s = railway.stationLayout.trackSections[sid]
      if (s) s.locked = false
    })
    // 解锁道岔（检查其他进路是否还在用）
    route.turnouts.forEach(req => {
      const stillUsed = railway.activeRoutes.some(
        ar => ar.id !== route.id && ar.turnouts.some(t => t.id === req.id)
      )
      if (!stillUsed) {
        railway.stationLayout.turnouts[req.id].locked = false
      }
    })
    // 关闭信号
    if (route.entrySignal) {
      const sig = railway.stationLayout.signals[route.entrySignal]
      if (sig) sig.aspect = 'red'
    }
  }

  // ─── 道岔操作 ──────────────────────────────────────────────────────────────

  function operateTurnout(turnoutId, position) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }
    if (t.defective) return { success: false, message: `${t.name}故障，无法操作` }
    if (t.locked) return { success: false, message: `${t.name}被进路锁闭，无法单独操作` }
    if (t.singleLocked) return { success: false, message: `${t.name}已单独锁闭，请先解锁` }
    if (t.blocked) return { success: false, message: `${t.name}已封锁，无法操作` }
    if (t.position === position) return { success: false, message: `${t.name}已在${position === 'normal' ? '定位' : '反位'}` }

    t.position = position
    railway.addLog('单操道岔', `${t.name} → ${position === 'normal' ? '定位' : '反位'}`, 'info')
    railway.saveToStorage()
    return { success: true, message: `${t.name}已转换至${position === 'normal' ? '定位' : '反位'}` }
  }

  function singleLockTurnout(turnoutId) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }
    if (t.locked) return { success: false, message: `${t.name}被进路锁闭，无法单锁` }
    if (t.singleLocked) return { success: false, message: `${t.name}已处于单锁状态` }

    t.singleLocked = true
    railway.addLog('单锁道岔', `${t.name}已单独锁闭`, 'warn')
    railway.saveToStorage()
    return { success: true, message: `${t.name}单独锁闭成功` }
  }

  function unlockSingleLock(turnoutId) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }
    if (!t.singleLocked) return { success: false, message: `${t.name}未处于单锁状态` }

    t.singleLocked = false
    railway.addLog('解除单锁', `${t.name}单锁已解除`, 'info')
    railway.saveToStorage()
    return { success: true, message: `${t.name}单锁已解除` }
  }

  function blockTurnout(turnoutId) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }
    if (t.locked) return { success: false, message: `${t.name}被进路锁闭，请先解除进路` }
    if (t.singleLocked) return { success: false, message: `${t.name}处于单锁状态，请先解除单锁` }
    if (t.blocked) return { success: false, message: `${t.name}已处于封锁状态` }

    t.blocked = true
    railway.addLog('封锁道岔', `${t.name}已封锁`, 'error')
    railway.saveToStorage()
    return { success: true, message: `${t.name}已封锁` }
  }

  function unblockTurnout(turnoutId) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }
    if (!t.blocked) return { success: false, message: `${t.name}未处于封锁状态` }

    t.blocked = false
    railway.addLog('解除封锁', `${t.name}封锁已解除`, 'info')
    railway.saveToStorage()
    return { success: true, message: `${t.name}封锁已解除` }
  }

  function setTurnoutDefective(turnoutId, defective) {
    const railway = useRailwayStore()
    const t = railway.stationLayout.turnouts[turnoutId]
    if (!t) return { success: false, message: '道岔不存在' }

    t.defective = defective
    if (defective) {
      t.blocked = true
      railway.addLog('道岔故障', `${t.name}设置为故障状态，已自动封锁`, 'error')
    } else {
      t.blocked = false
      railway.addLog('故障恢复', `${t.name}故障已排除，封锁解除`, 'info')
    }
    railway.saveToStorage()
    return { success: true, message: `${t.name}${defective ? '故障设置' : '故障恢复'}成功` }
  }

  // ─── 信号机操作 ────────────────────────────────────────────────────────────

  function manualSetSignal(signalId, aspect) {
    const railway = useRailwayStore()
    const sig = railway.stationLayout.signals[signalId]
    if (!sig) return { success: false, message: '信号机不存在' }
    if (sig.defective) return { success: false, message: `${sig.name}故障，无法操作` }

    // 进路驱动：进站/出站信号(automated)由进路开放/解锁自动控制，不能手动开放
    if (sig.automated) {
      railway.addLog('信号操作被拒', `${sig.name}由进路自动控制，请办理进路开放`, 'error')
      return { success: false, message: `${sig.name}由进路自动控制，请办理进路开放` }
    }

    // 调车信号可手动切换
    sig.aspect = aspect
    railway.addLog('人工操控信号', `${sig.name} → ${aspect === 'green' ? '绿灯' : aspect === 'yellow' ? '黄灯' : '红灯'}`, 'warn')
    railway.saveToStorage()
    return { success: true, message: `${sig.name}已设为${aspect === 'green' ? '绿灯' : aspect === 'yellow' ? '黄灯' : '红灯'}` }
  }

  function setSignalDefective(signalId, defective) {
    const railway = useRailwayStore()
    const sig = railway.stationLayout.signals[signalId]
    if (!sig) return { success: false, message: '信号机不存在' }

    sig.defective = defective
    if (defective) {
      sig.aspect = 'red'
      railway.addLog('信号故障', `${sig.name}故障，强制显示红灯`, 'error')
    } else {
      railway.addLog('信号恢复', `${sig.name}故障已排除`, 'info')
    }
    railway.saveToStorage()
    return { success: true, message: `${sig.name}${defective ? '故障设置' : '故障恢复'}成功` }
  }

  // ─── 列车操作 ──────────────────────────────────────────────────────────────

  function addTrain(number, sectionId, direction = 'forward') {
    const railway = useRailwayStore()
    const section = railway.stationLayout.trackSections[sectionId]
    if (!section) return { success: false, message: '轨道区段不存在' }
    if (section.occupied) return { success: false, message: `区段「${section.name}」已有列车` }

    // 联锁门控：区间可放，站内须有开放进路
    const judge = sectionOccupiable(sectionId)
    if (!judge.ok) {
      railway.addLog('添加列车被拒', `「${section.name}」：${judge.reason}`, 'error')
      return { success: false, message: `「${section.name}」：${judge.reason}` }
    }

    const id = railway.nextTrainId
    railway.nextTrainId = id + 1
    const train = {
      id,
      number: number || `T${id}`,
      currentSection: sectionId,
      direction,
      speed: 0,
      status: 'stopped',
      arrivedAt: new Date().toISOString()
    }
    railway.trains.push(train)
    occupySection(sectionId)   // 占用 + 进路置占用

    railway.addLog('列车进入', `${train.number} 进入「${section.name}」`, 'info')
    railway.saveToStorage()
    return { success: true, message: `列车${train.number}已添加至${section.name}`, train }
  }

  function moveTrain(trainId, targetSectionId, { enforce = true } = {}) {
    const railway = useRailwayStore()
    const train = railway.trains.find(t => t.id === trainId)
    if (!train) return { success: false, message: '列车不存在' }

    const targetSection = railway.stationLayout.trackSections[targetSectionId]
    if (!targetSection) return { success: false, message: '目标区段不存在' }
    if (targetSection.occupied) return { success: false, message: `目标区段「${targetSection.name}」已有列车` }

    // 联锁：目标股道须满足"道岔接通+信号开放"（与点击占用同一规则）；自动运行旁路
    if (enforce) {
      const judge = sectionOccupiable(targetSectionId)
      if (!judge.ok) {
        railway.addLog('列车移动被拒', `${train.number} → ${targetSection.name}：${judge.reason}`, 'error')
        return { success: false, message: `${train.number}：${judge.reason}` }
      }
    }

    const prevSection = train.currentSection
    const prevName = railway.stationLayout.trackSections[prevSection]?.name || prevSection
    // 释放当前区段（触发驶过自动复红）
    clearSection(prevSection)
    // 占用目标区段
    targetSection.occupied = true
    railway.activeRoutes.forEach(r => {
      if (r.status === 'opened' && r.path.includes(targetSectionId)) r.status = 'occupied'
    })
    train.currentSection = targetSectionId
    autoReleaseFulfilledRoutes()   // 到达终点则进路兑现自动解锁

    railway.addLog('列车移动', `${train.number} ${prevName} → ${targetSection.name}`, 'info')
    railway.saveToStorage()
    return { success: true, message: `${train.number}已移至${targetSection.name}` }
  }

  function removeTrain(trainId) {
    const railway = useRailwayStore()
    const idx = railway.trains.findIndex(t => t.id === trainId)
    if (idx === -1) return { success: false, message: '列车不存在' }

    const train = railway.trains[idx]
    clearSection(train.currentSection)   // 出清 + 触发自动复红

    railway.trains.splice(idx, 1)
    railway.addLog('列车出清', `${train.number}已出清`, 'info')
    railway.saveToStorage()
    return { success: true, message: `${train.number}已出清` }
  }

  return {
    // 进路
    establishRoute,
    openRoute,
    unlockRoute,
    cancelRoute,
    // 道岔
    operateTurnout,
    singleLockTurnout,
    unlockSingleLock,
    blockTurnout,
    unblockTurnout,
    setTurnoutDefective,
    // 信号
    manualSetSignal,
    setSignalDefective,
    // 列车
    addTrain,
    moveTrain,
    removeTrain,
    // 检查（供外部查询）
    isTrackSectionFree,
    hasConflictingRoutes,
    sectionOccupiable,
    occupySection,
    clearSection
  }
})
