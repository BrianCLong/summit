import { z } from 'zod';

const ToolEntrySchema = z.object({
  tool_id: z.string({
    required_error: "tool_id is required",
    invalid_type_error: "tool_id must be a string",
  }),
  capability: z.array(z.string()).min(1, "at least one capability is required"),
  cost_hints: z.record(z.unknown()).optional(),
  permissions_requested: z.array(z.string()).optional(),
  server_id: z.string().optional(),
});

const ServerEntrySchema = z.object({
  server_id: z.string({
    required_error: "server_id is required",
    invalid_type_error: "server_id must be a string",
  }),
  endpoint: z.string().url("endpoint must be a valid URL"),
  transport: z.string(),
  capability: z.array(z.string()).min(1, "at least one capability is required"),
  health_check: z.record(z.unknown()).optional(),
});

export const RegistryRootSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semantic version (e.g. 1.0.0)"),
  tools: z.array(ToolEntrySchema).default([]),
  servers: z.array(ServerEntrySchema).default([]),
}).superRefine((data, ctx) => {
  const toolIds = new Set();
  data.tools.forEach((tool, idx) => {
    if (toolIds.has(tool.tool_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate tool_id: ${tool.tool_id}`,
        path: ['tools', idx, 'tool_id'],
      });
    }
    toolIds.add(tool.tool_id);
  });

  const serverIds = new Set();
  data.servers.forEach((server, idx) => {
    if (serverIds.has(server.server_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate server_id: ${server.server_id}`,
        path: ['servers', idx, 'server_id'],
      });
    }
    serverIds.add(server.server_id);
  });
});
