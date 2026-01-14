export type FunnelMilestoneId =
  | 'connect_data_source'
  | 'run_investigation'
  | 'review_alerts'
  | 'publish_report'

export type FunnelMilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'

export interface FunnelMilestone {
  id: FunnelMilestoneId
  title: string
  description: string
  route: string
  entryPoint: string
  requiredInputs: string
  successCriteria: string
  failureStates: string[]
}

export const funnelMilestones: FunnelMilestone[] = [
  {
    id: 'connect_data_source',
    title: 'Connect a data source',
    description: 'Bring in your first dataset to seed investigations.',
    route: '/data/sources',
    entryPoint: 'Navigation → Data Sources',
    requiredInputs: 'Connector credentials or a file upload.',
    successCriteria: 'A data source appears in the ingestion workflow.',
    failureStates: [
      'Missing credentials or permissions.',
      'Connector configuration is invalid.',
      'Backend ingestion service is unavailable.',
    ],
  },
  {
    id: 'run_investigation',
    title: 'Start an investigation',
    description: 'Open the graph workspace and confirm entities are visible.',
    route: '/explore',
    entryPoint: 'Home → Quick Actions → Start Investigation',
    requiredInputs: 'At least one entity in the graph workspace.',
    successCriteria: 'Entities render in the graph and filters respond.',
    failureStates: [
      'No entities are returned from the backend.',
      'Graph service responds with an error.',
      'Workspace permissions are missing.',
    ],
  },
  {
    id: 'review_alerts',
    title: 'Review incoming alerts',
    description: 'Confirm alert triage works before deeper analysis.',
    route: '/alerts',
    entryPoint: 'Navigation → Alerts',
    requiredInputs: 'Alert stream from connected data sources.',
    successCriteria: 'Alerts list renders with severity and status.',
    failureStates: [
      'Alert feed is unreachable.',
      'No alerts available for the current tenant.',
      'Alert status updates fail to persist.',
    ],
  },
  {
    id: 'publish_report',
    title: 'Publish the first report',
    description: 'Capture findings and share outcomes with stakeholders.',
    route: '/reports',
    entryPoint: 'Navigation → Reports',
    requiredInputs: 'Draft report content or attached snapshots.',
    successCriteria: 'A report appears in the report list with a status.',
    failureStates: [
      'Report service returns an error.',
      'No write permissions for reports.',
      'Export service is unavailable.',
    ],
  },
]

const storageKey = 'summit.first_run.funnel'

export type FunnelState = Record<FunnelMilestoneId, FunnelMilestoneStatus>

const defaultState: FunnelState = {
  connect_data_source: 'not_started',
  run_investigation: 'not_started',
  review_alerts: 'not_started',
  publish_report: 'not_started',
}

export const getStoredFunnelState = (): FunnelState => {
  if (typeof window === 'undefined') {
    return { ...defaultState }
  }

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) {
      return { ...defaultState }
    }
    const parsed = JSON.parse(stored) as Partial<FunnelState>
    return { ...defaultState, ...parsed }
  } catch (error) {
    console.error('Failed to read funnel state', error)
    return { ...defaultState }
  }
}

export const setStoredFunnelState = (state: FunnelState) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to persist funnel state', error)
  }
}

export const setMilestoneStatus = (
  milestoneId: FunnelMilestoneId,
  status: FunnelMilestoneStatus
): FunnelMilestoneStatus => {
  const currentState = getStoredFunnelState()
  if (currentState[milestoneId] === status) {
    return status
  }
  const nextState = { ...currentState, [milestoneId]: status }
  setStoredFunnelState(nextState)
  return status
}

export const getMilestoneStatus = (milestoneId: FunnelMilestoneId) => {
  return getStoredFunnelState()[milestoneId]
}

export const getNextMilestone = (state: FunnelState) => {
  return funnelMilestones.find(milestone => state[milestone.id] !== 'complete')
}
