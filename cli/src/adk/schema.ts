import { z } from 'zod';

export const toolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  allowed: z.boolean().optional(),
});

export const connectionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(z.string()).optional(),
});

export const knowledgeBaseSchema = z
  .object({
    sources: z
      .array(
        z.object({
          name: z.string().min(1),
          uri: z.string().min(1),
          type: z.string().min(1),
        }),
      )
      .optional(),
  })
  .optional();

export const manifestSchema = z.object({
  schema_version: z.literal('s-adk/v1'),
  name: z.string().min(1),
  description: z.string().optional(),
  tools: z.array(toolSchema).optional(),
  connections: z.array(connectionSchema).optional(),
  knowledge_base: knowledgeBaseSchema,
  policy: z
    .object({
      allow_tools: z.array(z.string()).optional(),
      allow_network: z.boolean().optional(),
    })
    .optional(),
});

export type AgentManifest = z.infer<typeof manifestSchema>;
