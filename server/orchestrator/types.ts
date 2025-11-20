export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type RunType =
  | 'plan'
  | 'scaffold'
  | 'implement'
  | 'test'
  | 'review'
  | 'docs'
  | 'pipeline'
  | 'golden-path'
  | 'ci-build';

export interface RunMetadata {
  actor: string;
  tenantId?: string;
  gitCommit?: string;
  branch?: string;
  prNumber?: number;
  issueId?: string;
  sprintVersion?: string;
  [key: string]: any;
}

export interface Artifact {
  id: string;
  name: string;
  type: string; // e.g., 'log', 'binary', 'report', 'sbom'
  location: string; // URL or path
  hash?: string;
  metadata?: Record<string, any>;
}

export interface Run {
  id: string;
  type: RunType;
  status: RunStatus;
  idempotencyKey?: string;

  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Inputs & Context
  input: any;
  metadata: RunMetadata;

  // Outputs
  output?: any;
  error?: string;
  artifacts: Artifact[];
  evidenceIds: string[]; // IDs in IntelGraph

  // Hierarchy
  parentId?: string;
  childRunIds: string[];
}

export interface CreateRunRequest {
  type: RunType;
  input: any;
  metadata: RunMetadata;
  idempotencyKey?: string;
  parentId?: string;
}
