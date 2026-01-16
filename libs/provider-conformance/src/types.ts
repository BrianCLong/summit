export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'azure_openai'
  | 'bedrock'
  | 'vertex';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown> | string;
}

export interface NormalizedRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface NormalizedResponse {
  status: number;
  headers: Record<string, string>;
  durationMs: number;
  text?: string;
  json?: unknown;
  toolCalls?: ToolCall[];
  streaming?: boolean;
  raw?: unknown;
}

export interface RateLimitSignals {
  detected: boolean;
  status?: number;
  limit?: string;
  remaining?: string;
  reset?: string;
}

export interface MaxTokensProbe {
  maxTokens: number;
  expectedWordCount: number;
  observedWordCount: number;
  truncated: boolean;
}

export interface Capabilities {
  toolCalls: boolean;
  jsonMode: boolean;
  streaming: boolean;
  maxTokensProbe?: MaxTokensProbe;
  rateLimit?: RateLimitSignals;
}

export interface ContractResult {
  id: string;
  passed: boolean;
  details?: string;
  capabilities?: Partial<Capabilities>;
  metadata?: Record<string, unknown>;
}

export interface ProviderAdapter {
  id: ProviderId;
  run(request: NormalizedRequest): Promise<NormalizedResponse>;
  supports?: Partial<Capabilities>;
}

export interface ProviderConfig {
  id: ProviderId;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  model?: string;
  region?: string;
  projectId?: string;
}

export interface ProviderReport {
  id: ProviderId;
  configured: boolean;
  skippedReason?: string;
  capabilities: Capabilities;
  contracts: ContractResult[];
}

export interface ConformanceReport {
  runId: string;
  timestamp: string;
  providers: ProviderReport[];
}

export interface ContractContext {
  runId: string;
  outputDir: string;
  rawLogDir: string;
  promptHash: (value: string) => string;
}
