export interface AgentContext {
  userId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}
