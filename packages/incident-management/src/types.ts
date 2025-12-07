import { z } from 'zod';

export const IncidentSeveritySchema = z.enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentStateSchema = z.enum([
  'SUSPECTED',
  'TRIAGE',
  'INVESTIGATING',
  'MITIGATED',
  'MONITORING',
  'RESOLVED'
]);
export type IncidentState = z.infer<typeof IncidentStateSchema>;

export const IncidentRoleSchema = z.enum(['COMMANDER', 'SCRIBE', 'COMMS', 'SME']);
export type IncidentRole = z.infer<typeof IncidentRoleSchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: IncidentSeveritySchema,
  state: IncidentStateSchema,
  commanderId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedAt: z.date().optional(),
  channelId: z.string().optional(), // War Room ID (Slack/Teams/Internal)
  artifacts: z.array(z.string()).default([]), // Links to docs, dashboards
});

export type Incident = z.infer<typeof IncidentSchema>;

export interface IncidentEvent {
  timestamp: Date;
  type: 'STATUS_CHANGE' | 'SEVERITY_CHANGE' | 'COMMENT' | 'ACTION' | 'EVIDENCE';
  actorId: string;
  data: Record<string, any>;
}
