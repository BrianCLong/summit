"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryRootSchema = void 0;
const zod_1 = require("zod");
const ToolEntrySchema = zod_1.z.object({
    tool_id: zod_1.z.string({
        required_error: "tool_id is required",
        invalid_type_error: "tool_id must be a string",
    }),
    capability: zod_1.z.array(zod_1.z.string()).min(1, "at least one capability is required"),
    cost_hints: zod_1.z.record(zod_1.z.unknown()).optional(),
    permissions_requested: zod_1.z.array(zod_1.z.string()).optional(),
    server_id: zod_1.z.string().optional(),
});
const ServerEntrySchema = zod_1.z.object({
    server_id: zod_1.z.string({
        required_error: "server_id is required",
        invalid_type_error: "server_id must be a string",
    }),
    endpoint: zod_1.z.string().url("endpoint must be a valid URL"),
    transport: zod_1.z.string(),
    capability: zod_1.z.array(zod_1.z.string()).min(1, "at least one capability is required"),
    health_check: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.RegistryRootSchema = zod_1.z.object({
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semantic version (e.g. 1.0.0)"),
    tools: zod_1.z.array(ToolEntrySchema).default([]),
    servers: zod_1.z.array(ServerEntrySchema).default([]),
}).superRefine((data, ctx) => {
    const toolIds = new Set();
    data.tools.forEach((tool, idx) => {
        if (toolIds.has(tool.tool_id)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
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
                code: zod_1.z.ZodIssueCode.custom,
                message: `Duplicate server_id: ${server.server_id}`,
                path: ['servers', idx, 'server_id'],
            });
        }
        serverIds.add(server.server_id);
    });
});
