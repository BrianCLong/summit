/**
 * Request/Response Schema Validation
 * Part of AGENT-1 Gateway Schema Validation
 */
import { z } from 'zod';

// ============================================================================
// Action Types
// ============================================================================

export const ActionTypeSchema = z.enum([
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

export const OperationModeSchema = z.enum([
  'SIMULATION',
  'DRY_RUN',
  'ENFORCED',
]);

// ============================================================================
// Agent Request Schema
// ============================================================================

export const AgentActionSchema = z.object({
  type: ActionTypeSchema,
  target: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const AgentRequestSchema = z.object({
  agentId: z.string().optional(),
  operationMode: OperationModeSchema.optional(),
  tenantId: z.string().min(1, 'tenantId is required'),
  projectId: z.string().optional(),
  action: AgentActionSchema,
  correlationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ValidatedAgentRequest = z.infer<typeof AgentRequestSchema>;

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

export function validateAgentRequest(
  input: unknown
): ValidationResult<ValidatedAgentRequest> {
  const result = AgentRequestSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
