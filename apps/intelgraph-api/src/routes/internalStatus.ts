import type { Request, Response, NextFunction, RequestHandler } from 'express'

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

export interface StatusPayload {
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

type StatusMap = Record<string, StatusPayload>

const statusData: StatusMap = {
  governance: {
    system: 'Governance & Controls',
    status: 'green',
    summary: 'Policies enforced via OPA with daily attestations captured',
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        label: 'OPA bundle digest',
        url: 'https://evidence.internal/governance/opa-digest',
      },
      {
        label: 'Control attestations',
        url: 'https://evidence.internal/governance/attestations',
      },
    ],
    signals: [
      {
        label: 'OPA decision latency',
        status: 'green',
        detail: '<15ms p95',
      },
      {
        label: 'Denied evals last 24h',
        status: 'yellow',
        detail: '3 policy drifts auto-corrected',
      },
    ],
  },
  agents: {
    system: 'Agent Control',
    status: 'yellow',
    summary: 'One sandbox degraded; mitigation playbook activated',
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        label: 'Orchestrator logs',
        url: 'https://evidence.internal/agents/orchestrator-logs',
      },
      {
        label: 'Safety harness config',
        url: 'https://evidence.internal/agents/safety-harness',
      },
    ],
    signals: [
      {
        label: 'Exec backlog',
        status: 'yellow',
        detail: 'Queue depth 42 (threshold 40)',
      },
      {
        label: 'Canary actions',
        status: 'green',
        detail: 'Stable for 6h',
      },
    ],
  },
  ci: {
    system: 'CI Pipeline',
    status: 'green',
    summary: 'Latest commit fully validated with SLAs met',
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        label: 'PR quality gate',
        url: 'https://evidence.internal/ci/pr-quality-gate',
      },
      {
        label: 'Artifact checksums',
        url: 'https://evidence.internal/ci/artifacts',
      },
    ],
    signals: [
      {
        label: 'Build success rate',
        status: 'green',
        detail: '99.2% last 24h',
      },
      {
        label: 'Mean pipeline time',
        status: 'green',
        detail: '12m 04s',
      },
    ],
  },
  releases: {
    system: 'Release Train',
    status: 'green',
    summary: 'Release candidate promoted to staging with rollback ready',
    updatedAt: new Date().toISOString(),
    evidence: [
      { label: 'Staging deploy', url: 'https://evidence.internal/releases/staging' },
      { label: 'Rollback plan', url: 'https://evidence.internal/releases/rollback' },
    ],
    signals: [
      { label: 'Staging smoke', status: 'green', detail: 'All gates passed' },
      { label: 'Error budget', status: 'green', detail: '92% remaining' },
    ],
  },
  zk: {
    system: 'ZK Isolation',
    status: 'yellow',
    summary: 'Tenant ring-fencing intact; zkSNARK audit pending refresh',
    updatedAt: new Date().toISOString(),
    evidence: [
      { label: 'Isolation proofs', url: 'https://evidence.internal/zk/proofs' },
      { label: 'Audit trail', url: 'https://evidence.internal/zk/audit' },
    ],
    signals: [
      { label: 'Circuit latency', status: 'yellow', detail: 'p95 480ms (target 450ms)' },
      { label: 'Cross-tenant leakage', status: 'green', detail: '0 detected' },
    ],
  },
  streaming: {
    system: 'Streaming & Signals',
    status: 'green',
    summary: 'Kafka + Redpanda dual-path healthy; replay window intact',
    updatedAt: new Date().toISOString(),
    evidence: [
      { label: 'Lag report', url: 'https://evidence.internal/streaming/lag' },
      { label: 'Replay drills', url: 'https://evidence.internal/streaming/drills' },
    ],
    signals: [
      { label: 'Max consumer lag', status: 'green', detail: '218ms' },
      { label: 'Replay coverage', status: 'green', detail: '30d window validated' },
    ],
  },
  ga: {
    system: 'GA Readiness',
    status: 'yellow',
    summary: 'Two checklist items need final sign-off',
    updatedAt: new Date().toISOString(),
    evidence: [
      { label: 'GA checklist', url: 'https://evidence.internal/ga/checklist' },
      { label: 'Pen-test report', url: 'https://evidence.internal/ga/pentest' },
    ],
    checklist: [
      {
        id: 'perf-slos',
        name: 'Performance SLOs validated',
        status: 'green',
        evidence: { label: 'SLO workbook', url: 'https://evidence.internal/ga/slo' },
      },
      {
        id: 'sec-review',
        name: 'Security sign-off',
        status: 'yellow',
        evidence: { label: 'Findings tracker', url: 'https://evidence.internal/ga/sec' },
      },
      {
        id: 'dr-drill',
        name: 'DR runbook executed',
        status: 'green',
        evidence: { label: 'DR report', url: 'https://evidence.internal/ga/drill' },
      },
      {
        id: 'support',
        name: 'Support readiness',
        status: 'yellow',
        evidence: { label: 'L3 rotation schedule', url: 'https://evidence.internal/ga/support' },
      },
    ],
  },
}

type AuthenticatedRequest = Request & { auth?: unknown }

const requireInternalAuth: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required for internal status' })
  }
  return next()
}

const buildHandler = (key: string): RequestHandler => (req, res) => {
  const payload = statusData[key]
  if (!payload) {
    return res.status(404).json({ error: 'Status not found' })
  }
  res.json(payload)
}

export const registerInternalStatusRoutes = (app: any) => {
  app.get('/api/internal/governance/status', requireInternalAuth, buildHandler('governance'))
  app.get('/api/internal/agents/status', requireInternalAuth, buildHandler('agents'))
  app.get('/api/internal/ci/status', requireInternalAuth, buildHandler('ci'))
  app.get('/api/internal/releases/status', requireInternalAuth, buildHandler('releases'))
  app.get('/api/internal/zk/status', requireInternalAuth, buildHandler('zk'))
  app.get('/api/internal/streaming/status', requireInternalAuth, buildHandler('streaming'))
  app.get('/api/internal/ga/status', requireInternalAuth, buildHandler('ga'))
}

export type InternalStatusKey = keyof typeof statusData
