"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildFacetSchema = exports.SecurityFacetSchema = exports.TenantFacetSchema = void 0;
const zod_1 = require("zod");
const core_js_1 = require("./core.js");
exports.TenantFacetSchema = core_js_1.BaseFacetSchema.extend({
    tenantId: zod_1.z.string(),
    workspaceId: zod_1.z.string().optional(),
    residencyRegion: zod_1.z.string().optional(),
});
exports.SecurityFacetSchema = core_js_1.BaseFacetSchema.extend({
    classification: zod_1.z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
    approvedBy: zod_1.z.string().optional(),
});
// Summit Custom Facet for Build Info (if not covered by core SourceCode)
exports.BuildFacetSchema = core_js_1.BaseFacetSchema.extend({
    imageDigest: zod_1.z.string().optional(),
    buildId: zod_1.z.string().optional(),
    builder: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime().optional(),
});
