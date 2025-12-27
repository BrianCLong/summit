import { z } from 'zod';

const canonicalNodeSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  nodeType: z.enum(['Input', 'Decision', 'Action', 'Outcome']),
  subType: z.string(),
  label: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()),
  hash: z.string().optional(),
  sourceEntryId: z.string().optional(),
});

const canonicalEdgeSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  relation: z.enum([
    'FED_INTO',
    'USED_BY',
    'TRIGGERED',
    'BLOCKED',
    'PRODUCED',
    'GENERATED',
    'AFFECTED',
    'DERIVED_FROM',
  ]),
  timestamp: z.string(),
  properties: z.record(z.any()).optional(),
});

export const playbookRunManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  generatedAt: z.string(),
  run: z.object({
    id: z.string(),
    playbookId: z.string(),
    tenantId: z.string(),
    status: z.string(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
  }),
  playbook: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
  provenance: z.object({
    nodes: z.array(canonicalNodeSchema),
    edges: z.array(canonicalEdgeSchema),
  }),
});

export type PlaybookRunManifest = ReturnType<
  typeof playbookRunManifestSchema.parse
>;
