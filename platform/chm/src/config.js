"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagRuleSchema = exports.taxonomySchema = exports.licenseTiers = exports.residencyZones = exports.classificationLevels = void 0;
const zod_1 = require("zod");
exports.classificationLevels = ['TS', 'S', 'C', 'U'];
exports.residencyZones = ['us', 'eu', 'apac'];
exports.licenseTiers = ['exportable', 'domestic-only', 'blocked'];
exports.taxonomySchema = zod_1.z.object({
    code: zod_1.z.string(),
    description: zod_1.z.string(),
    level: zod_1.z.enum(exports.classificationLevels),
    downgradeTo: zod_1.z.array(zod_1.z.enum(exports.classificationLevels)).default([])
});
exports.tagRuleSchema = zod_1.z.object({
    tag: zod_1.z.string(),
    residency: zod_1.z.enum(exports.residencyZones),
    license: zod_1.z.enum(exports.licenseTiers),
    exportable: zod_1.z.boolean(),
    rationale: zod_1.z.string()
});
