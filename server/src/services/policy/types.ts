import { z } from 'zod';

// -- Primitive Schemas --

export const CapabilitySchema = z.enum([
  'READ',
  'WRITE',
  'PLAN',
  'EXECUTE',
  'ADMIN',
  'APPROVE',
]);

export const ResourceTypeSchema = z.enum([
  'MAESTRO_RUN',
  'AGENT',
  'KNOWLEDGE_GRAPH',
  'VECTOR_DB',
  'FILE_STORAGE',
  'BILLING',
  'USER',
  'TENANT',
]);

// -- Domain Schemas --

export const ScopeSchema = z.object({
  tenantId: z.string().optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  resourceType: ResourceTypeSchema.optional(),
  resourceId: z.string().optional(),
});

export const BudgetSchema = z.object({
  maxMonthlySpendUSD: z.number().min(0).optional(),
  maxDailySpendUSD: z.number().min(0).optional(),
  maxTokensPerRequest: z.number().min(0).optional(),
  maxConcurrentRuns: z.number().min(0).optional(),
  allowedModels: z.array(z.string()).optional(),
});

export const ApprovalConditionSchema = z.object({
  id: z.string().uuid().optional(),
  triggerEvent: z.enum(['SPEND_THRESHOLD', 'SENSITIVE_ACTION', 'POLICY_CHANGE', 'HIGH_RISK_TOOL']),
  thresholdValue: z.number().optional(), // e.g., $50 or Risk Score > 0.8
  requiredApproverRoles: z.array(z.string()), // e.g., ["ADMIN", "FINANCE"]
  autoExpireHours: z.number().default(24),
});

export const CapabilityRuleSchema = z.object({
  resourceType: ResourceTypeSchema,
  allowedActions: z.array(CapabilitySchema),
  conditions: z.record(z.any()).optional(), // e.g. { "classification": "CONFIDENTIAL" }
});

// -- The Master Policy Schema --

export const EnterprisePolicySchema = z.object({
  metadata: z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    version: z.string().default('1.0.0'), // User-visible semantic version
    author: z.string().email(),
  }),
  scope: ScopeSchema,
  budgets: BudgetSchema.optional(),
  approvals: z.array(ApprovalConditionSchema).default([]),
  capabilities: z.array(CapabilityRuleSchema).default([]),
  enforcementMode: z.enum(['STRICT', 'REPORT_ONLY', 'DRY_RUN']).default('STRICT'),
});

export type Capability = z.infer<typeof CapabilitySchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type ApprovalCondition = z.infer<typeof ApprovalConditionSchema>;
export type CapabilityRule = z.infer<typeof CapabilityRuleSchema>;
export type EnterprisePolicy = z.infer<typeof EnterprisePolicySchema>;

// -- DB Entities --

export enum PolicyStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

export interface PolicyRecord {
  id: string;
  tenant_id: string;
  active_version_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PolicyVersionRecord {
  id: string;
  policy_id: string;
  version_number: number;
  content: EnterprisePolicy;
  status: PolicyStatus;
  created_by: string;
  approved_by?: string;
  created_at: Date;
  review_comments?: string;
}
