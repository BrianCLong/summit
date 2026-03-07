export type AgentRunMode = 'plan_only' | 'execute';

export interface AgentSession {
  sessionId: string;
  runId: string;
  mode: AgentRunMode;
  createdAtEpochMs: number;
}
