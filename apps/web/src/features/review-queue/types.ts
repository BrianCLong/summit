export type QueueAction = 'approve' | 'reject' | 'defer'

export type QueueStatus = 'open' | 'approved' | 'rejected' | 'deferred'

export type QueuePriority = 'critical' | 'high' | 'medium' | 'low'

export type QueueItemType = 'entity-diff' | 'evidence' | 'policy'

export interface QueueItemPreview {
  snippet?: string
  entityDiff?: {
    before: string
    after: string
    highlights: string[]
  }
  policyWarning?: string
}

export interface QueueItem {
  id: string
  title: string
  type: QueueItemType
  priority: QueuePriority
  assignee: string
  source: string
  context: string
  status: QueueStatus
  createdAt: string
  tags?: string[]
  preview: QueueItemPreview
  lastDecisionAt?: string
}

export interface QueueDecision {
  id: string
  itemId: string
  action: QueueAction
  reason?: string
  decidedAt: string
  decidedBy: string
  metadata: {
    adapter: string
    version: string
  }
}

export interface QueueFilters {
  type: QueueItemType | 'all'
  priority: QueuePriority | 'all'
  assignee: string | 'all'
  status: 'open' | 'resolved' | 'all'
}

export interface QueueActPayload {
  reason?: string
  decidedBy?: string
}

export interface QueueActResult {
  item: QueueItem
  decision: QueueDecision
}

export interface QueueAdapter {
  list: (filters?: QueueFilters) => Promise<QueueItem[]>
  get: (id: string) => Promise<QueueItem | undefined>
  act: (
    id: string,
    action: QueueAction,
    payload?: QueueActPayload
  ) => Promise<QueueActResult | undefined>
  decisions: QueueDecision[]
  reset?: () => void
}

export const defaultQueueFilters: QueueFilters = {
  type: 'all',
  priority: 'all',
  assignee: 'all',
  status: 'open',
}
