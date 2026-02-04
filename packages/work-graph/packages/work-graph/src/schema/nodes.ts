/**
 * Summit Work Graph - Node Types
 */

import { z } from 'zod';

export const BaseNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type BaseNode = z.infer<typeof BaseNodeSchema>;

export const IntentSchema = BaseNodeSchema.extend({
  type: z.literal('intent'),
  title: z.string().min(1),
  description: z.string(),
  source: z.enum(['customer', 'internal', 'market', 'regulation']),
  customer: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['captured', 'validated', 'planned', 'delivered', 'rejected']),
  evidence: z.array(z.string()).default([]),
  targetDate: z.date().optional(),
  valueScore: z.number().min(0).max(100).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

export const CommitmentSchema = BaseNodeSchema.extend({
  type: z.literal('commitment'),
  title: z.string().min(1),
  description: z.string(),
  customer: z.string(),
  dueDate: z.date(),
  status: z.enum(['active', 'at_risk', 'delivered', 'broken']),
  confidence: z.number().min(0).max(100),
  contractualSLA: z.boolean().default(false),
  escalationPath: z.array(z.string()).default([]),
  linkedIntents: z.array(z.string()).default([]),
});

export type Commitment = z.infer<typeof CommitmentSchema>;

export const HypothesisSchema = BaseNodeSchema.extend({
  type: z.literal('hypothesis'),
  statement: z.string().min(1),
  status: z.enum(['proposed', 'testing', 'validated', 'invalidated']),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.object({
    type: z.enum(['metric', 'user_feedback', 'experiment', 'observation']),
    description: z.string(),
    support: z.enum(['for', 'against', 'neutral']),
    weight: z.number().min(0).max(1),
  })),
  testPlan: z.string().optional(),
  outcome: z.string().optional(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const EpicSchema = BaseNodeSchema.extend({
  type: z.literal('epic'),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['draft', 'planned', 'in_progress', 'completed', 'cancelled']),
  owner: z.string().optional(),
  targetQuarter: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  linearId: z.string().optional(),
  jiraKey: z.string().optional(),
});

export type Epic = z.infer<typeof EpicSchema>;

export const TicketSchema = BaseNodeSchema.extend({
  type: z.literal('ticket'),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  estimate: z.number().optional(),
  assignee: z.string().optional(),
  assigneeType: z.enum(['human', 'agent']).optional(),
  labels: z.array(z.string()).default([]),
  dueDate: z.date().optional(),
  linearId: z.string().optional(),
  jiraKey: z.string().optional(),
  cycleId: z.string().optional(),
  sprintId: z.string().optional(),
  agentEligible: z.boolean().default(false),
  complexity: z.enum(['trivial', 'simple', 'medium', 'complex', 'unknown']).default('unknown'),
  area: z.string().optional(),
  blockedReason: z.string().optional(),
  completedAt: z.date().optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;

export const PRSchema = BaseNodeSchema.extend({
  type: z.literal('pr'),
  title: z.string().min(1),
  description: z.string(),
  url: z.string().url(),
  number: z.number(),
  author: z.string(),
  authorType: z.enum(['human', 'agent']),
  status: z.enum(['draft', 'open', 'merged', 'closed']),
  checksStatus: z.enum(['pending', 'passing', 'failing']),
  reviewers: z.array(z.string()).default([]),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  filesChanged: z.number().default(0),
  branch: z.string(),
  mergedAt: z.date().optional(),
});

export type PR = z.infer<typeof PRSchema>;

export const TestSchema = BaseNodeSchema.extend({
  type: z.literal('test'),
  name: z.string().min(1),
  suite: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped', 'flaky']),
  lastRun: z.date().optional(),
  duration: z.number().optional(),
  coverage: z.number().min(0).max(100).optional(),
  failureReason: z.string().optional(),
  flakyRate: z.number().min(0).max(100).optional(),
});

export type Test = z.infer<typeof TestSchema>;

export const ScanSchema = BaseNodeSchema.extend({
  type: z.literal('scan'),
  scanType: z.enum(['sast', 'dast', 'dependency', 'secret', 'license', 'quality']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  findings: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    cwe: z.string().optional(),
    remediation: z.string().optional(),
  })),
  criticalCount: z.number().default(0),
  highCount: z.number().default(0),
  mediumCount: z.number().default(0),
  lowCount: z.number().default(0),
  completedAt: z.date().optional(),
});

export type Scan = z.infer<typeof ScanSchema>;

export const IncidentSchema = BaseNodeSchema.extend({
  type: z.literal('incident'),
  title: z.string().min(1),
  description: z.string(),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']),
  status: z.enum(['detected', 'acknowledged', 'investigating', 'mitigated', 'resolved', 'postmortem']),
  detectedAt: z.date(),
  acknowledgedAt: z.date().optional(),
  mitigatedAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  impactedServices: z.array(z.string()).default([]),
  impactedCustomers: z.array(z.string()).default([]),
  oncall: z.string().optional(),
  rootCause: z.string().optional(),
  postmortemUrl: z.string().optional(),
  ttd: z.number().optional(),
  ttm: z.number().optional(),
  ttr: z.number().optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;

export const CustomerSchema = BaseNodeSchema.extend({
  type: z.literal('customer'),
  name: z.string().min(1),
  tier: z.enum(['enterprise', 'business', 'startup', 'free']),
  arr: z.number().optional(),
  healthScore: z.number().min(0).max(100).optional(),
  csm: z.string().optional(),
  renewalDate: z.date().optional(),
  contracts: z.array(z.string()).default([]),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const AgentSchema = BaseNodeSchema.extend({
  type: z.literal('agent'),
  name: z.string().min(1),
  agentType: z.enum(['coding', 'testing', 'security', 'docs', 'review', 'triage', 'planning']),
  status: z.enum(['available', 'busy', 'offline', 'error']),
  capabilities: z.array(z.string()).default([]),
  currentTask: z.string().optional(),
  completedTasks: z.number().default(0),
  successRate: z.number().min(0).max(100).default(100),
  averageCompletionTime: z.number().optional(),
  reputation: z.number().min(0).max(100).default(50),
  lastActive: z.date().optional(),
  model: z.string().optional(),
  version: z.string().optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const EnvironmentSchema = BaseNodeSchema.extend({
  type: z.literal('environment'),
  name: z.enum(['dev', 'staging', 'production', 'canary']),
  version: z.string(),
  deployedAt: z.date(),
  health: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
  url: z.string().optional(),
  region: z.string().optional(),
  metrics: z.object({
    cpu: z.number().optional(),
    memory: z.number().optional(),
    latencyP50: z.number().optional(),
    latencyP99: z.number().optional(),
    errorRate: z.number().optional(),
  }).optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export const PolicySchema = BaseNodeSchema.extend({
  type: z.literal('policy'),
  name: z.string().min(1),
  description: z.string(),
  policyType: z.enum(['security', 'quality', 'compliance', 'operational', 'governance']),
  status: z.enum(['draft', 'active', 'deprecated']),
  scope: z.array(z.enum(['pr', 'ticket', 'deployment', 'incident', 'all'])),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'matches']),
    value: z.unknown().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(['block', 'warn', 'notify', 'require_approval', 'auto_fix']),
    message: z.string(),
    target: z.string().optional(),
  })),
  exceptions: z.array(z.string()).default([]),
  owner: z.string().optional(),
  enforcementLevel: z.enum(['advisory', 'soft', 'hard']).default('soft'),
});

export type Policy = z.infer<typeof PolicySchema>;

export const SprintSchema = BaseNodeSchema.extend({
  type: z.literal('sprint'),
  name: z.string().min(1),
  number: z.number(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']),
  startDate: z.date(),
  endDate: z.date(),
  goal: z.string().optional(),
  capacity: z.number().optional(),
  committed: z.number().default(0),
  completed: z.number().default(0),
  velocity: z.number().optional(),
  team: z.string().optional(),
});

export type Sprint = z.infer<typeof SprintSchema>;

export type WorkGraphNode = Intent | Commitment | Hypothesis | Epic | Ticket | PR | Test | Scan | Incident | Customer | Agent | Environment | Policy | Sprint;

export const WorkGraphNodeSchema = z.discriminatedUnion('type', [
  IntentSchema, CommitmentSchema, HypothesisSchema, EpicSchema, TicketSchema, PRSchema,
  TestSchema, ScanSchema, IncidentSchema, CustomerSchema, AgentSchema, EnvironmentSchema,
  PolicySchema, SprintSchema,
]);
