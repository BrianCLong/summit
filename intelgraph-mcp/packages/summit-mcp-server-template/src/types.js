"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolResponseSchema = exports.SummitMetaSchema = exports.PaginationSchema = void 0;
const zod_1 = require("zod");
/**
 * Standard pagination metadata for list-returning tools.
 */
exports.PaginationSchema = zod_1.z.object({
    has_more: zod_1.z.boolean(),
    next_offset: zod_1.z.number().optional(),
    total_count: zod_1.z.number().optional(),
});
/**
 * Summit-specific metadata for context-budget awareness.
 */
exports.SummitMetaSchema = zod_1.z.object({
    size_estimate: zod_1.z.string().describe("Rough character count or row count (e.g., '1.2KB', '50 rows')"),
    recommendation: zod_1.z.enum(["summarize", "fetch_more", "proceed"]).optional(),
});
/**
 * Base response envelope for all Summit MCP tools.
 */
exports.ToolResponseSchema = zod_1.z.object({
    data: zod_1.z.any(),
    pagination: exports.PaginationSchema.optional(),
    _summit_meta: exports.SummitMetaSchema.optional(),
});
