"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runbookEngine = exports.RunbookEngine = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
const events_1 = require("events");
const ledger_js_1 = require("../../provenance/ledger.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'RunbookEngine' });
class RunbookEngine extends events_1.EventEmitter {
    definitions = new Map();
    stepImplementations = new Map();
    activeContexts = new Map();
    constructor() {
        super();
    }
    registerStep(type, implementation) {
        this.stepImplementations.set(type, implementation);
    }
    registerDefinition(definition) {
        this.definitions.set(definition.id, definition);
    }
    getDefinition(id) {
        return this.definitions.get(id);
    }
    listDefinitions() {
        return Array.from(this.definitions.values());
    }
    async executeRunbook(runbookId, inputs, userId, tenantId) {
        const definition = this.definitions.get(runbookId);
        if (!definition) {
            throw new Error(`Runbook definition ${runbookId} not found`);
        }
        const runId = (0, crypto_1.randomUUID)();
        const startTime = new Date();
        const context = {
            runId,
            runbookId,
            userId,
            tenantId,
            startTime,
            inputs,
            outputs: new Map(),
            logs: [],
        };
        this.activeContexts.set(runId, context);
        // Record start in Prov-Ledger
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'RUNBOOK_START',
            resourceType: 'runbook_run',
            resourceId: runId,
            actorId: userId,
            actorType: 'user',
            timestamp: startTime,
            payload: { runbookId, inputs },
            metadata: { purpose: 'Runbook Execution' }
        });
        // Start execution in background (or await if synchronous needed, but typically async)
        this.executeDAG(definition, context).catch(err => {
            logger.error({ runId, err }, 'Runbook execution failed');
            // Record failure
            ledger_js_1.provenanceLedger.appendEntry({
                tenantId,
                actionType: 'RUNBOOK_FAILURE',
                resourceType: 'runbook_run',
                resourceId: runId,
                actorId: 'system',
                actorType: 'system',
                timestamp: new Date(),
                payload: { error: err.message },
                metadata: {}
            });
        });
        return runId;
    }
    async executeDAG(definition, context) {
        const executedSteps = new Set();
        const pendingSteps = new Set(definition.steps.map(s => s.id));
        // Simple topological execution
        while (pendingSteps.size > 0) {
            const runnableSteps = definition.steps.filter(step => pendingSteps.has(step.id) &&
                (step.dependencies || []).every(dep => executedSteps.has(dep)));
            if (runnableSteps.length === 0) {
                throw new Error('Circular dependency or invalid DAG detected');
            }
            // Execute runnable steps in parallel
            await Promise.all(runnableSteps.map(async (step) => {
                try {
                    await this.executeStep(step, context);
                    executedSteps.add(step.id);
                    pendingSteps.delete(step.id);
                }
                catch (err) {
                    throw err;
                }
            }));
        }
        // Record completion
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: context.tenantId,
            actionType: 'RUNBOOK_COMPLETE',
            resourceType: 'runbook_run',
            resourceId: context.runId,
            actorId: 'system',
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                outputs: Object.fromEntries(context.outputs)
            },
            metadata: {}
        });
        this.emit('runbookCompleted', context.runId);
    }
    async executeStep(step, context) {
        const implementation = this.stepImplementations.get(step.type);
        if (!implementation) {
            throw new Error(`Step implementation ${step.type} not found`);
        }
        const stepStartTime = new Date();
        // Resolve parameters (replace variables from inputs/outputs)
        const resolvedParams = this.resolveParameters(step.parameters || {}, context);
        try {
            const result = await implementation.execute(context, resolvedParams);
            context.outputs.set(step.id, result);
            context.logs.push({
                stepId: step.id,
                status: 'success',
                timestamp: new Date(),
                result
            });
            // Audit step execution
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: context.tenantId,
                actionType: 'RUNBOOK_STEP_EXECUTE',
                resourceType: 'runbook_step',
                resourceId: `${context.runId}:${step.id}`,
                actorId: 'system',
                actorType: 'system',
                timestamp: new Date(),
                payload: {
                    stepId: step.id,
                    type: step.type,
                    params: resolvedParams,
                    result
                },
                metadata: {}
            });
        }
        catch (err) {
            context.logs.push({
                stepId: step.id,
                status: 'error',
                timestamp: new Date(),
                error: err.message
            });
            throw err;
        }
    }
    resolveParameters(params, context) {
        // Deep clone and replace
        const resolved = JSON.parse(JSON.stringify(params));
        // Recursively replace placeholders like {{inputs.x}} or {{steps.stepId.output.y}}
        const replace = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = this.interpolate(obj[key], context);
                }
                else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    replace(obj[key]);
                }
            }
        };
        replace(resolved);
        return resolved;
    }
    interpolate(str, context) {
        if (!str.startsWith('{{') || !str.endsWith('}}'))
            return str;
        const path = str.slice(2, -2).trim();
        const parts = path.split('.');
        if (parts[0] === 'inputs') {
            return context.inputs[parts[1]];
        }
        else if (parts[0] === 'steps') {
            const stepId = parts[1];
            const outputKey = parts[3]; // steps.id.output.key
            const stepOutput = context.outputs.get(stepId);
            return stepOutput ? stepOutput[outputKey] : undefined;
        }
        return str;
    }
    getStatus(runId) {
        const context = this.activeContexts.get(runId);
        if (!context)
            return null;
        return {
            runId: context.runId,
            status: 'running', // Simplified
            logs: context.logs
        };
    }
    async replay(runId, tenantId) {
        // Fetch logs from Prov-Ledger
        const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, {
            resourceType: 'runbook_step'
        });
        // Filter by runId in resourceId or payload (simplified)
        return entries.filter(e => e.resourceId.startsWith(runId + ':'));
    }
}
exports.RunbookEngine = RunbookEngine;
exports.runbookEngine = new RunbookEngine();
