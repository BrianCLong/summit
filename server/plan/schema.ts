import { z } from 'zod';
export const Task = z.object({
  id: z.string(),
  kind: z.enum(['plan', 'impl', 'test', 'review', 'docs']),
  budgetUSD: z.number().min(0),
  deps: z.array(z.string()).default([]),
});
export const Plan = z.object({ version: z.string(), tasks: z.array(Task) });
export type Plan = z.infer<typeof Plan>;
