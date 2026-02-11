import { z } from "zod";
import { AuditEventSchema } from "../audit/types";

export const EventContracts = {
  audit: AuditEventSchema,

  // Example of a domain event
  tenantProvisioned: z.object({
    tenant_id: z.string(),
    name: z.string(),
    owner_id: z.string(),
    region: z.string(),
    timestamp: z.string().datetime(),
  }),
};
