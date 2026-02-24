// src/agents/longhorizon/schema/validate.ts
import { z } from 'zod';
import { PRChainRecord } from './pr_chain';

export const PRCommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  files_changed: z.array(z.object({
    path: z.string(),
    additions: z.number(),
    deletions: z.number(),
  })),
});

export const PRChainRecordSchema = z.object({
  evidence_id: z.string().startsWith('LH-').optional(),
  repo: z.object({
    name: z.string(),
    url: z.string().url().optional(),
  }),
  objective: z.string(),
  prs: z.array(z.object({
    pr_number: z.number().optional(),
    title: z.string(),
    body: z.string().optional(),
    commits: z.array(PRCommitSchema),
    bugfix: z.boolean().optional(),
  })),
  metadata: z.record(z.any()).optional(),
});

export function validatePRChain(data: unknown): PRChainRecord {
  return PRChainRecordSchema.parse(data) as PRChainRecord;
}
