export type Purpose =
  | 'investigation'
  | 't&s'
  | 'benchmarking'
  | 'release_notes'
  | 'compliance';
export type RetentionTier = 'short' | 'standard';
export type TargetExtraction =
  | 'license'
  | 'version'
  | 'cve'
  | 'owner'
  | 'policy';
export type Focus = 'failures' | 'changelog' | 'compliance';

export interface ProvenanceMetadata {
  requestId: string;
  modelId: string;
  modelCheckpoint: string;
  promptHash: string;
  parameters: Record<string, unknown>;
  policyTags: string[];
  timestamp: string;
}

export interface UsageMetrics {
  characters: number;
  tokens?: number;
  costUsd: number;
  latencyMs: number;
}

export interface DocFragment {
  id: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
  language?: string;
  text: string;
  metadata: Record<string, unknown>;
}

export interface ExtractionFinding {
  id: string;
  label: string;
  value: string;
  confidence: number;
  severity?: 'info' | 'warn' | 'critical';
  qualitySignals: Record<string, unknown>;
  fragmentId?: string;
}

export interface PolicySignal {
  id: string;
  purpose: Purpose;
  retention: RetentionTier;
  classification: string;
  value: string;
  issuedAt: string;
  fragmentId?: string;
  qualitySignals?: Record<string, number>;
}

export interface SummaryResponse {
  id: string;
  text: string;
  focus: Focus;
  highlights: string[];
  qualitySignals: Record<string, unknown>;
}

export interface DoclingResponse<T> {
  requestId: string;
  tenantId: string;
  provenance: ProvenanceMetadata;
  usage: UsageMetrics;
  purpose: Purpose;
  retention: RetentionTier;
  result: T;
  policySignals: PolicySignal[];
}

export interface ParseRequestBody {
  requestId: string;
  tenantId: string;
  purpose: Purpose;
  retention: RetentionTier;
  contentType: string;
  hints?: string[];
  uri?: string;
  bytes?: string;
}

export interface ParseResponseBody
  extends DoclingResponse<{ fragments: DocFragment[] }> {}

export interface SummarizeRequestBody {
  requestId: string;
  tenantId: string;
  purpose: Purpose;
  retention: RetentionTier;
  text: string;
  focus: Focus;
  maxTokens?: number;
  relatedFragmentIds?: string[];
}

export interface SummarizeResponseBody
  extends DoclingResponse<SummaryResponse> {}

export interface ExtractRequestBody {
  requestId: string;
  tenantId: string;
  purpose: Purpose;
  retention: RetentionTier;
  text?: string;
  bytes?: string;
  targets: TargetExtraction[];
  fragmentIds?: string[];
}

export interface ExtractResponseBody
  extends DoclingResponse<{ findings: ExtractionFinding[] }> {}
