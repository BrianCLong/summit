export type ExportFormat = 'pdf' | 'zip'

export interface ExportOptions {
  includeTimeline: boolean
  includeGraphSnapshot: boolean
  includeSources: boolean
}

export interface ExportJobPayload {
  format: ExportFormat
  options: ExportOptions
  idempotencyKey: string
}

export type ExportJobLifecycle =
  | 'idle'
  | 'creating'
  | 'in_progress'
  | 'ready'
  | 'downloading'
  | 'complete'
  | 'failed'
  | 'canceled'

export interface ExportJobState {
  jobId: string
  tenantId: string
  caseId: string
  paramsHash: string
  idempotencyKey: string
  status: ExportJobLifecycle
  progress: number
  downloadUrl?: string
  error?: string
  startedAt: string
  updatedAt: string
}

export interface ExportJobStatusResponse {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled'
  progress: number
  downloadUrl?: string
  updatedAt?: string
  startedAt?: string
  error?: string
}
