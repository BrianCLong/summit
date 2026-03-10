import { z } from "zod";

export const ServerDescriptor = z.object({
  serverId: z.string().min(1),
  tenantVisibility: z.array(z.string()).default([]),
  transport: z.enum(["stdio", "http", "sse"]).optional(),
  authModel: z.enum(["none", "bearer", "oauth2", "mTLS"]).optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string().default(""),
    capabilityTags: z.array(z.string()).default([]),
    riskTags: z.array(z.string()).default([]),
    inputSchemaHash: z.string().optional(),
  })).default([]),
  resources: z.array(z.object({ uri: z.string(), mimeType: z.string().optional() })).default([]),
  prompts: z.array(z.object({ name: z.string() })).default([]),
});

export type ServerDescriptor = z.infer<typeof ServerDescriptor>;
