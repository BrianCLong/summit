import { z } from 'zod';

// ============================================================================
// Core Enums
// ============================================================================

export const ApprovalStatus = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const DecisionType = z.enum(['approve', 'reject']);
export type DecisionType = z.infer<typeof DecisionType>;

// ============================================================================
// Actor Schema (requestor or approver)
// ============================================================================

export const ActorSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  roles: z.array(z.string()).default([]),
  attributes: z.record(z.unknown()).optional(),
});
export type Actor = z.infer<typeof ActorSchema>;

// ============================================================================
// Resource Schema
// ============================================================================

export const ResourceSchema = z
  .object({
    type: z.string().min(1),
    id: z.string().min(1),
    name: z.string().optional(),
  })
  .passthrough(); // Allow additional properties
export type Resource = z.infer<typeof ResourceSchema>;

// ============================================================================
// Policy Evaluation
// ============================================================================

export const PolicyConditionSchema = z.object({
  type: z.string(),
  constraint: z.string().optional(),
  value: z.string().optional(),
  description: z.string().optional(),
});
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;

export const PolicyEvaluationSchema = z.object({
  policy_version: z.string(),
  decision: z.enum(['allow', 'deny', 'require_approval']),
  required_approvals: z.number().int().min(0).default(0),
  allowed_approver_roles: z.array(z.string()).default([]),
  conditions: z.array(PolicyConditionSchema).default([]),
  violations: z.array(z.string()).default([]),
  trace_id: z.string().optional(),
});
export type PolicyEvaluation = z.infer<typeof PolicyEvaluationSchema>;

// ============================================================================
// Decision Record
// ============================================================================

export const DecisionRecordSchema = z.object({
  id: z.string().uuid(),
  actor: ActorSchema,
  decision: DecisionType,
  reason: z.string().min(1),
  conditions: z.array(PolicyConditionSchema).default([]),
  timestamp: z.string().datetime(),
  receipt_id: z.string().optional(),
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

// ============================================================================
// Create Approval Request
// ============================================================================

export const CreateApprovalRequestSchema = z.object({
  resource: ResourceSchema,
  action: z.string().min(1),
  requestor: ActorSchema,
  attributes: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
  justification: z.string().optional(),
  expires_at: z.string().datetime().optional(),
});
export type CreateApprovalRequest = z.infer<typeof CreateApprovalRequestSchema>;

// ============================================================================
// Full Approval Request
// ============================================================================

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().min(1),
  resource: ResourceSchema,
  action: z.string(),
  requestor: ActorSchema,
  status: ApprovalStatus,
  attributes: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
  justification: z.string().optional(),
  policy_evaluation: PolicyEvaluationSchema.optional(),
  decisions: z.array(DecisionRecordSchema).default([]),
  receipt_id: z.string().optional(),
  idempotency_key: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  finalized_at: z.string().datetime().optional(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

// ============================================================================
// Decision Submission
// ============================================================================

export const ApprovalDecisionSchema = z.object({
  decision: DecisionType,
  actor: ActorSchema,
  reason: z.string().min(1),
  conditions: z.array(PolicyConditionSchema).optional(),
});
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

// ============================================================================
// Cancel Request
// ============================================================================

export const CancelRequestSchema = z.object({
  actor: ActorSchema,
  reason: z.string().min(1),
});
export type CancelRequestInput = z.infer<typeof CancelRequestSchema>;

// ============================================================================
// List Query Parameters
// ============================================================================

export const ListRequestsQuerySchema = z.object({
  status: z
    .union([ApprovalStatus, z.array(ApprovalStatus)])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : undefined)),
  actor: z.string().optional(),
  resource_type: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type ListRequestsQuery = z.infer<typeof ListRequestsQuerySchema>;

// ============================================================================
// Pagination
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

// ============================================================================
// OPA Input/Output Types
// ============================================================================

export interface OPAApprovalInput {
  tenant_id: string;
  actor: Actor;
  resource: Resource;
  action: string;
  attributes: Record<string, unknown>;
  context: Record<string, unknown>;
  existing_decisions?: DecisionRecord[];
  request_created_at?: string;
}

export interface OPAApprovalDecision {
  allow: boolean;
  require_approval: boolean;
  required_approvals: number;
  allowed_approver_roles: string[];
  conditions: PolicyCondition[];
  violations: string[];
  policy_version: string;
}

export interface OPADecisionInput {
  tenant_id: string;
  actor: Actor;
  resource: Resource;
  action: string;
  decision_type: DecisionType;
  existing_decisions: DecisionRecord[];
  required_approvals: number;
  allowed_approver_roles: string[];
}

export interface OPADecisionResult {
  allow: boolean;
  violations: string[];
  is_final: boolean;
  policy_version: string;
}

// ============================================================================
// Provenance Receipt Types
// ============================================================================

export interface ProvenanceReceipt {
  id: string;
  approval_id: string;
  tenant_id: string;
  actor: Actor;
  decision: DecisionType | 'created' | 'cancelled';
  timestamp: string;
  policy_version: string;
  input_hash: string;
  signature: string;
  key_id: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;

  // Database
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    maxConnections: number;
  };

  // OPA
  opa: {
    url: string;
    timeout: number;
    failClosed: boolean;
  };

  // Provenance
  provenance: {
    url: string;
    enabled: boolean;
    signingKeyId: string;
  };

  // Observability
  otel: {
    enabled: boolean;
    endpoint: string;
    serviceName: string;
  };

  // Feature flags
  features: {
    approvals: {
      enabled: boolean;
      defaultPolicyProfile: string;
      defaultExpirationHours: number;
    };
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string; code?: string }>,
  ) {
    super('VALIDATION_ERROR', message, 422, { errors });
    this.name = 'ValidationError';
  }
}

export class PolicyDenialError extends AppError {
  constructor(
    message: string,
    public policy: {
      version: string;
      violations: string[];
      required_roles?: string[];
      trace_id?: string;
    },
  ) {
    super('POLICY_DENIED', message, 403, { policy });
    this.name = 'PolicyDenialError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id '${id}' not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}
