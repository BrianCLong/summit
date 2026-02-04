// @ts-nocheck
import { z } from 'zod';

// --- Zod Schemas ---

export const WorkflowDefinitionSchema = z.object({
  version: z.string(),
  env: z.string(),
  retentionClass: z.string(),
  costCenter: z.string(),
  inputSchema: z.string(), // JSON string
  outputSchema: z.string().optional(), // JSON string
  body: z.string(),
});

export const StartRunSchema = z.object({
  workflowId: z.string(),
  input: z.string(), // JSON string
  env: z.string().optional(),
  reasoningBudget: z
    .object({
      thinkMode: z.enum(['off', 'normal', 'heavy']).optional(),
      thinkingBudget: z.number().int().nonnegative().optional(),
      maxTokens: z.number().int().nonnegative().optional(),
      toolBudget: z.number().int().nonnegative().optional(),
      timeBudgetMs: z.number().int().nonnegative().optional(),
      redactionPolicy: z.enum(['none', 'summary_only']).optional(),
    })
    .optional(),
});

export const ApprovalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  rationale: z.string(),
  stepId: z.string().optional(),
});

// --- Types ---

export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;
export type StartRunInput = z.infer<typeof StartRunSchema>;
export type ApprovalInput = z.infer<typeof ApprovalSchema>;

// Re-export existing types (or interfaces matching the graph)
export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  version: string;
  env: string;
  retentionClass: string;
  costCenter: string;
  inputSchema: string;
  outputSchema?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  tenantId: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'NEEDS_APPROVAL';
  startedAt?: string;
  completedAt?: string;
  input: string;
  output?: string;
  receipts: Receipt[];
}

export interface Receipt {
  id: string;
  timestamp: string;
  digest: string;
  signature: string;
  kid: string;
}

export interface RunEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: string;
}
