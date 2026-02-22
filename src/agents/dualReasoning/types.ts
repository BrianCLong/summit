export type KnowledgeDomain = 'cultural' | 'science' | 'spatial' | 'temporal' | 'logic' | 'unspecified';

export interface DualReasoningInput {
  instruction: string;
  domain?: KnowledgeDomain;
  tools?: string[];
  context?: any;
}

export interface DualReasoningConfig {
  enabled: boolean;
  maxIterations?: number;
  verifyDimensions?: string[];
  timeoutMs?: number;
}

export interface DualReasoningResult {
  skipped: boolean;
  reason?: string;
  evidenceId?: string;
  report?: any;
}

export interface PlanStep {
  domain: KnowledgeDomain;
  steps: string[];
}

export interface DraftOutput {
  output: string;
}

export interface VerifyOutput {
  issues: string[];
  dimensions: string[];
}

export interface RefineOutput {
  output: string;
}

export interface JudgeOutput {
  better: 'draft' | 'refine';
  rationale: string[];
}

export interface DualReasoningReport {
  plan: PlanStep;
  draft: DraftOutput;
  verify: VerifyOutput;
  refine: RefineOutput;
  judge: JudgeOutput;
}
