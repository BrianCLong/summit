import { z } from 'zod';

export const proposalPatchSchema = z.object({
  op: z.enum(['set', 'remove', 'append', 'merge']),
  path: z.string(),
  value: z.any().optional(),
});

export const policyChangeProposalSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  policyTargets: z.array(z.string()).default([]),
  patches: z.array(proposalPatchSchema).default([]),
  metadata: z
    .object({
      author: z.string().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
    })
    .default({}),
});

export type PolicyChangeProposal = z.infer<typeof policyChangeProposalSchema>;
export type ProposalPatch = z.infer<typeof proposalPatchSchema>;
