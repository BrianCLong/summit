"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolPlanInterpreter = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ToolPlanInterpreter {
    allowedTools;
    maxSteps;
    tools;
    constructor(allowedTools, maxSteps = 10, tools = {}) {
        this.allowedTools = allowedTools;
        this.maxSteps = maxSteps;
        this.tools = tools;
    }
    validate(plan) {
        if (plan.steps.length === 0) {
            throw new Error('Tool plan must include at least one step');
        }
        if (plan.steps.length > this.maxSteps) {
            throw new Error(`Tool plan exceeds maximum steps (${this.maxSteps})`);
        }
        plan.steps.forEach((step, index) => {
            if (!this.allowedTools.includes(step.toolName)) {
                throw new Error(`Tool ${step.toolName} not allowlisted`);
            }
            this.validateArgs(step.args, step.argsSchema, index);
        });
    }
    validateArgs(args, schema, index) {
        const schemaKeys = Object.keys(schema);
        for (const key of schemaKeys) {
            const field = schema[key];
            const value = args[key];
            if (field.required && value === undefined) {
                throw new Error(`Step ${index} missing required arg ${key}`);
            }
            if (value !== undefined && typeof value !== field.type) {
                throw new Error(`Step ${index} arg ${key} expected ${field.type} but received ${typeof value}`);
            }
        }
        for (const argKey of Object.keys(args)) {
            if (!schemaKeys.includes(argKey)) {
                throw new Error(`Step ${index} has unexpected arg ${argKey}`);
            }
        }
    }
    async run(plan, context = {}) {
        this.validate(plan);
        const logs = [];
        const correlationId = context.correlationId ?? crypto_1.default.randomUUID();
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const executor = this.tools[step.toolName];
            if (!executor) {
                throw new Error(`Executor for ${step.toolName} not registered`);
            }
            const output = await executor(step.args);
            logs.push({
                correlationId,
                step: i,
                toolName: step.toolName,
                input: step.args,
                output: this.redactOutput(output),
                redacted: typeof output === 'string' && output.includes('SECRET'),
            });
        }
        return { logs };
    }
    redactOutput(output) {
        if (typeof output === 'string') {
            return output.replace(/SECRET/gi, '[REDACTED]');
        }
        return output;
    }
}
exports.ToolPlanInterpreter = ToolPlanInterpreter;
