export interface JudgeResult {
  score: number;
  reason: string;
  metadata?: Record<string, any>;
  context?: string[]; // Retrieved memories
}

export interface Judge {
  name: string;
  evaluate(input: string, context?: any): Promise<JudgeResult>;
}

export interface AlignmentConfig {
  judgeName: string;
  feedbackPath: string;
  outputPath: string;
  memoryConfig?: {
    maxSemanticEntries: number;
    maxEpisodicEntries: number;
  };
}
