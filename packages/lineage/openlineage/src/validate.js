"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunEventSchema = void 0;
exports.validateEvent = validateEvent;
const zod_1 = require("zod");
const core_js_1 = require("./facets/core.js");
const summit_js_1 = require("./facets/summit.js");
const DatasetSchema = zod_1.z.object({
    namespace: zod_1.z.string(),
    name: zod_1.z.string(),
    facets: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.RunEventSchema = zod_1.z.object({
    eventType: zod_1.z.enum(['START', 'RUNNING', 'COMPLETE', 'ABORT', 'FAIL', 'OTHER']),
    eventTime: zod_1.z.string().datetime(),
    run: zod_1.z.object({
        runId: zod_1.z.string().uuid(),
        facets: zod_1.z.object({
            tenant: summit_js_1.TenantFacetSchema.optional(),
            security: summit_js_1.SecurityFacetSchema.optional(),
            build: summit_js_1.BuildFacetSchema.optional(),
        }).passthrough().optional()
    }),
    job: zod_1.z.object({
        namespace: zod_1.z.string(),
        name: zod_1.z.string(),
        facets: zod_1.z.object({
            sourceCode: core_js_1.SourceCodeJobFacetSchema.optional(),
            documentation: core_js_1.DocumentationJobFacetSchema.optional(),
            sql: core_js_1.SqlJobFacetSchema.optional()
        }).passthrough().optional()
    }),
    inputs: zod_1.z.array(DatasetSchema).optional(),
    outputs: zod_1.z.array(DatasetSchema).optional(),
    producer: zod_1.z.string().url(),
    schemaURL: zod_1.z.string().url(),
});
function validateEvent(event) {
    return exports.RunEventSchema.safeParse(event);
}
