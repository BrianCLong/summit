"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonPatchOpSchema = exports.McpUiMetadataSchema = exports.AgUiEventSchema = exports.AgUiEventTypeSchema = exports.McpUiResourceSchema = void 0;
const zod_1 = require("zod");
/**
 * MCP UI Resource definition
 * Represents a UI template or bundle fetched from an MCP server.
 */
exports.McpUiResourceSchema = zod_1.z.object({
    uri: zod_1.z.string().startsWith('ui://'),
    template: zod_1.z.string(), // HTML/JS/CSS bundle or template string
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    signature: zod_1.z.string().optional(), // Signed hash for verification
});
/**
 * AG-UI Event Stream Primitives
 */
exports.AgUiEventTypeSchema = zod_1.z.enum([
    'TOOL_CALL_START',
    'TOOL_CALL_COMPLETE',
    'STATE_SNAPSHOT',
    'STATE_DELTA',
    'UI_ACTION',
]);
exports.AgUiEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.AgUiEventTypeSchema,
    timestamp: zod_1.z.string().datetime(),
    payload: zod_1.z.unknown(),
    runId: zod_1.z.string().optional(),
    serverId: zod_1.z.string().optional(),
});
/**
 * Metadata in tool results pointing to a UI resource
 */
exports.McpUiMetadataSchema = zod_1.z.object({
    'ui/resourceUri': zod_1.z.string().startsWith('ui://'),
    'ui/serverId': zod_1.z.string().optional(),
});
/**
 * JSON Patch Operation (minimal for internal use)
 */
exports.JsonPatchOpSchema = zod_1.z.object({
    op: zod_1.z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: zod_1.z.string(),
    value: zod_1.z.unknown().optional(),
    from: zod_1.z.string().optional(),
});
