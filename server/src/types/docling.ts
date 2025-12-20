export type DocSourceType =
  | 'BUILD_LOG'
  | 'TEST_REPORT'
  | 'SBOM'
  | 'PR_DIFF'
  | 'COMPLIANCE_DOC'
  | 'MARKDOWN';

/**
 * Metadata associated with a document fragment.
 */
export interface DocFragmentMetadata extends Record<string, unknown> {
  finding?: Partial<DocFinding> & {
    value?: unknown;
    confidence?: unknown;
  };
}

/**
 * Represents a fragment of a document.
 */
export interface DocFragment {
  id: string;
  sha256: string;
  text: string;
  mimeType: string;
  metadata?: DocFragmentMetadata;
}

/**
 * Summary of a document's analysis.
 */
export interface DocSummary {
  id: string;
  text: string;
  focus: 'failures' | 'changelog' | 'compliance';
  highlights: string[];
  qualitySignals: Record<string, unknown>;
}

/**
 * A specific finding extracted from a document.
 */
export interface DocFinding {
  id: string;
  label: string;
  value: string;
  confidence: number;
  severity?: 'info' | 'warn' | 'critical';
  fragmentId?: string;
  metadata?: Record<string, unknown>;
  qualitySignals: Record<string, unknown>;
}

/**
 * A policy compliance signal derived from document analysis.
 */
export interface DocPolicySignal {
  id: string;
  classification: string;
  value: string;
  purpose: string;
  retention: string;
  fragmentId?: string;
  metadata?: Record<string, unknown>;
  qualitySignals?: Record<string, number>;
}

/**
 * Usage statistics for Docling processing.
 */
export interface DoclingUsage {
  characters: number;
  tokens?: number;
  costUsd: number;
  latencyMs: number;
}

/**
 * Base response structure for Docling API operations.
 */
export interface DoclingBaseResponse<T> {
  requestId: string;
  tenantId: string;
  purpose: string;
  retention: string;
  result: T;
  usage: DoclingUsage;
  policySignals: DocPolicySignal[];
}

export interface DoclingParseResponse
  extends DoclingBaseResponse<{ fragments: DocFragment[] }> {}

export interface DoclingSummarizeResponse
  extends DoclingBaseResponse<DocSummary> {}

export interface DoclingExtractResponse
  extends DoclingBaseResponse<{ findings: DocFinding[] }> {}

export interface SummarizeBuildFailureInput {
  tenantId: string;
  buildId: string;
  requestId: string;
  logText: string;
  artifactUri?: string;
  retention: 'short' | 'standard';
  purpose: string;
  maxTokens?: number;
}

export interface SummarizeBuildFailureResult {
  summary: DocSummary;
  fragments: DocFragment[];
  findings: DocFinding[];
  policySignals: DocPolicySignal[];
}

export interface ExtractLicensesInput {
  tenantId: string;
  requestId: string;
  text: string;
  retention: 'short' | 'standard';
  purpose: string;
  sourceType: DocSourceType;
  artifactUri?: string;
}

export interface ExtractLicensesResult {
  findings: DocFinding[];
  policySignals: DocPolicySignal[];
}

export interface ReleaseNotesInput {
  tenantId: string;
  requestId: string;
  purpose: string;
  retention: 'short' | 'standard';
  diffText: string;
  highlights?: string[];
}

export interface ReleaseNotesResult {
  summary: DocSummary;
}
