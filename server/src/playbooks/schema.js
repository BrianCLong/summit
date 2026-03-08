"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybookRunSchema = exports.PlaybookSchema = exports.PlaybookStepSchema = void 0;
const zod_1 = require("zod");
const StepIdSchema = zod_1.z.string().min(1);
const LogStepSchema = zod_1.z.object({
    id: StepIdSchema,
    type: zod_1.z.literal('log'),
    message: zod_1.z.string().min(1),
});
const DelayStepSchema = zod_1.z.object({
    id: StepIdSchema,
    type: zod_1.z.literal('delay'),
    durationMs: zod_1.z.number().int().positive(),
});
exports.PlaybookStepSchema = zod_1.z.discriminatedUnion('type', [
    LogStepSchema,
    DelayStepSchema,
]);
exports.PlaybookSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    steps: zod_1.z.array(exports.PlaybookStepSchema).min(1),
});
exports.PlaybookRunSchema = zod_1.z.object({
    runKey: zod_1.z.string().min(1),
    playbook: exports.PlaybookSchema,
});
