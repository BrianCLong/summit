import { z } from 'zod';

export type AgentRole = 'user_copilot' | 'support_copilot' | 'ops_agent';

export const CapabilitySchema = z.object({
  action: z.enum(['read', 'write', 'export', 'delete', 'notify', 'provision']),
  domains: z.array(z.string()).nonempty(),
  environments: z.array(z.string()).nonempty(),
  approvalRequired: z.boolean().default(false),
  highBlastRadius: z.boolean().default(false),
});

export type Capability = z.infer<typeof CapabilitySchema>;

export const RoleDefinitionSchema = z.object({
  role: z.custom<AgentRole>(),
  capabilities: z.array(CapabilitySchema),
});

export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;

export const ToolDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  owner: z.string(),
  scopes: z.array(z.enum(['read', 'write', 'export', 'delete', 'notify', 'provision'])).nonempty(),
  domains: z.array(z.string()).nonempty(),
  environments: z.array(z.string()).nonempty(),
  rateLimit: z.object({
    maxCalls: z.number().int().positive(),
    intervalSeconds: z.number().int().positive(),
  }),
  highBlastRadius: z.boolean().default(false),
  deprecatedAt: z.date().optional(),
  killSwitch: z.boolean().default(false),
  supportsDryRun: z.boolean().default(true),
  approvalRequired: z.boolean().default(false),
  idempotent: z.boolean().default(false),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export interface ToolCall {
  toolId: string;
  actorId: string;
  role: AgentRole;
  tenantId: string;
  userId: string;
  environment: string;
  action: Capability['action'];
  domain: string;
  idempotencyKey?: string;
  approved?: boolean;
  simulate?: boolean;
  payload?: unknown;
  dryRun?: boolean;
}

export interface ApprovalRequirement {
  required: boolean;
  reason?: string;
}

export interface GuardDecision {
  allowed: boolean;
  effect: 'allow' | 'deny' | 'simulate' | 'pending_approval';
  approval: ApprovalRequirement;
  quotaRemaining?: {
    tenant: number;
    user: number;
  };
  rateLimited?: boolean;
  reasons: string[];
  auditId: string;
  warnings: string[];
}

export interface QuotaBudget {
  maxCalls: number;
  intervalSeconds: number;
}

export interface QuotaConfig {
  tenant: QuotaBudget;
  user: QuotaBudget;
}
