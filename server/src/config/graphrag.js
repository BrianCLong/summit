"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = __importDefault(require("./index.js"));
const defaultPrompt = zod_1.z.object({
    question: zod_1.z.string().min(3),
});
const defaultOutput = zod_1.z.object({
    answer: zod_1.z.string(),
    confidence: zod_1.z.number(),
    citations: zod_1.z.object({ entityIds: zod_1.z.array(zod_1.z.string()) }),
    why_paths: zod_1.z.array(zod_1.z.object({
        from: zod_1.z.string(),
        to: zod_1.z.string(),
        relId: zod_1.z.string(),
        type: zod_1.z.string(),
        supportScore: zod_1.z.number().optional(),
    })),
});
const graphragConfig = {
    redisUrl: index_js_1.default.graphrag?.redisUrl,
    useCases: {
        default: {
            promptSchema: defaultPrompt,
            outputSchema: defaultOutput,
            tokenBudget: index_js_1.default.graphrag?.tokenBudget ?? 4096,
            latencyBudgetMs: index_js_1.default.graphrag?.latencyBudgetMs ?? 5000,
        },
    },
};
exports.default = graphragConfig;
