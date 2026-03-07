export interface SpeculativeCapabilities {
  supportsParallelDraft: boolean;
  supportsTargetFeatures: boolean;
  supportsLosslessMode: boolean;
  maxDraftTokensPerBlock?: number;
}

export interface SpeculativeGenerateRequest {
  prompt: string;
  tenantId?: string;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface SpeculativeGenerateOptions {
  mode?: 'baseline' | 'speculative';
  algorithm?: string;
  evidenceId?: string;
  targetFeatureToken?: string;
}

export interface GenerationResult {
  text: string;
  tokensGenerated: number;
  latencyMs: number;
  acceptanceLength?: number;
  mode: 'baseline' | 'speculative';
  backend: string;
}

export interface SpeculativeAdapter {
  capabilities(): SpeculativeCapabilities;
  generate(
    request: SpeculativeGenerateRequest,
    options: SpeculativeGenerateOptions,
  ): Promise<GenerationResult>;
}
