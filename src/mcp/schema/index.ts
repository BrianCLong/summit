import { z } from 'zod';

export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.record(z.any()).optional(),
    required: z.array(z.string()).optional(),
  }).passthrough(),
});

export const McpCallToolRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional(),
});

export const McpInitializeRequestSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.object({
    experimental: z.record(z.object({})).optional(),
    roots: z.object({
      listChanged: z.boolean().optional(),
    }).optional(),
    sampling: z.object({}).optional(),
  }),
  clientInfo: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

export const McpProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(['node', 'python', 'go', 'rust', 'other']),
});

export const McpEvidenceSchema = z.object({
  evidence_id: z.string().regex(/^EVD-[A-Za-z0-9_-]+$/),
  report: z.string(),
  metrics: z.string(),
  stamp: z.string(),
});
