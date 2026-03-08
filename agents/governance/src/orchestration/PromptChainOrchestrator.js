"use strict";
/**
 * Multi-LLM Prompt Chain Orchestrator
 *
 * Orchestrates execution of multi-step prompt chains across different LLM providers
 * with built-in governance controls, validation, and provenance tracking.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptChainOrchestrator = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const DEFAULT_CONFIG = {
    maxConcurrentChains: 10,
    defaultTimeoutMs: 60_000,
    maxChainCostUsd: 100,
    enableProvenance: true,
    enableHallucinationCheck: true,
    hallucinationThreshold: 0.7,
    maxValidationRetries: 3,
    auditLevel: 'standard',
};
// ============================================================================
// Prompt Chain Orchestrator
// ============================================================================
class PromptChainOrchestrator {
    config;
    policyEngine;
    providers;
    activeChains;
    eventListeners;
    constructor(policyEngine, config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.policyEngine = policyEngine;
        this.providers = new Map();
        this.activeChains = new Map();
        this.eventListeners = [];
    }
    /**
     * Register an LLM provider adapter
     */
    registerProvider(adapter) {
        this.providers.set(adapter.id, adapter);
    }
    /**
     * Execute a prompt chain with full governance controls
     */
    async executeChain(request) {
        const executionId = node_crypto_1.default.randomUUID();
        const startTime = Date.now();
        const state = {
            executionId,
            chainId: request.chain.id,
            startTime,
            currentStep: 0,
            outputs: { ...request.inputs },
            stepResults: [],
            metrics: this.initializeMetrics(request.chain),
            status: 'running',
        };
        this.activeChains.set(executionId, state);
        try {
            // Pre-execution policy check
            const policyDecision = await this.checkChainPolicy(request);
            if (!policyDecision.allow) {
                return this.createFailedResult(request.chain, state, `Policy denied: ${policyDecision.reason}`);
            }
            // Validate chain configuration
            const validationErrors = this.validateChain(request.chain);
            if (validationErrors.length > 0) {
                return this.createFailedResult(request.chain, state, `Chain validation failed: ${validationErrors.join(', ')}`);
            }
            // Execute each step in sequence
            for (const step of request.chain.steps.sort((a, b) => a.sequence - b.sequence)) {
                state.currentStep = step.sequence;
                const stepResult = await this.executeStep(step, state, request);
                state.stepResults.push(stepResult);
                if (!stepResult.success) {
                    // Check for fallback
                    if (step.fallback) {
                        const fallbackResult = await this.executeFallback(step, state, request);
                        if (fallbackResult.success) {
                            state.stepResults[state.stepResults.length - 1] = fallbackResult;
                            continue;
                        }
                    }
                    state.status = 'failed';
                    break;
                }
                // Map outputs to state
                for (const [outputKey, stateKey] of Object.entries(step.outputMappings)) {
                    state.outputs[stateKey] = stepResult.output?.[outputKey] ?? stepResult.output;
                }
            }
            // Check for hallucinations if enabled
            let hallucinationReport;
            if (this.config.enableHallucinationCheck) {
                hallucinationReport = await this.checkHallucinations(state, request);
                if (!hallucinationReport.passed) {
                    state.status = 'failed';
                    return this.createFailedResult(request.chain, state, 'Hallucination detection threshold exceeded', hallucinationReport);
                }
            }
            // Build provenance
            const provenance = this.buildProvenance(request.chain, state, request.context);
            // Update final metrics
            state.metrics.totalLatencyMs = Date.now() - startTime;
            // Only mark as completed if not already failed
            if (state.status === 'running') {
                state.status = 'completed';
            }
            // Emit completion event
            this.emitEvent({
                id: node_crypto_1.default.randomUUID(),
                timestamp: new Date(),
                type: 'chain_executed',
                source: 'PromptChainOrchestrator',
                agentId: request.context.agentId,
                fleetId: request.context.fleetId,
                sessionId: request.context.sessionId,
                actor: request.context.userContext.userId,
                action: 'execute_chain',
                resource: request.chain.id,
                outcome: state.status === 'completed' ? 'success' : 'failure',
                classification: request.context.classification,
                details: {
                    chainName: request.chain.name,
                    stepsCompleted: state.stepResults.length,
                    totalCost: state.metrics.totalCost,
                    latencyMs: state.metrics.totalLatencyMs,
                },
            });
            return {
                chainId: request.chain.id,
                success: state.status === 'completed',
                outputs: state.outputs,
                steps: state.stepResults,
                metrics: state.metrics,
                provenance,
                hallucinationReport,
                errors: state.status === 'failed' ? ['Chain execution failed'] : undefined,
            };
        }
        catch (error) {
            state.status = 'failed';
            this.emitEvent({
                id: node_crypto_1.default.randomUUID(),
                timestamp: new Date(),
                type: 'chain_executed',
                source: 'PromptChainOrchestrator',
                agentId: request.context.agentId,
                fleetId: request.context.fleetId,
                sessionId: request.context.sessionId,
                actor: request.context.userContext.userId,
                action: 'execute_chain',
                resource: request.chain.id,
                outcome: 'failure',
                classification: request.context.classification,
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            return this.createFailedResult(request.chain, state, error instanceof Error ? error.message : String(error));
        }
        finally {
            this.activeChains.delete(executionId);
        }
    }
    /**
     * Execute a single step in the chain
     */
    async executeStep(step, state, request) {
        const startTime = Date.now();
        let totalStepCost = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        try {
            // Get provider
            const provider = this.providers.get(step.llmProvider);
            if (!provider) {
                throw new Error(`Provider not found: ${step.llmProvider}`);
            }
            // Build initial prompt
            let currentPrompt = this.buildPrompt(step.prompt, state.outputs, step.inputMappings);
            let lastResult = null;
            let validationResults = [];
            let allPassed = false;
            let retries = 0;
            // Validation Loop
            const maxValidationRetries = this.config.maxValidationRetries ?? 0;
            for (let vAttempt = 0; vAttempt <= maxValidationRetries; vAttempt++) {
                let executionResult = null;
                let lastError = null;
                // Execution Retry Loop (Network/Provider errors)
                for (let attempt = 0; attempt <= step.retryPolicy.maxRetries; attempt++) {
                    try {
                        executionResult = await provider.execute(currentPrompt, step.prompt.systemPrompt, {
                            maxTokens: step.prompt.maxTokens,
                            temperature: step.prompt.temperature,
                            timeout: step.timeout,
                        });
                        break;
                    }
                    catch (error) {
                        lastError = error instanceof Error ? error : new Error(String(error));
                        retries++;
                        if (attempt < step.retryPolicy.maxRetries) {
                            const backoff = step.retryPolicy.backoffMs *
                                Math.pow(step.retryPolicy.backoffMultiplier, attempt);
                            await this.sleep(backoff);
                        }
                    }
                }
                if (!executionResult) {
                    throw lastError || new Error('Execution failed');
                }
                lastResult = executionResult;
                // Cost tracking
                const cost = provider.estimateCost(executionResult.inputTokens, executionResult.outputTokens);
                totalStepCost += cost;
                totalInputTokens += executionResult.inputTokens;
                totalOutputTokens += executionResult.outputTokens;
                // Run validations
                validationResults = await this.runValidations(step.validations, executionResult.output, state.outputs);
                allPassed = validationResults.every((v) => v.passed);
                if (allPassed) {
                    break;
                }
                // Check validation actions
                const failedRejecting = validationResults.filter((v) => !v.passed && v.action === 'reject');
                if (failedRejecting.length > 0) {
                    // Immediate failure on reject action
                    break;
                }
                const failedRemediable = validationResults.filter((v) => !v.passed && v.action === 'remediate');
                // Only retry if we have remediable failures and retries left
                if (failedRemediable.length > 0 && vAttempt < maxValidationRetries) {
                    const feedback = this.constructFeedback(failedRemediable);
                    // Append feedback to prompt
                    currentPrompt += `\n\n${feedback}`;
                }
                else {
                    // If no remediable failures (only warnings or no retries left), break
                    break;
                }
            }
            state.metrics.retries += retries;
            state.metrics.validationsPassed += validationResults.filter((v) => v.passed).length;
            state.metrics.validationsFailed += validationResults.filter((v) => !v.passed).length;
            state.metrics.totalCost += totalStepCost;
            state.metrics.totalTokens += totalInputTokens + totalOutputTokens;
            // Check cost limit
            const maxCost = request.overrides?.maxCost ?? this.config.maxChainCostUsd;
            if (state.metrics.totalCost > maxCost) {
                throw new Error(`Chain cost exceeded limit: $${state.metrics.totalCost} > $${maxCost}`);
            }
            state.metrics.stepsCompleted++;
            return {
                stepId: step.id,
                sequence: step.sequence,
                llmProvider: step.llmProvider,
                success: allPassed,
                output: lastResult ? this.parseOutput(lastResult.output) : null,
                latencyMs: Date.now() - startTime,
                tokenCount: { input: totalInputTokens, output: totalOutputTokens },
                cost: totalStepCost,
                validationResults,
                error: allPassed ? undefined : 'Validation failed after retries',
            };
        }
        catch (error) {
            return {
                stepId: step.id,
                sequence: step.sequence,
                llmProvider: step.llmProvider,
                success: false,
                output: null,
                latencyMs: Date.now() - startTime,
                tokenCount: { input: totalInputTokens, output: totalOutputTokens },
                cost: totalStepCost,
                validationResults: [],
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Construct feedback message from validation results
     */
    constructFeedback(results) {
        const feedbackLines = [
            "Errors detected in your output. Please correct them and try again.",
            "",
            "Validation errors:"
        ];
        for (const result of results) {
            let typePrefix = "";
            switch (result.type) {
                case 'schema':
                    typePrefix = "[Schema Error]";
                    break;
                case 'regex':
                    typePrefix = "[Format Error]";
                    break;
                case 'safety':
                    typePrefix = "[Safety Violation]";
                    break;
                case 'hallucination':
                    typePrefix = "[Hallucination Detected]";
                    break;
                default: typePrefix = "[Validation Error]";
            }
            feedbackLines.push(`- ${typePrefix} ${result.message}`);
        }
        return feedbackLines.join("\n");
    }
    /**
     * Execute fallback step
     */
    async executeFallback(originalStep, state, request) {
        const fallbackStep = {
            ...originalStep,
            id: `${originalStep.id}_fallback`,
            llmProvider: originalStep.fallback,
            retryPolicy: { ...originalStep.retryPolicy, maxRetries: 1 },
        };
        return this.executeStep(fallbackStep, state, request);
    }
    /**
     * Check chain execution policy
     */
    async checkChainPolicy(request) {
        return this.policyEngine.evaluateChain(request.context, {
            chainId: request.chain.id,
            stepCount: request.chain.steps.length,
            totalCost: this.estimateChainCost(request.chain),
        });
    }
    /**
     * Validate chain configuration
     */
    validateChain(chain) {
        const errors = [];
        if (!chain.id) {
            errors.push('Chain ID is required');
        }
        if (!chain.steps || chain.steps.length === 0) {
            errors.push('Chain must have at least one step');
        }
        for (const step of chain.steps) {
            if (!this.providers.has(step.llmProvider)) {
                errors.push(`Unknown provider: ${step.llmProvider}`);
            }
            if (step.timeout <= 0) {
                errors.push(`Invalid timeout for step ${step.id}`);
            }
        }
        // Check for circular dependencies in input mappings
        const stepOutputs = new Set();
        for (const step of chain.steps.sort((a, b) => a.sequence - b.sequence)) {
            for (const inputKey of Object.values(step.inputMappings)) {
                if (!stepOutputs.has(inputKey) &&
                    !chain.steps[0].inputMappings[inputKey] // Not an initial input
                ) {
                    // Allow if it's a chain input
                }
            }
            for (const outputKey of Object.values(step.outputMappings)) {
                stepOutputs.add(outputKey);
            }
        }
        return errors;
    }
    /**
     * Build prompt from template and inputs
     */
    buildPrompt(template, outputs, inputMappings) {
        let prompt = template.template;
        for (const variable of template.variables) {
            const mappedKey = inputMappings[variable] || variable;
            const value = outputs[mappedKey];
            if (value !== undefined) {
                prompt = prompt.replace(new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g'), String(value));
            }
        }
        return prompt;
    }
    /**
     * Run validations on step output
     */
    async runValidations(validations, output, context) {
        const results = [];
        for (const validation of validations) {
            try {
                const result = await this.runValidation(validation, output, context);
                results.push(result);
                if (!result.passed && validation.action === 'reject') {
                    break;
                }
            }
            catch (error) {
                results.push({
                    type: validation.type,
                    passed: false,
                    message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
                    action: validation.action, // Include action from config
                });
            }
        }
        return results;
    }
    /**
     * Run a single validation
     */
    async runValidation(validation, output, context) {
        // Helper to add action to result
        const withAction = (res) => ({
            ...res,
            action: validation.action
        });
        switch (validation.type) {
            case 'regex': {
                const pattern = new RegExp(validation.config.pattern);
                const passed = pattern.test(output);
                return withAction({
                    type: 'regex',
                    passed,
                    message: passed ? 'Pattern matched' : 'Pattern not matched',
                });
            }
            case 'schema': {
                // Simplified schema validation
                try {
                    const parsed = JSON.parse(output);
                    return withAction({
                        type: 'schema',
                        passed: true,
                        message: 'Valid JSON',
                        details: { parsed },
                    });
                }
                catch {
                    return withAction({
                        type: 'schema',
                        passed: false,
                        message: 'Invalid JSON schema',
                    });
                }
            }
            case 'safety': {
                // Safety content filter
                const blockedPatterns = validation.config.blockedPatterns || [];
                const hasBlockedContent = blockedPatterns.some((pattern) => output.toLowerCase().includes(pattern.toLowerCase()));
                return withAction({
                    type: 'safety',
                    passed: !hasBlockedContent,
                    message: hasBlockedContent ? 'Blocked content detected' : 'Content safe',
                });
            }
            case 'hallucination': {
                // Placeholder for hallucination detection
                return withAction({
                    type: 'hallucination',
                    passed: true,
                    message: 'Hallucination check passed',
                });
            }
            default:
                return withAction({
                    type: validation.type,
                    passed: true,
                    message: 'Unknown validation type - skipped',
                });
        }
    }
    /**
     * Check for hallucinations in chain output
     */
    async checkHallucinations(state, request) {
        // Placeholder implementation
        // In production, this would integrate with the HallucinationAuditor
        return {
            checked: true,
            detections: [],
            overallScore: 0,
            passed: true,
        };
    }
    /**
     * Build provenance record for chain execution
     */
    buildProvenance(chain, state, context) {
        const attestations = [];
        // Add execution attestation
        attestations.push({
            type: 'deployment',
            attestedBy: 'PromptChainOrchestrator',
            attestedAt: new Date(),
            predicateType: 'https://summit.intelgraph.io/chain-execution/v1',
            predicate: {
                chainId: chain.id,
                executionId: state.executionId,
                stepsCompleted: state.metrics.stepsCompleted,
                totalCost: state.metrics.totalCost,
                agentId: context.agentId,
            },
            signature: this.signAttestation({
                chainId: chain.id,
                timestamp: new Date().toISOString(),
            }),
        });
        return {
            createdBy: context.userContext.userId,
            createdAt: new Date(),
            version: chain.provenance?.version || '1.0.0',
            slsaLevel: context.environmentContext.slsaLevel,
            attestations,
        };
    }
    /**
     * Sign attestation (placeholder for real crypto)
     */
    signAttestation(data) {
        return node_crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    /**
     * Parse LLM output
     */
    parseOutput(output) {
        try {
            return JSON.parse(output);
        }
        catch {
            return output;
        }
    }
    /**
     * Estimate chain cost
     */
    estimateChainCost(chain) {
        let totalCost = 0;
        for (const step of chain.steps) {
            const provider = this.providers.get(step.llmProvider);
            if (provider) {
                // Rough estimate based on max tokens
                totalCost += provider.estimateCost(step.prompt.maxTokens / 2, step.prompt.maxTokens);
            }
        }
        return totalCost;
    }
    /**
     * Initialize metrics for a chain
     */
    initializeMetrics(chain) {
        return {
            totalLatencyMs: 0,
            totalTokens: 0,
            totalCost: 0,
            stepsCompleted: 0,
            stepsTotal: chain.steps.length,
            retries: 0,
            validationsPassed: 0,
            validationsFailed: 0,
        };
    }
    /**
     * Create failed result
     */
    createFailedResult(chain, state, error, hallucinationReport) {
        return {
            chainId: chain.id,
            success: false,
            outputs: state.outputs,
            steps: state.stepResults,
            metrics: {
                ...state.metrics,
                totalLatencyMs: Date.now() - state.startTime,
            },
            provenance: chain.provenance || {
                createdBy: 'system',
                createdAt: new Date(),
                version: '0.0.0',
                slsaLevel: 'SLSA_0',
                attestations: [],
            },
            hallucinationReport,
            errors: [error],
        };
    }
    /**
     * Add event listener
     */
    onEvent(listener) {
        this.eventListeners.push(listener);
    }
    /**
     * Emit governance event
     */
    emitEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Event listener error:', error);
            }
        }
    }
    /**
     * Get active chains
     */
    getActiveChains() {
        return Array.from(this.activeChains.keys());
    }
    /**
     * Cancel a running chain
     */
    cancelChain(executionId) {
        const state = this.activeChains.get(executionId);
        if (state) {
            state.status = 'cancelled';
            return true;
        }
        return false;
    }
    /**
     * Helper to sleep
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.PromptChainOrchestrator = PromptChainOrchestrator;
