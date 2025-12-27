import { z } from 'zod';

export const SharedStateSchema = z.object({
  runId: z.string().uuid(),
  caseId: z.string(),
  phase: z.enum(['ingest', 'analyze', 'simulate', 'report']),
  budgetUsed: z.number().min(0),
  warnings: z.array(z.string()),
  activeTool: z.string().optional(),
  policyBasis: z.string().optional(),
});

export type SharedState = z.infer<typeof SharedStateSchema>;

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error';

export type AgentEvent =
  | { type: 'tool:start'; tool: string; args: unknown; t?: number }
  | { type: 'tool:end'; tool: string; result: unknown; t?: number }
  | { type: 'status'; value: AgentStatus; t?: number }
  | { type: 'delta'; path: string; value: unknown; t?: number }
  | {
      type: 'message';
      role: 'user' | 'agent' | 'tool';
      content: string;
      t?: number;
    }
  | { type: 'error'; message: string; t?: number };

export type AgentMessage = {
  role: 'user' | 'agent' | 'tool';
  content: string;
};

export type AgUiEnvelope<TShared> =
  | { type: 'thread'; id: string }
  | { type: 'state'; value: TShared }
  | AgentEvent;
