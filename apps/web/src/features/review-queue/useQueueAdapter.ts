import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  defaultQueueFilters,
  type QueueAction,
  type QueueActPayload,
  type QueueActResult,
  type QueueAdapter,
  type QueueDecision,
  type QueueFilters,
  type QueueItem,
  type QueuePriority,
  type QueueStatus,
  type QueueItemType,
} from './types'

const STORAGE_KEYS = {
  decisions: 'reviewQueue.decisions.v1',
  items: 'reviewQueue.items.v1',
}

const baseMockItems: QueueItem[] = [
  {
    id: 'rq-1001',
    title: 'Entity merge review: K. Santiago ↔ K. Santos',
    type: 'entity-diff',
    priority: 'critical',
    assignee: 'Dana Analyst',
    source: 'Entity Resolver',
    context: 'High-similarity merge flagged for manual review',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    tags: ['entity', 'merge'],
    preview: {
      entityDiff: {
        before: 'Name: K. Santiago\nEmail: ksanti@example.com\nIP: 10.0.0.12',
        after: 'Name: K. Santos\nEmail: ksantos@example.com\nIP: 10.0.0.12',
        highlights: ['Name mismatch', 'Email mismatch', 'Shared IP'],
      },
    },
  },
  {
    id: 'rq-1002',
    title: 'Evidence snippet: anomalous fund transfer',
    type: 'evidence',
    priority: 'high',
    assignee: 'Unassigned',
    source: 'Signals',
    context: 'Transfer exceeds peer baseline by 4.3x',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    tags: ['finance', 'anomaly'],
    preview: {
      snippet:
        'Wire transfer of $420,000 from account 4411 → 8841 within 8 minutes of credential reset.',
    },
  },
  {
    id: 'rq-1003',
    title: 'Policy warning: export control conflict',
    type: 'policy',
    priority: 'medium',
    assignee: 'Alex Ops',
    source: 'OPA',
    context: 'Request routes restricted dataset to non-cleared tenant',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    tags: ['policy', 'export'],
    preview: {
      policyWarning:
        'Rule EU-482 triggered: cross-border movement of controlled intel.',
    },
  },
  {
    id: 'rq-1004',
    title: 'Resolved sample: duplicate device fingerprint',
    type: 'evidence',
    priority: 'low',
    assignee: 'Dana Analyst',
    source: 'DeviceGraph',
    context: 'Auto-resolved yesterday',
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    lastDecisionAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    preview: {
      snippet:
        'Fingerprint fpr-9921 confirmed benign after 24h cooling period.',
    },
  },
]

const statusFromAction: Record<QueueAction, QueueStatus> = {
  approve: 'approved',
  reject: 'rejected',
  defer: 'deferred',
}

const resolveStatusFilter = (status: QueueFilters['status']) => {
  if (status === 'all') return undefined
  if (status === 'open') return ['open'] as QueueStatus[]
  return ['approved', 'rejected', 'deferred'] as QueueStatus[]
}

const hydrateItems = (persisted?: QueueItem[]) => {
  if (persisted && persisted.length) return persisted
  return baseMockItems
}

const hydrateDecisions = () => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEYS.decisions)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QueueDecision[]
  } catch (error) {
    console.warn('Failed to parse queue decisions', error)
    return []
  }
}

export function useQueueAdapter(): QueueAdapter {
  const [items, setItems] = useState<QueueItem[]>(() => {
    if (typeof window === 'undefined') return baseMockItems
    const raw = window.localStorage.getItem(STORAGE_KEYS.items)
    if (!raw) return baseMockItems
    try {
      return hydrateItems(JSON.parse(raw) as QueueItem[])
    } catch (error) {
      console.warn('Failed to parse queue items', error)
      return baseMockItems
    }
  })

  const [decisions, setDecisions] = useState<QueueDecision[]>(() =>
    hydrateDecisions()
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      STORAGE_KEYS.decisions,
      JSON.stringify(decisions)
    )
  }, [decisions])

  const list = useCallback(
    async (filters: QueueFilters = defaultQueueFilters) => {
      const resolvedStatus = resolveStatusFilter(filters.status)
      return items.filter(item => {
        const statusMatch = resolvedStatus
          ? resolvedStatus.includes(item.status)
          : true
        const typeMatch = filters.type === 'all' || item.type === filters.type
        const priorityMatch =
          filters.priority === 'all' || item.priority === filters.priority
        const assigneeMatch =
          filters.assignee === 'all' || item.assignee === filters.assignee

        return statusMatch && typeMatch && priorityMatch && assigneeMatch
      })
    },
    [items]
  )

  const get = useCallback(
    async (id: string) => items.find(item => item.id === id),
    [items]
  )

  const act = useCallback(
    async (
      id: string,
      action: QueueAction,
      payload: QueueActPayload = {}
    ): Promise<QueueActResult | undefined> => {
      const target = items.find(item => item.id === id)
      if (!target) return undefined

      const decision: QueueDecision = {
        id: `${id}-${Date.now()}`,
        itemId: id,
        action,
        reason: payload.reason,
        decidedAt: new Date().toISOString(),
        decidedBy: payload.decidedBy || 'analyst@example.com',
        metadata: {
          adapter: 'local-mock',
          version: '1.0.0',
        },
      }

      const nextStatus = statusFromAction[action]
      const updatedItem: QueueItem = {
        ...target,
        status: nextStatus,
        lastDecisionAt: decision.decidedAt,
      }

      setItems(prev => prev.map(item => (item.id === id ? updatedItem : item)))
      setDecisions(prev => [...prev, decision])

      return { item: updatedItem, decision }
    },
    [items]
  )

  const reset = useCallback(() => {
    setItems(baseMockItems)
    setDecisions([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.items)
      window.localStorage.removeItem(STORAGE_KEYS.decisions)
    }
  }, [])

  return useMemo(
    () => ({
      list,
      get,
      act,
      decisions,
      reset,
    }),
    [act, decisions, get, list, reset]
  )
}

export const queueEnums = {
  types: ['entity-diff', 'evidence', 'policy'] as QueueItemType[],
  priorities: ['critical', 'high', 'medium', 'low'] as QueuePriority[],
}
