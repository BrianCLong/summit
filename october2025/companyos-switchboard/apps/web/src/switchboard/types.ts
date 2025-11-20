import { z } from 'zod';

export type SwitchboardSource = 'client' | 'scheduler' | 'webhook' | 'system';
export type SwitchboardTarget = 'intelgraph' | 'companyos' | 'activities' | 'agent-gateway' | 'other';

export interface SwitchboardContext {
  requestId: string;
  source: SwitchboardSource;
  tenantId?: string;
  actor?: string;
  traceId?: string;
}

export interface SwitchboardRoute<I = any, O = any> {
  id: string;
  description: string;
  source: SwitchboardSource;
  targetService: SwitchboardTarget;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  handler: (payload: I, context: SwitchboardContext) => Promise<O>;
}
