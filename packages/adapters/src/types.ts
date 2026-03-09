export interface AgentTask {
  taskId: string;
  instruction: string;
  context?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface AgentResult {
  taskId: string;
  output: string;
  tokensUsed?: number;
  durationMs: number;
}

export interface IAgentAdapter {
  name: string;
  invoke(task: AgentTask): Promise<AgentResult>;
  healthCheck(): Promise<boolean>;
}
