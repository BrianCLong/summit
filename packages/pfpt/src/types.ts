export type RiskLevel = 'low' | 'medium' | 'high';

export interface PromptSegment {
  role?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export type PromptInput = string | PromptSegment | PromptSegment[] | Record<string, unknown>;

export interface RedactedSpan {
  label: string;
  hash: string;
  replacement: string;
  occurrence: number;
}

export interface RiskAnnotation {
  level: RiskLevel;
  code: string;
  message: string;
}

export interface DiffChange {
  type: 'equal' | 'add' | 'remove';
  value: string;
}

export interface DiffSummary {
  totalChanges: number;
  semanticChanges: number;
  riskLevel: RiskLevel;
  annotations: RiskAnnotation[];
}

export interface DiffResult {
  sanitizedPrevious: string;
  sanitizedNext: string;
  changes: DiffChange[];
  redactions: RedactedSpan[];
  summary: DiffSummary;
}

export interface RedactionOptions {
  hashSalt?: string;
  additionalPatterns?: Array<{ label: string; regex: RegExp }>;
}

export interface DiffOptions extends RedactionOptions {
  treatNewlinesAsTokens?: boolean;
}
