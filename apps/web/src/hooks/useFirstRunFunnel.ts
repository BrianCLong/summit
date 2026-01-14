import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  funnelMilestones,
  getMilestoneStatus,
  getNextMilestone,
  getStoredFunnelState,
  setMilestoneStatus,
  type FunnelMilestone,
  type FunnelMilestoneId,
  type FunnelMilestoneStatus,
  type FunnelState,
} from '@/lib/firstRunFunnel'

export interface FunnelMilestoneWithStatus extends FunnelMilestone {
  status: FunnelMilestoneStatus
}

export const useFirstRunFunnel = () => {
  const [state, setState] = useState<FunnelState>(() => getStoredFunnelState())

  useEffect(() => {
    const handleStorage = () => {
      setState(getStoredFunnelState())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const refresh = useCallback(() => {
    setState(getStoredFunnelState())
  }, [])

  const updateStatus = useCallback(
    (milestoneId: FunnelMilestoneId, status: FunnelMilestoneStatus) => {
      const nextStatus = setMilestoneStatus(milestoneId, status)
      setState(prev => ({ ...prev, [milestoneId]: nextStatus }))
      return nextStatus
    },
    []
  )

  const milestones = useMemo(
    () =>
      funnelMilestones.map(milestone => ({
        ...milestone,
        status: state[milestone.id],
      })),
    [state]
  )

  const completionCount = useMemo(
    () => milestones.filter(milestone => milestone.status === 'complete').length,
    [milestones]
  )

  const completionPercent = Math.round(
    (completionCount / milestones.length) * 100
  )

  const nextMilestone = useMemo(
    () => getNextMilestone(state),
    [state]
  )

  return {
    milestones,
    completionCount,
    completionPercent,
    nextMilestone,
    refresh,
    updateStatus,
    getMilestoneStatus,
  }
}
