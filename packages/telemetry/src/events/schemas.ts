import { z } from 'zod';

export const AIInteractionEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string(),
  sessionId: z.string(),
  promptMetadata: z.object({
    tokens: z.number().optional(),
    redacted: z.boolean().default(false),
    hash: z.string().optional(),
  }),
  outputMetadata: z.object({
    tokens: z.number().optional(),
    redacted: z.boolean().default(false),
    hash: z.string().optional(),
  }),
  modelId: z.string(),
});

export const AIActionEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string(),
  sessionId: z.string(),
  action: z.string(),
  tool: z.string(),
  inputMetadata: z.record(z.any()).optional(),
  approvedBy: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED']),
});

export const ModelUsageEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  modelId: z.string(),
  modelVersion: z.string(),
  provider: z.string(),
  hosting: z.enum(['INTERNAL', 'EXTERNAL', 'HYBRID']),
  region: z.string(),
  useCase: z.string().optional(),
});

export const ControlTestRunEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  testId: z.string(),
  datasetId: z.string(),
  metrics: z.record(z.number()),
  passed: z.boolean(),
  evidenceId: z.string().optional(),
});

export const IncidentEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  incidentId: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  scope: z.array(z.string()),
  containmentActions: z.array(z.string()),
  status: z.enum(['DETECTED', 'CONTAINED', 'RESOLVED', 'CLOSED']),
});

export type AIInteractionEvent = z.infer<typeof AIInteractionEventSchema>;
export type AIActionEvent = z.infer<typeof AIActionEventSchema>;
export type ModelUsageEvent = z.infer<typeof ModelUsageEventSchema>;
export type ControlTestRunEvent = z.infer<typeof ControlTestRunEventSchema>;
export type IncidentEvent = z.infer<typeof IncidentEventSchema>;
