import { z } from 'zod';

const operationModeSchema = z.enum(['SIMULATION', 'DRY_RUN', 'ENFORCED']);
const actionTypeSchema = z.enum([
  'read',
  'write',
  'delete',
  'execute',
  'query',
  'pipeline:trigger',
  'config:modify',
  'user:impersonate',
  'export',
  'import',
]);

const authorizationStatusSchema = z.enum([
  'allowed',
  'denied',
  'requires_approval',
  'approved',
  'rejected',
]);

const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired']);

const metadataSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .default({});

export const AgentActionSchema = z.object({
  type: actionTypeSchema,
  target: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const AgentRequestSchema = z.object({
  agentId: z.string().min(1),
  operationMode: operationModeSchema.optional(),
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  action: AgentActionSchema,
  metadata: metadataSchema,
  correlationId: z.string().optional(),
});

export const AgentResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string(),
  operationMode: operationModeSchema,
  correlationId: z.string().optional(),
  action: z.object({
    id: z.string(),
    type: actionTypeSchema,
    authorizationStatus: authorizationStatusSchema,
    executed: z.boolean(),
  }),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  approval: z
    .object({
      id: z.string(),
      status: approvalStatusSchema,
      expiresAt: z.union([z.string(), z.date()]),
    })
    .optional(),
  metadata: metadataSchema,
});

export function validateAgentRequest(payload: unknown) {
  return AgentRequestSchema.safeParse(payload);
}

export function validateAgentResponse(payload: unknown) {
  return AgentResponseSchema.safeParse(payload);
}
