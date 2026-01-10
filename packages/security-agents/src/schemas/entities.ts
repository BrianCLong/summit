import { z } from 'zod';

export const identitySchema = z.object({
  id: z.string(),
  kind: z.enum(['human', 'service', 'agent']),
  displayName: z.string(),
  tenantId: z.string(),
  scopes: z.array(z.string()).default([]),
  assuranceLevel: z.enum(['low', 'medium', 'high']).optional()
});

export const assetSchema = z.object({
  id: z.string(),
  type: z.string(),
  criticality: z.enum(['low', 'medium', 'high', 'mission']).default('medium'),
  owner: identitySchema.pick({ id: true }).optional(),
  labels: z.array(z.string()).optional()
});

export const alertSchema = z.object({
  id: z.string(),
  source: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  assetId: z.string().optional(),
  receivedAt: z.string()
});

export const eventSchema = z.object({
  id: z.string(),
  category: z.string(),
  occurredAt: z.string(),
  attributes: z.record(z.unknown())
});

export const findingSchema = z.object({
  id: z.string(),
  kind: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string())
});

export const controlSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['planned', 'deployed', 'monitored']),
  coverage: z.number().min(0).max(1).optional()
});

export const playbookSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  steps: z.array(z.string()),
  rollbackPlan: z.string().optional()
});

export const agentActionSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  mode: z.enum(['read_advise', 'recommend_plan', 'act']),
  action: z.string(),
  evidenceIds: z.array(z.string()),
  policyDecision: z.enum(['allow', 'deny', 'review']),
  occurredAt: z.string()
});

export const remediationSchema = z.object({
  id: z.string(),
  playbookId: z.string().optional(),
  owner: identitySchema.pick({ id: true }),
  plannedAt: z.string(),
  status: z.enum(['proposed', 'approved', 'scheduled', 'complete']).default('proposed'),
  rollback: z.string().optional()
});

export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  hypothesis: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['open', 'contained', 'closed']).default('open'),
  alerts: z.array(alertSchema).default([]),
  events: z.array(eventSchema).default([]),
  findings: z.array(findingSchema).default([]),
  assets: z.array(assetSchema).default([]),
  actions: z.array(agentActionSchema).default([]),
  createdAt: z.string()
});

export type Identity = z.infer<typeof identitySchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Control = z.infer<typeof controlSchema>;
export type Playbook = z.infer<typeof playbookSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type Remediation = z.infer<typeof remediationSchema>;
export type Incident = z.infer<typeof incidentSchema>;
