export type ObservationKind = 'tool_output' | 'environment' | 'message' | 'unknown';

export interface TurnMeta {
  timestamp?: string;
  status?: 'success' | 'failed' | 'no-progress' | 'running';
  costUsd?: number;
  turnId?: string;
  runId?: string;
  agentId?: string;
  taskId?: string;
  turnIndex?: number;
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
  summaryMaxTokens?: number;
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
  maskedObservationTokens: number;
  summaryCalls: number;
  summaryTokens: number;
  contextTokensIn: number;
  contextTokensOut: number;
  contextTokensBudget?: number;
  estimatedCostUsd?: number;
  turnCountSinceLastSummary: number;
  stopReasons: string[];
  shouldHalt: boolean;
  runningSummary?: string;
}

export interface ContextPersistence {
  persist(turn: AgentTurn): Promise<void> | void;
}

export interface SummarizerInput {
  turns: AgentTurn[];
  maxTokens: number;
}

export type Summarizer = (input: SummarizerInput) => Promise<string> | string;

export interface ContextManager {
  ingestTurn(turn: AgentTurn): Promise<void>;
  buildPromptContext(options: PromptContextOptions): Promise<PromptContextResult>;
}
