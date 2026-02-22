import { z } from "zod";

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  type: z.string(),
  tenant_id: z.string(),
  actor: z.object({
    id: z.string(),
    type: z.enum(["human", "service"]),
  }),
  action: z.string(),
  resource: z.object({
    type: z.string(),
    id: z.string().optional(),
  }),
  payload: z.record(z.unknown()),
  correlation_id: z.string().optional(),
  signature: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
