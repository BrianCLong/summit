import type { z } from 'zod';
import type { JsonValue } from './utils/stable-json.js';

export type RiskTier = 'low' | 'medium' | 'high';

export type ToolScope = string;

export type ToolSchema<TInput extends z.ZodTypeAny, TOutput> = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  riskTier: RiskTier;
  requiredScopes: ToolScope[];
  costHint: string;
  version: string;
  inputSchema: TInput;
  outputSchema: z.ZodType<TOutput>;
  inputJsonSchema: JsonValue;
  outputJsonSchema: JsonValue;
  aliases?: string[];
};

export type ToolIndexEntry = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  riskTier: RiskTier;
  requiredScopes: ToolScope[];
  costHint: string;
  version: string;
  schemaHash: string;
};

export type ToolExecutionContext = {
  sessionId: string;
  traceId: string;
  tenantId: string;
  actor: string;
  purpose: string;
  scopes: ToolScope[];
  breakGlass?: {
    reason: string;
    expiresAt: string;
  };
};

export type ToolExecutionResult<TOutput> = {
  ok: boolean;
  data?: TOutput;
  error?: string;
};

export type ToolDefinition<TInput extends z.ZodTypeAny, TOutput> = {
  schema: ToolSchema<TInput, TOutput>;
  handler: (input: z.infer<TInput>, context: ToolExecutionContext) => Promise<TOutput>;
};

export type SkillReference = {
  id: string;
  name: string;
  summary: string;
  toc: string[];
  filePath: string;
};

export type PolicyDecision = {
  decision: 'allow' | 'deny';
  reason: string;
  toolId: string;
  riskTier: RiskTier;
  scopesRequired: ToolScope[];
  scopesGranted: ToolScope[];
  breakGlassUsed: boolean;
};

export type EvidenceEvent = {
  timestamp: string;
  traceId: string;
  sessionId: string;
  type: 'request' | 'policy' | 'tool' | 'response' | 'error';
  detail: Record<string, unknown>;
};

export type EvidenceBundle = {
  manifest: {
    sessionId: string;
    generatedAt: string;
    toolSchemasHash: string;
    stepsHash: string;
    policyHash: string;
  };
  steps: EvidenceEvent[];
  toolSchemasUsed: ToolIndexEntry[];
  policyDecisions: PolicyDecision[];
  checksums: Record<string, string>;
};
