// ─── Prompt Registry ────────────────────────────────────────────────────────

export type Registry = 'agentic-prompts' | 'claude' | 'jules';

export interface PromptEntry {
  registry: Registry;
  file: string;
  title: string;
  excerpt: string;
  /** relative path within the repo */
  path: string;
}

export interface PromptSearchResult {
  items: PromptEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── PR Artifacts ────────────────────────────────────────────────────────────

export type ArtifactStatus = 'superseded' | 'merged' | 'quarantined' | 'abandoned';

export interface ArtifactEntry {
  pr: number;
  concern: string;
  patch_hash: string;
  status: ArtifactStatus;
  timestamp: string;
  superseded_by?: number | string;
  message?: string;
  /** source filename */
  file: string;
}

export interface ArtifactListResult {
  items: ArtifactEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface BranchStat {
  name: string;
  type: 'feature' | 'fix' | 'claude' | 'other';
  remote: boolean;
}

export interface DashboardData {
  branches: {
    total: number;
    byType: Record<string, number>;
    list: BranchStat[];
  };
  tags: {
    total: number;
    list: string[];
  };
  artifacts: {
    total: number;
    byStatus: Record<ArtifactStatus, number>;
    recentConcerns: string[];
  };
  topFindings: Finding[];
  generatedAt: string;
}

export interface Finding {
  severity: 'error' | 'warning' | 'info';
  source: string;
  message: string;
}

// ─── Go/No-Go Release Gate ───────────────────────────────────────────────────

export type PolicyResult = 'pass' | 'fail' | 'warn' | 'unknown';

export interface PolicyCheck {
  name: string;
  file: string;
  result: PolicyResult;
  details: string;
}

export interface SbomEntry {
  file: string;
  exists: boolean;
  sizeBytes: number;
  mtime: string;
}

export interface EvidenceCheck {
  label: string;
  present: boolean;
  details: string;
}

export interface ProvenanceInfo {
  latestTag: string | null;
  latestCommit: string;
  commitMessage: string;
  author: string;
  date: string;
  signedCommits: number;
}

export interface GoNoGoData {
  verdict: 'GO' | 'NO-GO' | 'PENDING';
  provenance: ProvenanceInfo;
  policies: PolicyCheck[];
  sbom: SbomEntry[];
  evidence: EvidenceCheck[];
  generatedAt: string;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface MetricPoint {
  name: string;
  value: number;
  labels?: Record<string, string>;
  help: string;
}

// ─── API response wrapper ────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code: number;
}
