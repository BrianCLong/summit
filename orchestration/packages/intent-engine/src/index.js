"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSpecSchema = exports.TaskSchema = void 0;
exports.compileToIR = compileToIR;
exports.parseWorkflow = parseWorkflow;
exports.yamlToIR = yamlToIR;
exports.jsonToIR = jsonToIR;
const crypto_1 = __importDefault(require("crypto"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    uses: zod_1.z.string().min(1),
    with: zod_1.z.record(zod_1.z.any()).optional(),
    needs: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.WorkflowSpecSchema = zod_1.z.object({
    apiVersion: zod_1.z.literal('chronos.v1'),
    kind: zod_1.z.literal('Workflow'),
    metadata: zod_1.z.object({
        name: zod_1.z.string().min(1),
        namespace: zod_1.z.string().min(1),
    }),
    spec: zod_1.z.object({
        inputs: zod_1.z.record(zod_1.z.any()).optional(),
        tasks: zod_1.z.array(exports.TaskSchema).min(1),
        retries: zod_1.z
            .object({
            default: zod_1.z.object({
                strategy: zod_1.z.enum(['none', 'fixed', 'exponential']).default('exponential'),
                maxAttempts: zod_1.z.number().int().positive().default(3),
                baseMs: zod_1.z.number().int().positive().default(250),
            }),
        })
            .optional(),
        compensation: zod_1.z.any().optional(),
    }),
});
function compileToIR(spec) {
    const nodes = spec.spec.tasks.map((task) => ({
        id: task.id,
        uses: task.uses,
        with: task.with,
    }));
    const edges = [];
    for (const task of spec.spec.tasks) {
        for (const dependency of task.needs ?? []) {
            edges.push({ from: dependency, to: task.id });
        }
    }
    nodes.sort((a, b) => a.id.localeCompare(b.id));
    edges.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
    const retry = spec.spec.retries?.default ?? {
        strategy: 'exponential',
        maxAttempts: 3,
        baseMs: 250,
    };
    const specHash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(spec))
        .digest('hex');
    return {
        name: spec.metadata.name,
        namespace: spec.metadata.namespace,
        inputs: spec.spec.inputs,
        nodes,
        edges,
        retry,
        specHash,
    };
}
function parseWorkflow(yamlText) {
    const raw = js_yaml_1.default.load(yamlText);
    return exports.WorkflowSpecSchema.parse(raw);
}
function yamlToIR(yamlText) {
    const spec = parseWorkflow(yamlText);
    return compileToIR(spec);
}
function jsonToIR(jsonText) {
    const raw = JSON.parse(jsonText);
    const spec = exports.WorkflowSpecSchema.parse(raw);
    return compileToIR(spec);
}
