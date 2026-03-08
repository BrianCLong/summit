"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = exports.ToolRegistry = void 0;
const crypto_1 = require("crypto");
const metrics_js_1 = require("../../observability/metrics.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const context_shell_js_1 = require("../tools/context-shell.js");
// Simple Registry (In-memory for now)
class ToolRegistry {
    tools = new Map();
    register(name, executor) {
        this.tools.set(name, executor);
    }
    get(name) {
        return this.tools.get(name);
    }
}
exports.ToolRegistry = ToolRegistry;
// Built-in Echo Tool for testing
class EchoTool {
    async execute(params) {
        return params;
    }
}
class WorkflowEngine {
    registry;
    constructor() {
        this.registry = new ToolRegistry();
        this.registry.register('utils.echo', new EchoTool());
        this.registry.register('ctx.bash', new context_shell_js_1.ContextShellTool('bash'));
        this.registry.register('ctx.readFile', new context_shell_js_1.ContextShellTool('readFile'));
        this.registry.register('ctx.writeFile', new context_shell_js_1.ContextShellTool('writeFile'));
    }
    async execute(definition, inputs, tenantId = 'default') {
        const context = {
            runId: (0, crypto_1.randomUUID)(),
            tenantId,
            inputs,
            steps: {},
        };
        const startTime = Date.now();
        logger_js_1.default.info({ workflowId: definition.id, runId: context.runId, tenantId }, 'Starting workflow');
        try {
            for (const step of definition.steps) {
                logger_js_1.default.debug({ stepId: step.id, tool: step.tool, runId: context.runId }, 'Executing step');
                const stepStartTime = Date.now();
                const tool = this.registry.get(step.tool);
                if (!tool) {
                    throw new Error(`Tool not found: ${step.tool}`);
                }
                // 1. Resolve Parameters
                const resolvedParams = this.resolveParams(step.params, context);
                // 2. Execute
                try {
                    const result = await tool.execute(resolvedParams, context);
                    context.steps[step.id] = { output: result, status: 'completed' };
                    // Record Job (Step) Metrics
                    if (metrics_js_1.metrics.maestroJobExecutionDurationSeconds) {
                        metrics_js_1.metrics.maestroJobExecutionDurationSeconds.observe({ job_type: step.tool, status: 'success', tenant_id: tenantId }, (Date.now() - stepStartTime) / 1000);
                    }
                }
                catch (err) {
                    logger_js_1.default.error({ stepId: step.id, error: err.message, runId: context.runId }, 'Step failed');
                    context.steps[step.id] = { error: err.message, status: 'failed' };
                    // Record Job (Step) Metrics
                    if (metrics_js_1.metrics.maestroJobExecutionDurationSeconds) {
                        metrics_js_1.metrics.maestroJobExecutionDurationSeconds.observe({ job_type: step.tool, status: 'failed', tenant_id: tenantId }, (Date.now() - stepStartTime) / 1000);
                    }
                    throw err; // Stop execution on failure for now
                }
            }
            // Record DAG (Workflow) Metrics
            if (metrics_js_1.metrics.maestroDagExecutionDurationSeconds) {
                metrics_js_1.metrics.maestroDagExecutionDurationSeconds.observe({ dag_id: definition.id, status: 'success', tenant_id: tenantId }, (Date.now() - startTime) / 1000);
            }
            logger_js_1.default.info({ workflowId: definition.id, runId: context.runId }, 'Workflow completed');
            return context.steps;
        }
        catch (error) {
            // Record DAG (Workflow) Metrics
            if (metrics_js_1.metrics.maestroDagExecutionDurationSeconds) {
                metrics_js_1.metrics.maestroDagExecutionDurationSeconds.observe({ dag_id: definition.id, status: 'failed', tenant_id: tenantId }, (Date.now() - startTime) / 1000);
            }
            throw error;
        }
    }
    /**
     * Resolves parameters with variable substitution.
     * - Exact match "{{foo}}" -> returns raw value (Object, Array, etc.)
     * - Partial match "Value: {{foo}}" -> returns interpolated string
     */
    resolveParams(params, context) {
        if (typeof params === 'string') {
            // Check for exact match: starts with {{, ends with }}, and no other characters outside
            const exactMatch = params.match(/^\{\{([\w\.]+)\}\}$/);
            if (exactMatch) {
                // Return the raw value directly to preserve type
                return this.getValueByPath(context, exactMatch[1]);
            }
            // Fallback to string interpolation for partial matches
            return params.replace(/\{\{([\w\.]+)\}\}/g, (_, path) => {
                const val = this.getValueByPath(context, path);
                if (typeof val === 'object') {
                    return JSON.stringify(val); // Avoid [object Object]
                }
                return String(val);
            });
        }
        else if (Array.isArray(params)) {
            return params.map(p => this.resolveParams(p, context));
        }
        else if (typeof params === 'object' && params !== null) {
            const resolved = {};
            for (const [key, value] of Object.entries(params)) {
                resolved[key] = this.resolveParams(value, context);
            }
            return resolved;
        }
        return params;
    }
    getValueByPath(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
}
exports.WorkflowEngine = WorkflowEngine;
