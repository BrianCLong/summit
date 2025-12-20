export type StatusLevel = 'green' | 'yellow' | 'red'

export interface EvidenceLink {
  label: string
  url: string
}

export interface ChecklistItem {
  id: string
  name: string
  status: StatusLevel
  evidence: EvidenceLink
}

export interface StatusResponse {
  system: string
  status: StatusLevel
  summary: string
  updatedAt: string
  evidence: EvidenceLink[]
  checklist?: ChecklistItem[]
  signals?: Array<{
    label: string
    status: StatusLevel
    detail?: string
    link?: string
  }>
}

export type StatusKey =
  | 'governance'
  | 'agents'
  | 'ci'
  | 'releases'
  | 'zk'
  | 'streaming'
  | 'ga'

export interface StatusState {
  statuses: Partial<Record<StatusKey, StatusResponse>>
  loading: boolean
  lastUpdated?: string
  error?: string
  banner: {
    level: StatusLevel
    headline: string
    detail: string
  }
}

export type StatusAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; key: StatusKey; payload: StatusResponse }
  | { type: 'FETCH_FAILURE'; key: StatusKey; error: string }
  | { type: 'RESET_ERRORS' }
