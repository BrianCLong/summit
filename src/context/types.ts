export type ContextSegmentId = string;

export interface ContextSegmentMetadata {
  id: ContextSegmentId;
  source: string; // e.g. "tool:slack", "db:postgres://...", "user:prompt"
  createdAt: Date;
  labels: string[];
}

export interface TrustWeight {
  /** 0.0 = fully distrusted, 1.0 = fully trusted baseline */
  value: number;
  /** Optional explanation for audits and debuggability */
  rationale?: string;
}

/**
 * An invariant is a predicate that SHOULD hold for some payload.
 * This is intentionally abstract; concrete code can wrap functions,
 * schemas, or other validators.
 */
export interface Invariant {
  id: string;
  description: string;
  validate(payload: unknown): boolean;
}

export interface ContextSegment {
  metadata: ContextSegmentMetadata;
  content: unknown; // raw text, structured JSON, or a capsule payload
  trustWeight: TrustWeight;
  invariants: Invariant[];
}

export interface AssembledContext {
  id: string;
  segments: ContextSegment[];
  /**
   * Vendor/model-specific encoding of the context:
   * - prompt messages
   * - tool spec bundle
   * - system instructions
   *
   * Left open-ended to stay model-agnostic.
   */
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
