"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRChainSchema = exports.PRChainStepSchema = void 0;
const zod_1 = require("zod");
exports.PRChainStepSchema = zod_1.z.object({
    step: zod_1.z.number().int(),
    thought: zod_1.z.string(),
    action: zod_1.z.string(),
    observation: zod_1.z.string(),
});
exports.PRChainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    goal: zod_1.z.string(),
    steps: zod_1.z.array(exports.PRChainStepSchema),
    verdict: zod_1.z.enum(['success', 'failure', 'partial']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
