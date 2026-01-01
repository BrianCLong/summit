export type ContextSegmentId = string;

export interface ContextSegmentMetadata {
  id: ContextSegmentId;
  source: string;
  createdAt: Date;
  labels: string[];
}

export interface TrustWeight {
  value: number;
  rationale?: string;
}

export interface Invariant {
  id: string;
  description: string;
  validate(payload: unknown): boolean;
}

export interface ContextSegment {
  metadata: ContextSegmentMetadata;
  content: unknown;
  trustWeight: TrustWeight;
  invariants: Invariant[];
}

export interface AssembledContext {
  id: string;
  segments: ContextSegment[];
  encoded: unknown;
}

export interface ModelExecutionRequest {
  context: AssembledContext;
  modelId: string;
  input: unknown;
}

export interface ModelExecutionResponse {
  requestId: string;
  modelId: string;
  output: unknown;
  rawTrace?: unknown;
}

export interface ModelExecutor {
  execute(request: ModelExecutionRequest): Promise<ModelExecutionResponse>;
}
