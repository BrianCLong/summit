import { z } from 'zod';

/**
 * Incident Response Types
 */
export const incidentSeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]);

export const incidentStatusEnum = z.enum([
  'NEW',
  'INVESTIGATING',
  'CONTAINED',
  'ERADICATED',
  'RECOVERED',
  'CLOSED',
  'FALSE_POSITIVE',
]);

export const incidentCategoryEnum = z.enum([
  'MALWARE',
  'PHISHING',
  'DATA_BREACH',
  'RANSOMWARE',
  'DDoS',
  'UNAUTHORIZED_ACCESS',
  'INSIDER_THREAT',
  'ACCOUNT_COMPROMISE',
  'POLICY_VIOLATION',
  'VULNERABILITY_EXPLOITATION',
  'APT',
  'OTHER',
]);

/**
 * Incident Schema
 */
export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: incidentCategoryEnum,
  severity: incidentSeverityEnum,
  status: incidentStatusEnum,

  // Timeline
  detectedAt: z.string().datetime(),
  reportedAt: z.string().datetime(),
  containedAt: z.string().datetime().optional(),
  eradicatedAt: z.string().datetime().optional(),
  recoveredAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),

  // Assignment
  assignedTo: z.string().optional(),
  team: z.string().optional(),
  escalationLevel: z.number().int().min(1).max(5).default(1),

  // Impact
  impactScope: z.object({
    affectedSystems: z.array(z.string()).default([]),
    affectedUsers: z.array(z.string()).default([]),
    affectedData: z.array(z.string()).default([]),
    estimatedImpact: z.string().optional(),
    businessImpact: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  }).optional(),

  // Threat Intelligence
  iocs: z.array(z.string()).default([]),
  threatActors: z.array(z.string()).default([]),
  campaigns: z.array(z.string()).default([]),
  mitreTactics: z.array(z.string()).default([]),
  mitreTechniques: z.array(z.string()).default([]),

  // Evidence
  evidenceCollected: z.array(z.object({
    id: z.string(),
    type: z.enum(['LOG', 'MEMORY_DUMP', 'DISK_IMAGE', 'NETWORK_CAPTURE', 'SCREENSHOT', 'FILE', 'OTHER']),
    description: z.string(),
    location: z.string(),
    hash: z.string().optional(),
    collectedAt: z.string().datetime(),
    collectedBy: z.string(),
    chainOfCustody: z.array(z.object({
      timestamp: z.string().datetime(),
      action: z.string(),
      person: z.string(),
    })).default([]),
  })).default([]),

  // Response Actions
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['INVESTIGATE', 'CONTAIN', 'ERADICATE', 'RECOVER', 'COMMUNICATE', 'DOCUMENT']),
    description: z.string(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
    assignedTo: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  })).default([]),

  // Communications
  communications: z.array(z.object({
    id: z.string(),
    type: z.enum(['INTERNAL', 'EXTERNAL', 'STAKEHOLDER', 'REGULATORY', 'PUBLIC']),
    recipients: z.array(z.string()),
    subject: z.string(),
    message: z.string(),
    sentAt: z.string().datetime(),
    sentBy: z.string(),
  })).default([]),

  // Lessons Learned
  lessonsLearned: z.object({
    whatHappened: z.string().optional(),
    whatWentWell: z.string().optional(),
    whatNeedsImprovement: z.string().optional(),
    actionItems: z.array(z.object({
      description: z.string(),
      assignedTo: z.string().optional(),
      dueDate: z.string().datetime().optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
    })).default([]),
  }).optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  tlp: z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']).default('AMBER'),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

/**
 * Playbook Schema
 */
export const playbookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: incidentCategoryEnum,

  // Trigger conditions
  triggers: z.array(z.object({
    type: z.enum(['IOC_MATCH', 'ALERT', 'THRESHOLD', 'MANUAL']),
    condition: z.string(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })).default([]),

  // Steps
  steps: z.array(z.object({
    id: z.string(),
    order: z.number().int(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['AUTOMATED', 'MANUAL', 'DECISION']),
    action: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    nextSteps: z.array(z.string()).default([]),
  })).default([]),

  // Approval requirements
  requiresApproval: z.boolean().default(false),
  approvers: z.array(z.string()).default([]),

  // Metrics
  averageExecutionTime: z.number().optional(),
  successRate: z.number().min(0).max(100).optional(),
  executionCount: z.number().int().default(0),

  enabled: z.boolean().default(true),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Playbook Execution Schema
 */
export const playbookExecutionSchema = z.object({
  id: z.string(),
  playbookId: z.string(),
  incidentId: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']),

  currentStep: z.string().optional(),
  completedSteps: z.array(z.string()).default([]),

  results: z.array(z.object({
    stepId: z.string(),
    status: z.enum(['SUCCESS', 'FAILED', 'SKIPPED']),
    output: z.unknown().optional(),
    error: z.string().optional(),
    executedAt: z.string().datetime(),
  })).default([]),

  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  startedBy: z.string(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * SOAR Integration Schema
 */
export const soarActionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'ISOLATE_HOST',
    'BLOCK_IP',
    'BLOCK_DOMAIN',
    'BLOCK_URL',
    'QUARANTINE_FILE',
    'DISABLE_USER',
    'RESET_PASSWORD',
    'COLLECT_FORENSICS',
    'CREATE_TICKET',
    'SEND_EMAIL',
    'WEBHOOK',
  ]),
  target: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED']),
  result: z.unknown().optional(),
  error: z.string().optional(),
  executedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

/**
 * Metrics Schema
 */
export const incidentMetricsSchema = z.object({
  timeToDetect: z.number(), // milliseconds
  timeToRespond: z.number(), // milliseconds
  timeToContain: z.number(), // milliseconds
  timeToEradicate: z.number(), // milliseconds
  timeToRecover: z.number(), // milliseconds
  totalIncidentTime: z.number(), // milliseconds

  actionsCompleted: z.number().int(),
  actionsFailed: z.number().int(),
  evidenceCollected: z.number().int(),

  calculatedAt: z.string().datetime(),
});

/**
 * Type exports
 */
export type Incident = z.infer<typeof incidentSchema>;
export type IncidentSeverity = z.infer<typeof incidentSeverityEnum>;
export type IncidentStatus = z.infer<typeof incidentStatusEnum>;
export type IncidentCategory = z.infer<typeof incidentCategoryEnum>;
export type Playbook = z.infer<typeof playbookSchema>;
export type PlaybookExecution = z.infer<typeof playbookExecutionSchema>;
export type SOARAction = z.infer<typeof soarActionSchema>;
export type IncidentMetrics = z.infer<typeof incidentMetricsSchema>;
