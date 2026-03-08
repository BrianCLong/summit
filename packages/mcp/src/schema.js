"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSchema = void 0;
const zod_1 = require("zod");
exports.EvidenceSchema = zod_1.z.object({
    type: zod_1.z.string(),
    payload: zod_1.z.any(),
    meta: zod_1.z.object({
        timestamp: zod_1.z.string(),
        source: zod_1.z.string(),
        hash: zod_1.z.string().optional()
    })
});
