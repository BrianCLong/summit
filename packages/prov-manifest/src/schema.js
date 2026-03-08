"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifestSchema = void 0;
const zod_1 = require("zod");
exports.manifestSchema = zod_1.z.object({
    version: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    files: zod_1.z.record(zod_1.z.object({
        hash: zod_1.z.string(),
        size: zod_1.z.number(),
    })),
    lineage: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string(),
        transforms: zod_1.z.array(zod_1.z.string()),
        derived: zod_1.z.string(),
    })),
});
