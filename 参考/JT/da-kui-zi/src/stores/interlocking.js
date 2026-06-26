import { defineStore } from 'pinia'
import { useRailwayStore } from './railway'

export const useInterlockingStore = defineStore('interlocking', () => {
  const railwayStore = useRailwayStore()

  // 联锁条件检查
  const checkInterlockingConditions = {
    // 检查轨道区段空闲
    isTrackSectionFree(sectionId) {
      const section = railwayStore.stationLayout.trackSections[sectionId]
      return section && !section.occupied && !section.locked
    },

    // 检查道岔位置正确且锁闭
    isTurnoutInCorrectPosition(turnoutId, requiredPosition) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      return turnout && turnout.position === requiredPosition && turnout.locked
    },

    // 检查进路上所有轨道区段空闲
    isRoutePathFree(routePath) {
      return routePath.every(sectionId =>
        this.isTrackSectionFree(sectionId)
      )
    },

    // 检查敌对进路
    hasConflictingRoutes(newRoute) {
      const activeRoutes = railwayStore.routes.activeRoutes
      return activeRoutes.some(activeRoute => {
        // 检查路径交叉
        const hasPathConflict = newRoute.path.some(section =>
          activeRoute.path.includes(section)
        )
        // 检查道岔冲突
        const hasTurnoutConflict = newRoute.turnouts.some(newTurnout =>
          activeRoute.turnouts.some(activeTurnout =>
            activeTurnout.id === newTurnout.id &&
            activeTurnout.position !== newTurnout.position
          )
        )
        return hasPathConflict || hasTurnoutConflict
      })
    }
  }

  // 进路操作
  const routeOperations = {
    // 进路选排
    selectRoute(routeId) {
      const routeTemplate = railwayStore.routes.routeTemplates.find(r => r.id === routeId)
      if (!routeTemplate) {
        throw new Error(`进路模板 ${routeId} 不存在`)
      }

      // 检查联锁条件
      if (checkInterlockingConditions.hasConflictingRoutes(routeTemplate)) {
        throw new Error('存在敌对进路，无法选排')
      }

      if (!checkInterlockingConditions.isRoutePathFree(routeTemplate.path)) {
        throw new Error('进路区段被占用，无法选排')
      }

      // 检查道岔位置
      for (const turnout of routeTemplate.turnouts) {
        const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
        if (currentTurnout.position !== turnout.position) {
          // 自动转换道岔到正确位置
          if (!currentTurnout.locked && !currentTurnout.singleLocked && !currentTurnout.blocked) {
            currentTurnout.position = turnout.position
            railwayStore.addLog('道岔操作', `道岔${turnout.id}转换到${turnout.position}位`)
          } else {
            throw new Error(`道岔${turnout.id}无法转换到所需位置`)
          }
        }
      }

      return routeTemplate
    },

    // 进路锁闭
    lockRoute(routeTemplate) {
      // 锁闭轨道区段
      routeTemplate.path.forEach(sectionId => {
        const section = railwayStore.stationLayout.trackSections[sectionId]
        if (section) {
          section.locked = true
        }
      })

      // 锁闭道岔
      routeTemplate.turnouts.forEach(turnout => {
        const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
        if (currentTurnout) {
          currentTurnout.locked = true
        }
      })

      // 添加到活动进路
      const activeRoute = {
        ...routeTemplate,
        establishedAt: new Date(),
        status: 'locked'
      }
      railwayStore.routes.activeRoutes.push(activeRoute)

      railwayStore.addLog('进路锁闭', `进路${routeTemplate.name}已锁闭`)
      return activeRoute
    },

    // 进路开放
    openRoute(routeId) {
      const activeRoute = railwayStore.routes.activeRoutes.find(r => r.id === routeId)
      if (!activeRoute) {
        throw new Error('进路不存在或未锁闭')
      }

      // 开放进路信号
      if (activeRoute.entrySignal) {
        const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
        if (signal) {
          // 根据进路类型设置信号显示
          switch (activeRoute.type) {
            case 'reception':
              signal.aspect = 'green'
              break
            case 'departure':
              signal.aspect = 'green'
              break
            case 'shunting':
              signal.aspect = 'yellow'
              break
          }
        }
      }

      activeRoute.status = 'opened'
      activeRoute.openedAt = new Date()

      railwayStore.addLog('进路开放', `进路${activeRoute.name}信号已开放`)
    },

    // 进路解锁
    unlockRoute(routeId) {
      const routeIndex = railwayStore.routes.activeRoutes.findIndex(r => r.id === routeId)
      if (routeIndex === -1) {
        throw new Error('进路不存在')
      }

      const activeRoute = railwayStore.routes.activeRoutes[routeIndex]

      // 检查是否可以解锁（区段空闲）
      const canUnlock = activeRoute.path.every(sectionId => {
        const section = railwayStore.stationLayout.trackSections[sectionId]
        return section && !section.occupied
      })

      if (!canUnlock) {
        throw new Error('进路区段仍有列车占用，无法解锁')
      }

      // 解锁轨道区段
      activeRoute.path.forEach(sectionId => {
        const section = railwayStore.stationLayout.trackSections[sectionId]
        if (section) {
          section.locked = false
        }
      })

      // 解锁道岔
      activeRoute.turnouts.forEach(turnout => {
        const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
        if (currentTurnout) {
          currentTurnout.locked = false
        }
      })

      // 关闭信号
      if (activeRoute.entrySignal) {
        const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
        if (signal) {
          signal.aspect = 'red'
        }
      }

      // 移除活动进路
      railwayStore.routes.activeRoutes.splice(routeIndex, 1)

      railwayStore.addLog('进路解锁', `进路${activeRoute.name}已解锁`)
    },

    // 取消进路
    cancelRoute(routeId) {
      const routeIndex = railwayStore.routes.activeRoutes.findIndex(r => r.id === routeId)
      if (routeIndex === -1) {
        throw new Error('进路不存在')
      }

      const activeRoute = railwayStore.routes.activeRoutes[routeIndex]

      // 强制解锁（紧急情况）
      activeRoute.path.forEach(sectionId => {
        const section = railwayStore.stationLayout.trackSections[sectionId]
        if (section) {
          section.locked = false
        }
      })

      activeRoute.turnouts.forEach(turnout => {
        const currentTurnout = railwayStore.stationLayout.turnouts[turnout.id]
        if (currentTurnout) {
          currentTurnout.locked = false
        }
      })

      // 关闭信号
      if (activeRoute.entrySignal) {
        const signal = railwayStore.stationLayout.signals[activeRoute.entrySignal]
        if (signal) {
          signal.aspect = 'red'
        }
      }

      railwayStore.routes.activeRoutes.splice(routeIndex, 1)

      railwayStore.addLog('进路取消', `进路${activeRoute.name}已强制取消`)
    }
  }

  // 道岔操作
  const turnoutOperations = {
    // 单独操作道岔
    operateTurnout(turnoutId, targetPosition) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      if (!turnout) {
        throw new Error(`道岔${turnoutId}不存在`)
      }

      if (turnout.locked) {
        throw new Error(`道岔${turnoutId}被进路锁闭，无法操作`)
      }

      if (turnout.singleLocked) {
        throw new Error(`道岔${turnoutId}被单独锁闭，无法操作`)
      }

      if (turnout.blocked) {
        throw new Error(`道岔${turnoutId}被封锁，无法操作`)
      }

      if (turnout.defective) {
        throw new Error(`道岔${turnoutId}故障，无法操作`)
      }

      turnout.position = targetPosition
      railwayStore.addLog('道岔操作', `道岔${turnoutId}操作至${targetPosition}位`)
    },

    // 道岔单锁
    singleLockTurnout(turnoutId) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      if (!turnout) {
        throw new Error(`道岔${turnoutId}不存在`)
      }

      if (turnout.locked) {
        throw new Error(`道岔${turnoutId}被进路锁闭，无法单锁`)
      }

      turnout.singleLocked = true
      railwayStore.addLog('道岔操作', `道岔${turnoutId}已单独锁闭`)
    },

    // 道岔解锁
    unlockTurnout(turnoutId) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      if (!turnout) {
        throw new Error(`道岔${turnoutId}不存在`)
      }

      if (turnout.locked) {
        throw new Error(`道岔${turnoutId}被进路锁闭，无法解锁`)
      }

      turnout.singleLocked = false
      railwayStore.addLog('道岔操作', `道岔${turnoutId}已解锁`)
    },

    // 道岔封锁
    blockTurnout(turnoutId) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      if (!turnout) {
        throw new Error(`道岔${turnoutId}不存在`)
      }

      turnout.blocked = true
      railwayStore.addLog('道岔操作', `道岔${turnoutId}已封锁`)
    },

    // 道岔解封
    unblockTurnout(turnoutId) {
      const turnout = railwayStore.stationLayout.turnouts[turnoutId]
      if (!turnout) {
        throw new Error(`道岔${turnoutId}不存在`)
      }

      turnout.blocked = false
      railwayStore.addLog('道岔操作', `道岔${turnoutId}已解封`)
    }
  }

  return {
    checkInterlockingConditions,
    routeOperations,
    turnoutOperations
  }
}) 