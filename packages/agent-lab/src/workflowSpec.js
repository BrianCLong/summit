"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWorkflowSpec = exports.validateWorkflowSpec = exports.WorkflowSpecSchema = exports.WorkflowStepSchema = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
exports.WorkflowStepSchema = zod_1.z.object({
    name: zod_1.z.string(),
    tool: zod_1.z.string(),
    inputs: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    expect: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.WorkflowSpecSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0.0'),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    dryRun: zod_1.z.boolean().optional(),
    objectives: zod_1.z.array(zod_1.z.string()).optional(),
    expect: zod_1.z.array(zod_1.z.string()).optional(),
    policy: zod_1.z
        .object({
        allowedTools: zod_1.z.array(zod_1.z.string()).optional(),
        targetAllowlist: zod_1.z.array(zod_1.z.string()).optional(),
        commandAllowlist: zod_1.z.array(zod_1.z.string()).optional(),
        defaultTimeoutMs: zod_1.z.number().optional(),
    })
        .optional(),
    steps: zod_1.z.array(exports.WorkflowStepSchema).nonempty(),
});
const validateWorkflowSpec = (spec) => {
    return exports.WorkflowSpecSchema.parse(spec);
};
exports.validateWorkflowSpec = validateWorkflowSpec;
const loadWorkflowSpec = (filePath) => {
    const resolved = path_1.default.resolve(filePath);
    const raw = fs_1.default.readFileSync(resolved, 'utf-8');
    const data = resolved.endsWith('.json') ? JSON.parse(raw) : js_yaml_1.default.load(raw);
    return (0, exports.validateWorkflowSpec)(data);
};
exports.loadWorkflowSpec = loadWorkflowSpec;
