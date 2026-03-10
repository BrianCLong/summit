export interface AgentTrace {
  traceId: string;
  agentId: string;
  taskType: string;
  startedAt: string;
  completedAt?: string;
  status: 'started' | 'succeeded' | 'failed';
}

export function createTrace(
  input: Omit<AgentTrace, 'startedAt' | 'status'>,
): AgentTrace {
  return {
    ...input,
    startedAt: new Date().toISOString(),
    status: 'started',
  };
}
