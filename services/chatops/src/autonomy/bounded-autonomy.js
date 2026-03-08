"use strict";
// @ts-nocheck
/**
 * Bounded Autonomy Engine
 *
 * Implements risk-tiered agent execution with ReAct traces:
 * - Plan Agent: Decompose intent into subtasks
 * - Research Agent: RAG over knowledge graph
 * - Executor Agent: Invoke tools with risk gates
 *
 * Risk Tiers:
 * - AUTONOMOUS: Low-risk reads, summaries (execute immediately)
 * - HITL: Moderate risk, analyst approval required
 * - PROHIBITED: High-risk, blocked with audit logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoundedAutonomyEngine = exports.ReActTraceRecorder = exports.RiskClassifier = void 0;
exports.createBoundedAutonomyEngine = createBoundedAutonomyEngine;
const uuid_1 = require("uuid");
const opa_client_js_1 = require("../utils/opa-client.js");
// =============================================================================
// RISK CLASSIFIER
// =============================================================================
class RiskClassifier {
    opa;
    constructor() {
        this.opa = new opa_client_js_1.OpaClient();
    }
    /**
     * Classify an operation's risk level using OPA
     */
    async classify(operation, context) {
        const policyInput = {
            operation: operation.operation,
            tool_id: operation.toolId,
            input: operation.input,
            tenant_id: context.tenantId,
            user_id: context.userId,
            user_roles: context.roles,
            user_clearance: context.clearanceLevel,
            data_classification: operation.dataClassification || 'UNCLASSIFIED',
        };
        const decision = await this.opa.evaluate(policyInput);
        return {
            level: decision.risk_level,
            reason: decision.reason,
            requiredApprovals: decision.required_approvals,
            requiredRoles: decision.approver_roles,
            auditRequirements: decision.requires_audit ? [
                {
                    type: decision.risk_level === 'prohibited' ? 'alert' : 'log',
                    retention: 'permanent',
                    notifyRoles: ['security-officer'],
                }
            ] : undefined,
        };
    }
}
exports.RiskClassifier = RiskClassifier;
// =============================================================================
// REACT TRACE RECORDER
// =============================================================================
class ReActTraceRecorder {
    traces = new Map();
    /**
     * Start a new trace
     */
    startTrace(sessionId, userId, tenantId) {
        const trace = {
            traceId: (0, uuid_1.v4)(),
            sessionId,
            userId,
            tenantId,
            startTime: new Date(),
            steps: [],
            finalOutcome: 'partial',
            totalTokens: 0,
            totalLatencyMs: 0,
            hitlEscalations: 0,
            prohibitedBlocks: 0,
        };
        this.traces.set(trace.traceId, trace);
        return trace;
    }
    /**
     * Record a thought step
     */
    recordThought(traceId, thought) {
        const trace = this.traces.get(traceId);
        if (!trace)
            throw new Error(`Trace ${traceId} not found`);
        const stepNumber = trace.steps.length + 1;
        const step = {
            stepNumber,
            thought,
            action: {
                tool: '',
                input: {},
                riskLevel: 'autonomous',
            },
            observation: {
                result: null,
                success: false,
                tokensUsed: 0,
                latencyMs: 0,
            },
            timestamp: new Date(),
        };
        trace.steps.push(step);
    }
    /**
     * Record an action
     */
    recordAction(traceId, tool, input, riskLevel) {
        const trace = this.traces.get(traceId);
        if (!trace)
            throw new Error(`Trace ${traceId} not found`);
        const currentStep = trace.steps[trace.steps.length - 1];
        if (!currentStep)
            throw new Error('No thought recorded before action');
        currentStep.action = {
            tool,
            input,
            riskLevel,
        };
        if (riskLevel === 'hitl') {
            trace.hitlEscalations++;
        }
        else if (riskLevel === 'prohibited') {
            trace.prohibitedBlocks++;
        }
    }
    /**
     * Record an observation
     */
    recordObservation(traceId, result, success, tokensUsed, latencyMs, error) {
        const trace = this.traces.get(traceId);
        if (!trace)
            throw new Error(`Trace ${traceId} not found`);
        const currentStep = trace.steps[trace.steps.length - 1];
        if (!currentStep)
            throw new Error('No action recorded before observation');
        currentStep.observation = {
            result,
            success,
            tokensUsed,
            latencyMs,
            error,
        };
        trace.totalTokens += tokensUsed;
        trace.totalLatencyMs += latencyMs;
    }
    /**
     * Complete a trace
     */
    completeTrace(traceId, outcome) {
        const trace = this.traces.get(traceId);
        if (!trace)
            throw new Error(`Trace ${traceId} not found`);
        trace.endTime = new Date();
        trace.finalOutcome = outcome;
        return trace;
    }
    /**
     * Get a trace by ID
     */
    getTrace(traceId) {
        return this.traces.get(traceId);
    }
}
exports.ReActTraceRecorder = ReActTraceRecorder;
class BoundedAutonomyEngine {
    config;
    riskClassifier;
    traceRecorder;
    toolRegistry;
    approvalService;
    auditService;
    constructor(config, toolRegistry, approvalService, auditService, customRiskRules) {
        this.config = config;
        this.riskClassifier = new RiskClassifier(customRiskRules);
        this.traceRecorder = new ReActTraceRecorder();
        this.toolRegistry = toolRegistry;
        this.approvalService = approvalService;
        this.auditService = auditService;
    }
    /**
     * Execute an agent task with bounded autonomy
     */
    async execute(intent, context) {
        const trace = this.traceRecorder.startTrace(context.sessionId, context.userId, context.tenantId);
        try {
            // Step 1: Plan - decompose intent into operations
            this.traceRecorder.recordThought(trace.traceId, `Analyzing intent: ${intent.primaryIntent} with confidence ${intent.confidence}`);
            const plan = await this.planOperations(intent);
            this.traceRecorder.recordAction(trace.traceId, 'plan', { operations: plan }, 'autonomous');
            this.traceRecorder.recordObservation(trace.traceId, { plan }, true, 50, 100);
            // Step 2: Execute each operation with risk gates
            const results = [];
            for (const operation of plan) {
                // Classify risk
                const classification = await this.riskClassifier.classify(operation, context);
                this.traceRecorder.recordThought(trace.traceId, `Operation ${operation.toolId}:${operation.operation} classified as ${classification.level}`);
                // Apply risk gate
                const gateResult = await this.applyRiskGate(operation, classification, context, trace);
                if (!gateResult.proceed) {
                    if (gateResult.blocked) {
                        this.traceRecorder.completeTrace(trace.traceId, 'blocked');
                        await this.auditService.logTrace(trace);
                        return { result: { error: 'Operation blocked by policy' }, trace };
                    }
                    continue; // Skip if denied but not blocked
                }
                // Execute operation
                const start = Date.now();
                try {
                    const { result, tokensUsed } = await this.toolRegistry.invoke(operation);
                    const latencyMs = Date.now() - start;
                    this.traceRecorder.recordObservation(trace.traceId, result, true, tokensUsed, latencyMs);
                    results.push(result);
                }
                catch (error) {
                    const latencyMs = Date.now() - start;
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    this.traceRecorder.recordObservation(trace.traceId, null, false, 0, latencyMs, errorMsg);
                    // Self-correction if enabled
                    if (this.config.enableSelfCorrection && trace.steps.length < this.config.maxSteps) {
                        this.traceRecorder.recordThought(trace.traceId, `Error encountered: ${errorMsg}. Attempting recovery...`);
                        // Retry logic could go here
                    }
                }
                // Check step limit
                if (trace.steps.length >= this.config.maxSteps) {
                    this.traceRecorder.recordThought(trace.traceId, `Maximum steps (${this.config.maxSteps}) reached. Stopping execution.`);
                    break;
                }
            }
            // Complete trace
            const outcome = results.length > 0 ? 'success' : 'partial';
            this.traceRecorder.completeTrace(trace.traceId, outcome);
            await this.auditService.logTrace(trace);
            return {
                result: results.length === 1 ? results[0] : results,
                trace,
            };
        }
        catch (error) {
            this.traceRecorder.completeTrace(trace.traceId, 'failed');
            await this.auditService.logTrace(trace);
            throw error;
        }
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    async planOperations(intent) {
        // Map intents to tool operations
        const operations = [];
        switch (intent.primaryIntent) {
            case 'entity_lookup':
                operations.push({
                    toolId: 'graph',
                    operation: 'read',
                    input: { entities: intent.osintEntities },
                });
                break;
            case 'path_finding':
                operations.push({
                    toolId: 'graph',
                    operation: 'query',
                    input: { type: 'shortest_path', entities: intent.osintEntities },
                });
                break;
            case 'threat_assessment':
                operations.push({
                    toolId: 'graph',
                    operation: 'query',
                    input: { type: 'threat_context', entities: intent.osintEntities },
                }, {
                    toolId: 'threat',
                    operation: 'assess',
                    input: { entities: intent.osintEntities },
                });
                break;
            case 'report_generation':
                operations.push({
                    toolId: 'report',
                    operation: 'generate',
                    input: { entities: intent.osintEntities },
                });
                break;
            case 'alert_creation':
                operations.push({
                    toolId: 'alert',
                    operation: 'create',
                    input: { entities: intent.osintEntities },
                });
                break;
            case 'data_export':
                operations.push({
                    toolId: 'data',
                    operation: 'export',
                    input: { entities: intent.osintEntities },
                });
                break;
            default:
                operations.push({
                    toolId: 'graph',
                    operation: 'query',
                    input: { type: 'general', entities: intent.osintEntities },
                });
        }
        return operations;
    }
    async applyRiskGate(operation, classification, context, trace) {
        switch (classification.level) {
            case 'autonomous':
                this.traceRecorder.recordAction(trace.traceId, operation.toolId, operation.input, 'autonomous');
                return { proceed: true, blocked: false };
            case 'hitl': {
                this.traceRecorder.recordAction(trace.traceId, operation.toolId, operation.input, 'hitl');
                // Create approval request
                const request = {
                    requestId: (0, uuid_1.v4)(),
                    sessionId: context.sessionId,
                    userId: context.userId,
                    tenantId: context.tenantId,
                    operation,
                    classification,
                    trace,
                    status: 'pending',
                    requestedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
                    approvals: [],
                };
                const requestId = await this.approvalService.requestApproval(request);
                // Wait for approval (with timeout)
                const approved = await this.approvalService.waitForApproval(requestId, this.config.stepTimeoutMs);
                this.traceRecorder.recordObservation(trace.traceId, { approved, requestId }, approved, 0, 0, approved ? undefined : 'Approval denied or timed out');
                return { proceed: approved, blocked: false };
            }
            case 'prohibited':
                this.traceRecorder.recordAction(trace.traceId, operation.toolId, operation.input, 'prohibited');
                await this.auditService.logBlocked(operation, classification);
                this.traceRecorder.recordObservation(trace.traceId, null, false, 0, 0, `Prohibited: ${classification.reason}`);
                return { proceed: false, blocked: true };
            default:
                return { proceed: false, blocked: true };
        }
    }
}
exports.BoundedAutonomyEngine = BoundedAutonomyEngine;
// =============================================================================
// FACTORY
// =============================================================================
function createBoundedAutonomyEngine(config, toolRegistry, approvalService, auditService, customRiskRules) {
    return new BoundedAutonomyEngine(config, toolRegistry, approvalService, auditService, customRiskRules);
}
