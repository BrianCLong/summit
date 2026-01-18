export type StructuredClaim = Record<string, unknown>;

export interface EvidenceArtifact {
  id: string;
  kind:
    | 'execution-log'
    | 'test-result'
    | 'policy-evaluation'
    | 'counterexample'
    | 'provenance'
    | 'trace'
    | 'note';
  description: string;
  uri?: string;
  sha256?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface LaneResult {
  laneId: string;
  finalAnswer: string;
  structuredClaims: StructuredClaim;
  evidenceArtifacts: EvidenceArtifact[];
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface ReasoningContext {
  prompt: string;
  input: Record<string, unknown>;
  policyContext?: Record<string, unknown>;
  budget?: {
    maxTokens?: number;
    maxMillis?: number;
  };
  requiredAssurance?: 'low' | 'medium' | 'high';
  taskClass?: string;
  model?: {
    id: string;
    tier?: 'cheap' | 'balanced' | 'strong';
  };
}

export interface LaneRuntime {
  callModel?: (request: {
    prompt: string;
    input: Record<string, unknown>;
    lane: string;
    model?: ReasoningContext['model'];
  }) => Promise<{ text: string; structuredClaims?: StructuredClaim }>;
  executeProgram?: (request: {
    code: string;
    input: Record<string, unknown>;
  }) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  evaluatePolicy?: (request: {
    policyId: string;
    input: Record<string, unknown>;
  }) => Promise<{
    allowed: boolean;
    diagnostics: Record<string, unknown>;
  }>;
  now?: () => string;
}

export interface ReasoningLane {
  id: string;
  label: string;
  description?: string;
  run: (context: ReasoningContext, runtime: LaneRuntime) => Promise<LaneResult>;
}

export interface AggregationDecision {
  selectedLaneId: string;
  finalAnswer: string;
  scoreByLane: Record<string, number>;
  disagreement: boolean;
  rationale: string;
}

export interface Aggregator {
  aggregate: (results: LaneResult[]) => AggregationDecision;
}

export interface Adjudicator {
  adjudicate: (
    context: ReasoningContext,
    results: LaneResult[],
    runtime: LaneRuntime,
  ) => Promise<LaneResult[]>;
}

export interface PolicyGate {
  requiredLanes: (context: ReasoningContext) => string[];
}

export interface ProvenanceEvent {
  type:
    | 'run-start'
    | 'lane-result'
    | 'aggregation'
    | 'adjudication'
    | 'escalation';
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ProvenanceRecorder {
  record: (event: ProvenanceEvent) => void;
  snapshot?: () => ProvenanceEvent[];
}

export interface ReasoningRunResult {
  finalAnswer: string;
  decision: AggregationDecision;
  laneResults: LaneResult[];
  evidenceBundle: EvidenceArtifact[];
  provenance?: ProvenanceEvent[];
}

export interface EvidenceScoringWeights {
  base: number;
  executionLog: number;
  testResult: number;
  policyEvaluation: number;
  counterexample: number;
  provenance: number;
  trace: number;
  note: number;
}
