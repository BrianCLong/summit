// PR Triage Workspace – type definitions
// Intentionally self-contained so this feature can be extracted later.

export type PRTriageStatus =
  | 'merge-ready'
  | 'conflict'
  | 'needs-owner-review'
  | 'blocked-on-governance'

export type PRPriority = 'critical' | 'high' | 'medium' | 'low'

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

// ── Diff preview ────────────────────────────────────────────────────────────

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  /** Unified-diff excerpt (first ~20 hunks). */
  patch: string
}

// ── Risk checklist ───────────────────────────────────────────────────────────

export type RiskCheckId =
  | 'policy-violation'
  | 'missing-timestamps'
  | 'missing-provenance'
  | 'governance-gate-blocked'
  | 'no-owner-approval'
  | 'stale-review'
  | 'breaking-change'

export interface RiskCheckItem {
  id: RiskCheckId
  label: string
  /** Populated when the check fails. */
  detail?: string
  passed: boolean
  riskLevel: RiskLevel
}

// ── Branch convergence ───────────────────────────────────────────────────────

export interface BranchConvergenceInfo {
  /** Does this PR merge cleanly against main right now? */
  mergesCleanly: boolean
  /** Number of commits behind main. */
  behindByCommits: number
  /** Branches that would become fully superseded if this PR merges. */
  deprecatedBranches: string[]
  /** Last time convergence was computed (ISO 8601). */
  computedAt: string
}

// ── Core PR item ─────────────────────────────────────────────────────────────

export interface PRItem {
  id: string
  number: number
  title: string
  author: string
  /** Target branch (usually 'main'). */
  baseBranch: string
  /** Source branch. */
  headBranch: string
  status: PRTriageStatus
  priority: PRPriority
  /** ISO 8601 */
  createdAt: string
  /** ISO 8601 – last push or force-push to the head branch */
  updatedAt: string
  /** Optional GitHub-style assignee. */
  assignee?: string
  labels: string[]
  riskChecks: RiskCheckItem[]
  diffFiles: DiffFile[]
  convergence: BranchConvergenceInfo
  /** Shallow body (first paragraph of PR description) */
  description: string
}

// ── Queue filters ─────────────────────────────────────────────────────────────

export interface PRTriageFilters {
  status: PRTriageStatus | 'all'
  priority: PRPriority | 'all'
  assignee: string
}

export const defaultPRTriageFilters: PRTriageFilters = {
  status: 'all',
  priority: 'all',
  assignee: '',
}

// ── Adapter interface ─────────────────────────────────────────────────────────

export type TriageAction = 'approve' | 'request-changes' | 'assign' | 'defer'

export interface TriageDecision {
  id: string
  prId: string
  action: TriageAction
  comment?: string
  assignedTo?: string
  decidedAt: string
  decidedBy: string
}

export interface PRTriageAdapter {
  list: (filters?: PRTriageFilters) => Promise<PRItem[]>
  get: (id: string) => Promise<PRItem | undefined>
  act: (id: string, action: TriageAction, opts?: { comment?: string; assignedTo?: string }) => Promise<void>
  decisions: TriageDecision[]
  reset: () => void
}
