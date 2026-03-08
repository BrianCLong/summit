"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisarmTaxonomySchema = exports.TechniqueSchema = exports.ObservableSchema = void 0;
const zod_1 = require("zod");
exports.ObservableSchema = zod_1.z.object({
    type: zod_1.z.string(),
    description: zod_1.z.string(),
});
exports.TechniqueSchema = zod_1.z.object({
    tactic_id: zod_1.z.string(),
    tactic_name: zod_1.z.string(),
    technique_id: zod_1.z.string(),
    technique_name: zod_1.z.string(),
    description: zod_1.z.string(),
    observables: zod_1.z.array(exports.ObservableSchema).optional().default([]),
    mitigations: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.DisarmTaxonomySchema = zod_1.z.object({
    version: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    techniques: zod_1.z.array(exports.TechniqueSchema),
});
