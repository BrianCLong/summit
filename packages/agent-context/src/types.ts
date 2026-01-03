export type ObservationKind = 'tool_output' | 'environment' | 'message' | 'unknown';

export interface TurnMeta {
  timestamp?: string;
  status?: 'success' | 'failed' | 'no-progress' | 'running';
  costUsd?: number;
  [key: string]: unknown;
}

export interface AgentTurn {
  reasoning: string;
  action?: string;
  observation?: {
    content: string;
    type?: ObservationKind;
  };
  meta?: TurnMeta;
}

export interface PromptContextOptions {
  tokenBudget: number;
  reservedForResponse?: number;
  maxContextPct?: number;
  strategy?: 'masking' | 'summarization' | 'hybrid' | 'raw';
  agentId?: string;
  taskId?: string;
  maxTurns?: number;
  maxCostUsd?: number;
  summarizationTurnThreshold?: number;
  summarizationTokenThreshold?: number;
  maskingWindow?: number;
  plateauWindow?: number;
}

export interface PromptContextResult {
  messages: Array<{ role: string; content: string }>;
  diagnostics: ContextDiagnostics;
}

export interface ContextDiagnostics {
  strategy: string;
  totalTurns: number;
  turnsConsidered: number;
  maskedObservations: number;
  summaryCalls: number;
  summaryTokens: number;
  contextTokensIn: number;
  contextTokensOut: number;
  estimatedCostUsd?: number;
  turnCountSinceLastSummary: number;
  stopReasons: string[];
  runningSummary?: string;
}

export interface ContextPersistence {
  persist(turn: AgentTurn): Promise<void> | void;
}

export interface ContextManager {
  ingestTurn(turn: AgentTurn): Promise<void>;
  buildPromptContext(options: PromptContextOptions): Promise<PromptContextResult>;
}
