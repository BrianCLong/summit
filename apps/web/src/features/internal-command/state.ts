import { formatDistanceToNow } from 'date-fns'
import config from '@/config'
import type {
  StatusAction,
  StatusKey,
  StatusLevel,
  StatusResponse,
  StatusState,
} from './types'

export const statusEndpoints: Record<StatusKey, string> = {
  governance: `${config.apiBaseUrl}/internal/governance/status`,
  agents: `${config.apiBaseUrl}/internal/agents/status`,
  ci: `${config.apiBaseUrl}/internal/ci/status`,
  releases: `${config.apiBaseUrl}/internal/releases/status`,
  zk: `${config.apiBaseUrl}/internal/zk/status`,
  streaming: `${config.apiBaseUrl}/internal/streaming/status`,
  ga: `${config.apiBaseUrl}/internal/ga/status`,
}

const severityRank: Record<StatusLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
}

export const deriveChecklistStatus = (
  checklist: StatusResponse['checklist']
): StatusLevel => {
  if (!checklist || checklist.length === 0) return 'red'
  if (checklist.some(item => item.status === 'red')) return 'red'
  if (checklist.some(item => item.status === 'yellow')) return 'yellow'
  return 'green'
}

const normalizePayload = (
  key: StatusKey,
  payload?: Partial<StatusResponse>
): StatusResponse => {
  const fallback: StatusResponse = {
    system: key,
    status: 'red',
    summary: 'Status unavailable',
    updatedAt: new Date().toISOString(),
    evidence: [],
  }

  const merged: StatusResponse = {
    ...fallback,
    ...payload,
    status: payload?.status ?? fallback.status,
    evidence: payload?.evidence ?? fallback.evidence,
  }

  if (key === 'ga' && payload?.checklist) {
    merged.status = deriveChecklistStatus(payload.checklist)
  }

  return merged
}

const computeBanner = (
  statuses: Partial<Record<StatusKey, StatusResponse>>
): StatusState['banner'] => {
  const values = Object.values(statuses)
  if (!values.length) {
    return {
      level: 'red',
      headline: 'Status unavailable',
      detail: 'No telemetry returned; fail closed until refreshed.',
    }
  }

  const worst = values.reduce<StatusResponse | undefined>(
    (current, candidate) => {
      if (!current) return candidate
      return severityRank[candidate.status] > severityRank[current.status]
        ? candidate
        : current
    },
    undefined
  )

  if (!worst) {
    return {
      level: 'red',
      headline: 'Status unavailable',
      detail: 'No telemetry returned; fail closed until refreshed.',
    }
  }

  const detail = `Escalated from ${values.length} systems • Updated ${formatDistanceToNow(
    new Date(worst.updatedAt),
    {
      addSuffix: true,
    }
  )}`

  const headline =
    worst.status === 'red'
      ? 'Critical condition detected'
      : worst.status === 'yellow'
        ? 'At-risk signals detected'
        : 'Systems nominal'

  return {
    level: worst.status,
    headline,
    detail,
  }
}

export const initialState: StatusState = {
  statuses: {},
  loading: false,
  banner: {
    level: 'red',
    headline: 'Status unavailable',
    detail: 'Telemetry has not yet been retrieved.',
  },
}

export function statusReducer(
  state: StatusState,
  action: StatusAction
): StatusState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: undefined }
    case 'FETCH_SUCCESS': {
      const statuses = {
        ...state.statuses,
        [action.key]: normalizePayload(action.key, action.payload),
      }
      return {
        ...state,
        loading: false,
        statuses,
        lastUpdated: new Date().toISOString(),
        banner: computeBanner(statuses),
      }
    }
    case 'FETCH_FAILURE': {
      const statuses = {
        ...state.statuses,
        [action.key]: normalizePayload(action.key),
      }
      return {
        ...state,
        loading: false,
        error: action.error,
        statuses,
        banner: computeBanner(statuses),
      }
    }
    case 'RESET_ERRORS':
      return { ...state, error: undefined }
    default:
      return state
  }
}
