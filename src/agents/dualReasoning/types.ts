export interface DualReasoningInput {
  instruction: string;
  domain?: "cultural" | "science" | "spatial" | "temporal" | "logic";
  context?: Record<string, any>;
}

export interface DualReasoningConfig {
  enabled: boolean;
  verifyDimensions?: string[];
  maxIterations?: number;
}

export interface DualReasoningResult {
  skipped: boolean;
  reason?: string;
  evidenceId?: string;
  report?: any;
}
