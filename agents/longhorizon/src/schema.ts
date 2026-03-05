import { z } from 'zod';

export const PRChainStepSchema = z.object({
  step: z.number().int(),
  thought: z.string(),
  action: z.string(),
  observation: z.string(),
});

export const PRChainSchema = z.object({
  id: z.string(),
  goal: z.string(),
  steps: z.array(PRChainStepSchema),
  verdict: z.enum(['success', 'failure', 'partial']),
  metadata: z.record(z.any()).optional(),
});

export type PRChain = z.infer<typeof PRChainSchema>;
export type PRChainStep = z.infer<typeof PRChainStepSchema>;
