import { z } from 'zod';

export const canonicalEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  userId: z.string().optional(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  type: z.enum([
    'workspace_created',
    'role_assigned',
    'starter_data_provisioned',
    'guided_step_completed',
    'entity_linked',
    'insight_saved',
    'notification_sent',
    'plan_limit_hit',
    'validation_error',
    'integration_failed',
    'entitlement_blocked',
  ]),
  stepName: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.coerce.date(),
});

export type CanonicalEvent = z.infer<typeof canonicalEventSchema>;

export const inlineValidationSchema = z.object({
  workspaceName: z.string().min(3).max(120),
  orgDomain: z.string().email({ message: 'orgDomain must be a valid email-style domain seed' }),
  region: z.enum(['us-east', 'us-west', 'eu-central']).default('us-east'),
  notificationsEnabled: z.boolean().default(true),
  starterTemplate: z.enum(['analyst', 'operator', 'viewer']).default('analyst'),
});

export const integrationConfigSchema = z.object({
  apiKey: z.string().min(12),
  endpoint: z.string().url(),
  retries: z.number().int().min(0).max(5).default(2),
});

export type ValidationResult = { valid: true } | { valid: false; errors: string[] };
