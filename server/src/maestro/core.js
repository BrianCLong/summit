"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Maestro = void 0;
const residency_guard_js_1 = require("../data-residency/residency-guard.js");
const governance_service_js_1 = require("./governance-service.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
const budget_js_1 = require("./budget.js");
const client_js_1 = require("../conductor/mcp/client.js");
class Maestro {
    ig;
    costMeter;
    llm;
    config;
    constructor(ig, costMeter, llm, config) {
        this.ig = ig;
        this.costMeter = costMeter;
        this.llm = llm;
        this.config = config;
    }
    async getTask(taskId) {
        return this.ig.getTask(taskId);
    }
    async createRun(userId, requestText, options) {
        const reasoningBudget = (0, budget_js_1.normalizeReasoningBudget)(options?.reasoningBudget);
        const run = {
            id: crypto.randomUUID(),
            user: { id: userId },
            createdAt: new Date().toISOString(),
            requestText,
            // Pass tenant context if available (will need DB schema update for full persistence)
            ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
            reasoningBudget,
        };
        await this.ig.createRun(run);
        return run;
    }
    async planRequest(run) {
        // Here you can do something simple at first: single action task
        const tenantId = run.tenantId;
        const planTask = {
            id: crypto.randomUUID(),
            runId: run.id,
            tenantId: run.tenantId,
            status: 'succeeded', // planning is instant for v0.1
            agent: {
                id: this.config.defaultPlannerAgent,
                name: 'planner',
                kind: 'llm',
                modelId: this.config.defaultPlannerAgent,
            },
            kind: 'plan',
            description: `Plan for: ${run.requestText}`,
            input: { requestText: run.requestText, tenantId },
            output: { steps: ['single_action'] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const actionTask = {
            id: crypto.randomUUID(),
            runId: run.id,
            tenantId: run.tenantId,
            parentTaskId: planTask.id,
            status: 'queued',
            agent: {
                id: this.config.defaultActionAgent,
                name: 'action-llm',
                kind: 'llm',
                modelId: this.config.defaultActionAgent,
            },
            kind: 'action',
            description: `Execute user request: ${run.requestText}`,
            input: { requestText: run.requestText, tenantId },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await this.ig.createTask(planTask);
        await this.ig.createTask(actionTask);
        return [planTask, actionTask];
    }
    async executeTask(task) {
        const now = new Date().toISOString();
        const timer = metrics_js_1.metrics.maestroJobExecutionDurationSeconds.startTimer({ job_type: task.kind, status: 'success' });
        await this.ig.updateTask(task.id, { status: 'running', updatedAt: now });
        try {
            // Residency Check for Agent Execution
            // We assume run or task input has tenantId.
            // If run object isn't passed here, we rely on task input.
            // Or we should fetch the Run. For v0.1 simplification, we assume context is in task inputs
            // or we extract it from runId lookup (not efficient here without caching).
            // Assuming tasks created by createRun have tenantId in their metadata/input if provided.
            const tenantId = task.input?.tenantId;
            if (tenantId) {
                const guard = residency_guard_js_1.ResidencyGuard.getInstance();
                await guard.validateAgentExecution(tenantId);
                // === GLOBAL STEERING CHECK (Task #96) ===
                const { maestroGlobalAgent } = await Promise.resolve().then(() => __importStar(require('./agents/MaestroGlobalAgent.js')));
                const steeringResult = await maestroGlobalAgent.evaluateRouting(task);
                if (steeringResult.action === 'STOP') {
                    const errorMsg = `Task execution forced STOP by Global Steering: ${steeringResult.reason}`;
                    logger_js_1.default.error({ taskId: task.id, reason: steeringResult.reason }, 'Maestro Steering: Execution stopped');
                    await this.ig.updateTask(task.id, { status: 'failed', errorMessage: errorMsg, updatedAt: now });
                    throw new Error(errorMsg);
                }
                if (steeringResult.action === 'REDIRECT') {
                    const { maestroHandoffService } = await Promise.resolve().then(() => __importStar(require('./handoff-service.js')));
                    const handoff = await maestroHandoffService.initiateHandoff(task, steeringResult.advice);
                    if (handoff.success) {
                        const msg = `Task handed off to region ${steeringResult.advice}: ${handoff.message}`;
                        await this.ig.updateTask(task.id, {
                            status: 'succeeded', // In handoff scenario, local task is 'done' once handed off
                            output: { result: msg, handoffId: handoff.handoffId },
                            updatedAt: now
                        });
                        return {
                            task: { ...task, status: 'succeeded', output: { result: msg } },
                            artifact: null
                        };
                    }
                }
                // === SHADOW TRAFFIC INTEGRATION (Task #101) ===
                if (!task.input?._isShadow) {
                    // ... (existing shadow logic)
                }
                // === DEEPFAKE DETECTION (Phase 4) ===
                const mediaUri = task.input?.mediaUri || task.input?.uri;
                const mediaType = task.input?.mediaType;
                if (mediaUri && mediaType) {
                    const { DeepfakeDetectionService } = await Promise.resolve().then(() => __importStar(require('../services/DeepfakeDetectionService.js')));
                    const deepfakeService = new DeepfakeDetectionService();
                    const analysis = await deepfakeService.analyze(mediaUri, mediaType, tenantId);
                    if (analysis.isDeepfake && analysis.riskScore > 80) {
                        const errorMsg = `Security Alert: High-risk deepfake detected in task input. ` +
                            `Risk score: ${analysis.riskScore}. Markers: ${analysis.markers.join(', ')}. ` +
                            `Details: ${analysis.details}`;
                        logger_js_1.default.error({ taskId: task.id, analysis }, 'Deepfake detection blocked task execution');
                        await this.ig.updateTask(task.id, { status: 'failed', errorMessage: errorMsg, updatedAt: now });
                        throw new Error(errorMsg);
                    }
                    if (analysis.isDeepfake) {
                        logger_js_1.default.warn({ taskId: task.id, analysis }, 'Deepfake detected but risk score below threshold. Proceeding with caution.');
                        // Attach analysis to task output or metadata for downstream visibility
                        task.output = { ...task.output, deepfakeAnalysis: analysis };
                    }
                }
            }
            // === GOVERNANCE CHECK (Story 1.1) ===
            // Check agent governance policies before execution
            const governanceService = governance_service_js_1.AgentGovernanceService.getInstance();
            const maestroAgent = {
                id: task.agent.id,
                name: task.agent.name,
                tenantId: tenantId || 'system',
                capabilities: [], // Could be extracted from agent metadata
                metadata: {
                    modelId: task.agent.modelId,
                    kind: task.agent.kind
                },
                status: 'idle',
                health: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    lastHeartbeat: new Date(),
                    activeTasks: 1,
                    errorRate: 0
                },
                templateId: task.agent.kind,
                config: {}
            };
            const governanceDecision = await governanceService.evaluateAction(maestroAgent, task.kind, // action type: 'plan', 'action', 'subworkflow', 'graph.analysis'
            {
                taskId: task.id,
                runId: task.runId,
                description: task.description,
                input: task.input,
                tenantId
            }, {
                source: 'maestro_core_executeTask',
                timestamp: now
            });
            // If governance check fails, fail the task
            if (!governanceDecision.allowed) {
                const errorMessage = `Governance policy violation: ${governanceDecision.reason}. ` +
                    `Risk score: ${governanceDecision.riskScore.toFixed(2)}. ` +
                    `Violations: ${governanceDecision.violations?.map(v => v.violationType).join(', ') || 'none'}`;
                logger_js_1.default.error({
                    taskId: task.id,
                    runId: task.runId,
                    agentId: task.agent.id,
                    decision: governanceDecision
                }, 'Task blocked by governance policy');
                await this.ig.updateTask(task.id, {
                    status: 'failed',
                    errorMessage,
                    updatedAt: now
                });
                throw new Error(errorMessage);
            }
            // If requires approval, set task to pending_approval state (Story 1.3)
            if (governanceDecision.requiredApprovals && governanceDecision.requiredApprovals > 0) {
                logger_js_1.default.warn({
                    taskId: task.id,
                    runId: task.runId,
                    agentId: task.agent.id,
                    requiredApprovals: governanceDecision.requiredApprovals,
                    riskScore: governanceDecision.riskScore
                }, 'Task requires human approval');
                await this.ig.updateTask(task.id, {
                    status: 'pending_approval',
                    errorMessage: `Awaiting ${governanceDecision.requiredApprovals} approval(s). Risk score: ${governanceDecision.riskScore.toFixed(2)}`,
                    updatedAt: now
                });
                // === HITL INTEGRATION (Task #102) ===
                try {
                    const { createApproval } = await Promise.resolve().then(() => __importStar(require('../services/approvals.js')));
                    await createApproval({
                        requesterId: task.agent.id,
                        action: 'maestro_task_execution',
                        payload: { taskId: task.id, taskKind: task.kind, riskScore: governanceDecision.riskScore },
                        reason: `Governance policy flagged for review. Risk: ${governanceDecision.riskScore.toFixed(2)}. ${governanceDecision.reason}`,
                        runId: task.runId
                    });
                }
                catch (approvalError) {
                    logger_js_1.default.error({ taskId: task.id, error: approvalError.message }, 'Maestro: Failed to create approval record');
                }
                // Return task in pending_approval state - execution halts here
                return {
                    task: {
                        ...task,
                        status: 'pending_approval',
                        errorMessage: `Awaiting ${governanceDecision.requiredApprovals} approval(s)`,
                        updatedAt: now
                    },
                    artifact: null
                };
            }
            logger_js_1.default.info({
                taskId: task.id,
                runId: task.runId,
                agentId: task.agent.id,
                riskScore: governanceDecision.riskScore
            }, 'Task passed governance checks, proceeding with execution');
            // === END GOVERNANCE CHECK ===
            // === NARRATIVE IMPACT PREDICTION (Story 3.2) ===
            if (task.kind === 'action' && tenantId) {
                try {
                    const { Neo4jNarrativeLoader } = await Promise.resolve().then(() => __importStar(require('../narrative/adapters/neo4j-loader.js')));
                    const { narrativeSimulationManager } = await Promise.resolve().then(() => __importStar(require('../narrative/manager.js')));
                    const rootId = task.input?.rootId || task.input?.targetId;
                    if (rootId) {
                        const initialEntities = await Neo4jNarrativeLoader.loadFromGraph(rootId, 2);
                        if (initialEntities.length > 0) {
                            const sim = narrativeSimulationManager.createSimulation({
                                name: `Impact Prediction: ${task.id}`,
                                themes: ['Security', 'Trust'],
                                initialEntities,
                                metadata: { taskId: task.id, isShadow: true }
                            });
                            narrativeSimulationManager.injectActorAction(sim.id, task.agent.id, task.description);
                            const predictedState = await narrativeSimulationManager.tick(sim.id, 5);
                            task.output = {
                                ...task.output,
                                impactForecast: {
                                    summary: predictedState.narrative.summary,
                                    arcs: predictedState.arcs.map(arc => ({ theme: arc.theme, momentum: arc.momentum, outlook: arc.outlook }))
                                }
                            };
                            narrativeSimulationManager.remove(sim.id);
                        }
                    }
                }
                catch (simError) {
                    logger_js_1.default.warn({ taskId: task.id, error: simError.message }, 'Maestro: Narrative impact prediction failed (non-blocking)');
                }
            }
            let result = '';
            if (task.agent.kind === 'llm') {
                metrics_js_1.metrics.maestroAiModelRequests.inc({ model: task.agent.modelId, operation: 'executeTask', status: 'attempt' });
                let attempts = 0;
                const maxRetries = 3;
                let lastError;
                while (attempts < maxRetries) {
                    const controller = new AbortController();
                    const signal = controller.signal;
                    let timeoutId;
                    try {
                        const timeout = new Promise((_, reject) => {
                            timeoutId = setTimeout(() => {
                                controller.abort();
                                reject(new Error('LLM execution timed out'));
                            }, 60000);
                        });
                        const llmCall = this.llm.callCompletion(task.runId, task.id, {
                            model: task.agent.modelId,
                            messages: [
                                { role: 'system', content: 'You are an execution agent.' },
                                { role: 'user', content: task.description },
                                ...(task.input.requestText
                                    ? [{ role: 'user', content: String(task.input.requestText) }]
                                    : []),
                            ],
                            tools: client_js_1.mcpRegistry.listServers().flatMap(s => {
                                const srv = client_js_1.mcpRegistry.getServer(s);
                                return srv?.tools.map(t => ({
                                    type: 'function',
                                    function: {
                                        name: t.name,
                                        description: t.description,
                                        parameters: t.schema
                                    }
                                })) || [];
                            })
                        }, {
                            feature: `maestro_${task.kind}`,
                            tenantId: typeof task.input?.tenantId === 'string' ? task.input.tenantId : undefined,
                            environment: process.env.NODE_ENV || 'unknown',
                            // @ts-ignore
                            signal: signal
                        });
                        const llmResult = (await Promise.race([llmCall, timeout]));
                        clearTimeout(timeoutId);
                        if (llmResult.tool_calls && llmResult.tool_calls.length > 0) {
                            const toolLogs = [];
                            const toolOutputs = [];
                            for (const call of llmResult.tool_calls) {
                                const { name, arguments: argsJson } = call.function;
                                const args = JSON.parse(argsJson);
                                // Find server for tool
                                const servers = client_js_1.mcpRegistry.findServersWithTool(name);
                                if (servers.length > 0) {
                                    const toolResult = await client_js_1.mcpClient.executeTool(servers[0], name, args);
                                    toolOutputs.push({ tool: name, result: toolResult });
                                    toolLogs.push(`Executed tool ${name}`);
                                }
                            }
                            result = JSON.stringify({
                                explanation: llmResult.content,
                                tool_results: toolOutputs
                            });
                            task.output = { ...task.output, logs: [...(task.output?.logs || []), ...toolLogs] };
                        }
                        else {
                            result = llmResult.content;
                        }
                        break;
                    }
                    catch (err) {
                        clearTimeout(timeoutId);
                        lastError = err;
                        attempts++;
                        if (!signal.aborted)
                            controller.abort();
                        if (attempts >= maxRetries)
                            break;
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
                    }
                }
                if (!result && lastError)
                    throw lastError;
            }
            else {
                result = 'TODO: implement non-LLM agent';
            }
            const artifact = {
                id: crypto.randomUUID(),
                runId: task.runId,
                taskId: task.id,
                tenantId: task.tenantId,
                kind: 'text',
                label: 'task-output',
                data: result,
                createdAt: new Date().toISOString(),
            };
            const updatedTask = {
                status: 'succeeded',
                output: { ...task.output, result },
                updatedAt: new Date().toISOString(),
            };
            await this.ig.createArtifact(artifact);
            await this.ig.updateTask(task.id, updatedTask);
            timer();
            return {
                task: { ...task, ...updatedTask },
                artifact,
            };
        }
        catch (err) {
            const updatedTask = {
                status: 'failed',
                errorMessage: err?.message ?? String(err),
                updatedAt: new Date().toISOString(),
            };
            await this.ig.updateTask(task.id, updatedTask);
            metrics_js_1.metrics.maestroAiModelErrors.inc({ model: task.agent.modelId || 'unknown' });
            timer({ status: 'failed' });
            return { task: { ...task, ...updatedTask }, artifact: null };
        }
    }
    async runPipeline(userId, requestText, options) {
        const end = metrics_js_1.metrics.maestroOrchestrationDuration.startTimer({ endpoint: 'runPipeline' });
        metrics_js_1.metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'started' });
        metrics_js_1.metrics.maestroActiveSessions.inc({ type: 'pipeline' });
        const startTime = Date.now();
        try {
            const run = await this.createRun(userId, requestText, options);
            const tasks = await this.planRequest(run);
            const executable = tasks.filter(t => t.status === 'queued');
            const results = await Promise.all(executable.map(task => this.executeTask(task)));
            const costSummary = await this.costMeter.summarize(run.id);
            const budgetEvidence = (0, budget_js_1.buildBudgetEvidence)(run.reasoningBudget, {
                success: results.every((result) => result.task.status === 'succeeded'),
                latencyMs: Date.now() - startTime,
                totalCostUSD: costSummary.totalCostUSD,
                totalInputTokens: costSummary.totalInputTokens,
                totalOutputTokens: costSummary.totalOutputTokens,
            });
            await this.ig.updateRun(run.id, {
                reasoningBudgetEvidence: budgetEvidence,
            });
            end();
            metrics_js_1.metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'success' });
            return {
                run,
                tasks: tasks.map(t => ({
                    id: t.id,
                    status: t.status,
                    description: t.description,
                })),
                results,
                costSummary,
            };
        }
        catch (error) {
            metrics_js_1.metrics.maestroOrchestrationErrors.inc({ error_type: 'pipeline_error', endpoint: 'runPipeline' });
            metrics_js_1.metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'error' });
            throw error;
        }
        finally {
            metrics_js_1.metrics.maestroActiveSessions.dec({ type: 'pipeline' });
        }
    }
}
exports.Maestro = Maestro;
