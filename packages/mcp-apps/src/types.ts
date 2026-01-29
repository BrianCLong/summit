import { z } from 'zod';

/**
 * MCP UI Resource definition
 * Represents a UI template or bundle fetched from an MCP server.
 */
export const McpUiResourceSchema = z.object({
  uri: z.string().startsWith('ui://'),
  template: z.string(), // HTML/JS/CSS bundle or template string
  metadata: z.record(z.string(), z.unknown()).optional(),
  signature: z.string().optional(), // Signed hash for verification
});

export type McpUiResource = z.infer<typeof McpUiResourceSchema>;

/**
 * AG-UI Event Stream Primitives
 */
export const AgUiEventTypeSchema = z.enum([
  'TOOL_CALL_START',
  'TOOL_CALL_COMPLETE',
  'STATE_SNAPSHOT',
  'STATE_DELTA',
  'UI_ACTION',
]);

export type AgUiEventType = z.infer<typeof AgUiEventTypeSchema>;

export const AgUiEventSchema = z.object({
  id: z.string(),
  type: AgUiEventTypeSchema,
  timestamp: z.string().datetime(),
  payload: z.unknown(),
  runId: z.string().optional(),
  serverId: z.string().optional(),
});

export type AgUiEvent = z.infer<typeof AgUiEventSchema>;

/**
 * Metadata in tool results pointing to a UI resource
 */
export const McpUiMetadataSchema = z.object({
  'ui/resourceUri': z.string().startsWith('ui://'),
  'ui/serverId': z.string().optional(),
});

export type McpUiMetadata = z.infer<typeof McpUiMetadataSchema>;

/**
 * JSON Patch Operation (minimal for internal use)
 */
export const JsonPatchOpSchema = z.object({
  op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
  path: z.string(),
  value: z.unknown().optional(),
  from: z.string().optional(),
});

export type JsonPatchOp = z.infer<typeof JsonPatchOpSchema>;
