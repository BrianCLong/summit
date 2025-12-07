// apps/web/src/api/types.ts

// Common types for API responses
export interface ApiResponse<T> {
  data: T
  error?: {
    code: string
    message: string
  }
}

// Graph Core Types
export interface GraphEntity {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
  confidence: number
  importance: number
}

export interface GraphLink {
  id: string
  sourceId: string
  targetId: string
  type: string
  properties: Record<string, unknown>
  confidence: number
}

export interface GraphData {
  entities: GraphEntity[]
  links: GraphLink[]
}

// Analytics Types
export interface AnalyticsEvent {
  id: string
  type: string
  summary: string
  timestamp: string
  entityIds: string[]
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  metadata: Record<string, unknown>
}

export interface AnalyticsLocation {
  id: string
  label: string
  lat: number
  lon: number
  entityId?: string
  firstSeenAt?: string
  lastSeenAt?: string
  metadata: Record<string, unknown>
}

// Governance Types
export interface GovernanceLabel {
  entityId: string
  policy: string
  redactedFields: string[]
  accessLevel: string
}

// Case Management Types
export interface Case {
  id: string
  title: string
  description: string
  status: 'open' | 'investigating' | 'closed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  caseId: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  assignee?: string
  dueDate?: string
}

export interface Evidence {
  id: string
  caseId: string
  type: string
  content: string
  source: string
  timestamp: string
  confidence: number
}
