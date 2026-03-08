"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plan = exports.Task = void 0;
const zod_1 = require("zod");
exports.Task = zod_1.z.object({
    id: zod_1.z.string(),
    kind: zod_1.z.enum(['plan', 'impl', 'test', 'review', 'docs']),
    budgetUSD: zod_1.z.number().min(0),
    deps: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.Plan = zod_1.z.object({ version: zod_1.z.string(), tasks: zod_1.z.array(exports.Task) });
