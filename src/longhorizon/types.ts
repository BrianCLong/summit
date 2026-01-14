export type PermissionTier = 'read' | 'write' | 'execute';

export interface RunBudgets {
  maxTokens: number;
  maxSeconds: number;
  maxToolCalls: number;
}

export interface EvaluationProfile {
  name: 'fast' | 'standard' | 'ga';
  commands: string[];
  targetedTests: string[];
}

export interface TaskStep {
  id: string;
  title: string;
  dependsOn: string[];
  role: 'planner' | 'implementer' | 'reviewer' | 'tester' | 'librarian';
}

export interface RunConfig {
  runId: string;
  tenantId: string;
  taskPrompt: string;
  allowedPaths: string[];
  steps: TaskStep[];
  budgets: RunBudgets;
  evaluationProfile: EvaluationProfile;
  islands: number;
  migrationInterval: number;
  candidateSeeds: CandidateSeed[];
}

export interface CandidateSeed {
  id: string;
  title: string;
  patch: string;
  metadata: CandidateMetadata;
}

export interface CandidateMetadata {
  diffSize: number;
  risk: number;
  testImpact: number;
  locality: string;
}

export interface PatchRecord {
  id: string;
  diff: string;
  filesTouched: string[];
}

export interface EvaluationRecord {
  id: string;
  score: number;
  passed: boolean;
  runtimeMs: number;
  coverageDelta: number;
  policyViolations: string[];
  riskFlags: string[];
  commandResults: CommandResult[];
  reviewConsensus: boolean;
  deterministicReplay: string;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  durationMs: number;
  output: string;
}

export interface CandidateRecord {
  id: string;
  title: string;
  patch: PatchRecord;
  metadata: CandidateMetadata;
  evaluation?: EvaluationRecord;
  status: 'queued' | 'evaluated' | 'archived' | 'rejected';
  noveltyScore: number;
}

export interface MemoryNode {
  id: string;
  scope: 'working' | 'episodic' | 'semantic';
  tenantId: string;
  runId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  redacted: boolean;
}

export interface RunRecord {
  id: string;
  tenantId: string;
  startedAt: string;
  completedAt?: string;
  steps: string[];
  memoryNodes: string[];
  candidates: string[];
  evaluations: string[];
  patches: string[];
}
