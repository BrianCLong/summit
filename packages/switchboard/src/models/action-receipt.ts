import { z } from 'zod';

export const ActionReceiptSchema = z.object({
  version: z.literal('1'),
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  actor: z.object({
    identity: z.string(),
    tenant: z.string(),
  }),
  tool: z.object({
    capability: z.string(),
    action: z.string(),
    inputs_digest: z.string(),
    outputs_digest: z.string().optional(),
  }),
  policy: z.object({
    decision: z.enum(['allow', 'deny']),
    reason: z.string().optional(),
    budget: z.object({
      allocated: z.number(),
      consumed: z.number(),
      currency: z.string().default('USD'),
    }).optional(),
  }),
  hash: z.string(),
});

export type ActionReceipt = z.infer<typeof ActionReceiptSchema>;
