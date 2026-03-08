"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlJobFacetSchema = exports.DocumentationJobFacetSchema = exports.SourceCodeJobFacetSchema = exports.BaseFacetSchema = void 0;
const zod_1 = require("zod");
exports.BaseFacetSchema = zod_1.z.object({
    _producer: zod_1.z.string().url(),
    _schemaURL: zod_1.z.string().url(),
});
exports.SourceCodeJobFacetSchema = exports.BaseFacetSchema.extend({
    language: zod_1.z.string(),
    sourceUri: zod_1.z.string().url().optional(), // Often git remote
    version: zod_1.z.string().optional(), // git sha
    repoUrl: zod_1.z.string().url().optional(),
    branch: zod_1.z.string().optional(),
    commitId: zod_1.z.string().optional(),
});
exports.DocumentationJobFacetSchema = exports.BaseFacetSchema.extend({
    description: zod_1.z.string(),
});
exports.SqlJobFacetSchema = exports.BaseFacetSchema.extend({
    query: zod_1.z.string(),
});
