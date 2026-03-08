"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvalRunner = void 0;
exports.createEvalRunner = createEvalRunner;
const node_crypto_1 = require("node:crypto");
const trace_schema_js_1 = require("../runtime/trace-schema.js");
const telemetry_client_js_1 = require("../runtime/telemetry-client.js");
const cost_model_js_1 = require("../runtime/cost-model.js");
const scenario_loader_js_1 = require("./scenario-loader.js");
const metrics_js_1 = require("./metrics.js");
const DEFAULT_CONFIG = {
    scenariosPath: './scenarios',
    outputPath: './experiments/traces.jsonl',
    routingConfig: {
        type: 'greedy_cost',
        costWeight: 0.5,
        latencyBudgetMs: 5000,
        fallbackEnabled: true,
    },
    safetyConfig: {
        enabledChecks: ['jailbreak_detection', 'pii_detection', 'harmful_content'],
        blockOnViolation: true,
        logViolations: true,
    },
    maxConcurrency: 4,
    timeoutMs: 60000,
    dryRun: false,
};
/**
 * EvalRunner - Execute scenarios and collect traces
 *
 * Core evaluation engine that:
 * - Loads and validates scenarios
 * - Executes steps with tracing
 * - Applies routing decisions
 * - Performs safety checks
 * - Collects and aggregates metrics
 */
class EvalRunner {
    config;
    scenarioLoader;
    telemetry;
    costModel;
    metricsCollector;
    router;
    safetyChecker;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.scenarioLoader = new scenario_loader_js_1.ScenarioLoader(this.config.scenariosPath);
        this.telemetry = new telemetry_client_js_1.TelemetryClient({
            outputPath: this.config.outputPath,
        });
        this.costModel = new cost_model_js_1.CostModel();
        this.metricsCollector = new metrics_js_1.MetricsCollector();
    }
    /**
     * Set a custom router implementation
     */
    setRouter(router) {
        this.router = router;
    }
    /**
     * Set a custom safety checker implementation
     */
    setSafetyChecker(checker) {
        this.safetyChecker = checker;
    }
    /**
     * Run a single scenario
     */
    async runScenario(scenarioId) {
        const scenario = this.scenarioLoader.loadScenario(scenarioId);
        return this.executeScenario(scenario);
    }
    /**
     * Run all scenarios
     */
    async runAll() {
        const scenarios = this.scenarioLoader.loadAll();
        const results = [];
        // Run with concurrency limit
        const chunks = this.chunkArray(scenarios, this.config.maxConcurrency);
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map((s) => this.executeScenario(s)));
            results.push(...chunkResults);
        }
        return results;
    }
    /**
     * Run scenarios by category
     */
    async runByCategory(category) {
        const scenarios = this.scenarioLoader.loadByCategory(category);
        return Promise.all(scenarios.map((s) => this.executeScenario(s)));
    }
    /**
     * Execute a single scenario
     */
    async executeScenario(scenario) {
        const runId = (0, node_crypto_1.randomUUID)();
        const trace = new trace_schema_js_1.TraceBuilder(scenario.id, runId);
        const errors = [];
        const assertions = [];
        // Start request trace
        const requestEventId = trace.startEvent('request_start', scenario.name, {
            scenarioId: scenario.id,
            category: scenario.category,
            difficulty: scenario.difficulty,
        });
        try {
            // Execute each step
            for (const step of scenario.steps) {
                await this.executeStep(step, scenario, trace, errors);
            }
            // Evaluate success criteria
            for (const criteria of scenario.successCriteria) {
                const passed = await this.evaluateCriteria(criteria, trace);
                assertions.push({ criteria, passed, actual: null });
            }
        }
        catch (err) {
            const error = err;
            trace.recordError('execution_error', error.message, error.stack);
            errors.push({
                step: 'scenario',
                error: error.message,
                recoverable: false,
            });
        }
        // End request trace
        const success = errors.length === 0 && assertions.every((a) => a.passed);
        trace.endEvent(requestEventId, success ? 'success' : 'failure', {
            durationMs: Date.now() - Date.parse(trace.build().startTime),
        });
        // Build final trace
        const finalTrace = trace.build();
        this.telemetry.recordTrace(finalTrace);
        // Calculate metrics
        const metrics = this.calculateMetrics(finalTrace);
        return {
            scenarioId: scenario.id,
            runId,
            success,
            metrics,
            trace: finalTrace,
            errors,
            assertions,
        };
    }
    /**
     * Execute a single step
     */
    async executeStep(step, scenario, trace, errors) {
        const stepEventId = trace.startEvent('tool_call_start', step.id, {
            type: step.type,
            allowedTools: step.allowedTools,
        });
        const startTime = Date.now();
        try {
            // Safety check on input
            if (this.safetyChecker && step.input) {
                const safetyResult = await this.safetyChecker(step.input);
                trace.recordSafetyCheck('input_check', safetyResult.passed, safetyResult.passed ? 'low' : 'high', safetyResult.violations.join(', '));
                if (!safetyResult.passed && this.config.safetyConfig.blockOnViolation) {
                    throw new Error(`Safety violation: ${safetyResult.violations.join(', ')}`);
                }
            }
            // Route to tool
            if (this.router && step.allowedTools && step.allowedTools.length > 0) {
                const routingDecision = await this.router(step, scenario);
                trace.recordRoutingDecision(routingDecision.tool, routingDecision.score, routingDecision.reasoning, []);
            }
            // Simulate execution (in production, this would call actual tools)
            if (!this.config.dryRun) {
                await this.simulateExecution(step);
            }
            // Check timeout
            const elapsed = Date.now() - startTime;
            if (step.timeout && elapsed > step.timeout) {
                throw new Error(`Step timeout: ${elapsed}ms > ${step.timeout}ms`);
            }
            // Check constraints
            if (step.constraints?.maxLatencyMs && elapsed > step.constraints.maxLatencyMs) {
                errors.push({
                    step: step.id,
                    error: `Latency constraint violated: ${elapsed}ms > ${step.constraints.maxLatencyMs}ms`,
                    recoverable: true,
                });
            }
            trace.endEvent(stepEventId, 'success', {
                durationMs: elapsed,
                latencyMs: elapsed,
            });
        }
        catch (err) {
            const error = err;
            trace.endEvent(stepEventId, 'failure', { durationMs: Date.now() - startTime }, { code: 'step_error', message: error.message });
            errors.push({
                step: step.id,
                error: error.message,
                recoverable: false,
            });
        }
    }
    /**
     * Simulate step execution (placeholder for actual tool execution)
     */
    async simulateExecution(step) {
        // Simulate some latency
        const baseLatency = 100;
        const variance = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, baseLatency + variance));
    }
    /**
     * Evaluate success criteria
     */
    async evaluateCriteria(criteria, trace) {
        // Build trace to get current state
        const builtTrace = trace.build();
        switch (criteria.type) {
            case 'exact_match':
                return builtTrace.summary?.success === criteria.value;
            case 'contains':
                return JSON.stringify(builtTrace).includes(String(criteria.value));
            case 'regex':
                const regex = new RegExp(String(criteria.value));
                return regex.test(JSON.stringify(builtTrace));
            case 'semantic_similarity':
                // Placeholder - would use embedding comparison
                return true;
            case 'custom':
                // Placeholder - would evaluate custom function
                return true;
            default:
                return false;
        }
    }
    /**
     * Calculate metrics from a trace
     */
    calculateMetrics(trace) {
        const summary = trace.summary ?? {
            success: false,
            totalDurationMs: 0,
            totalTokens: 0,
            totalCostUsd: 0,
            toolCallCount: 0,
            errorCount: 0,
            safetyViolations: 0,
        };
        return {
            taskSuccessRate: summary.success ? 1 : 0,
            taskCompletionTime: summary.totalDurationMs,
            totalTokens: summary.totalTokens,
            inputTokens: 0,
            outputTokens: 0,
            totalCostUsd: summary.totalCostUsd,
            costPerSuccessfulTask: summary.success ? summary.totalCostUsd : 0,
            p50LatencyMs: summary.totalDurationMs,
            p95LatencyMs: summary.totalDurationMs,
            p99LatencyMs: summary.totalDurationMs,
            avgLatencyMs: summary.totalDurationMs,
            toolCallCount: summary.toolCallCount,
            toolSuccessRate: summary.errorCount === 0 ? 1 : 0,
            avgToolLatencyMs: summary.toolCallCount > 0
                ? summary.totalDurationMs / summary.toolCallCount
                : 0,
            safetyViolationCount: summary.safetyViolations,
            safetyViolationRate: summary.safetyViolations > 0 ? 1 : 0,
            jailbreakAttempts: 0,
            jailbreakSuccesses: 0,
            routingDecisionCount: trace.events.filter((e) => e.type === 'routing_decision').length,
            routingAccuracy: 1,
            costSavingsVsBaseline: 0,
        };
    }
    /**
     * Get aggregate metrics for all runs
     */
    getAggregateMetrics() {
        return this.telemetry.export().metrics;
    }
    /**
     * Export all results
     */
    async exportResults() {
        const exported = this.telemetry.export();
        console.log(`Exported ${exported.traces.length} traces to ${this.config.outputPath}`);
    }
    /**
     * Close and clean up
     */
    async close() {
        await this.telemetry.close();
    }
    /**
     * Utility: chunk array for concurrency control
     */
    chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}
exports.EvalRunner = EvalRunner;
/**
 * Create an eval runner with default config
 */
function createEvalRunner(config) {
    return new EvalRunner(config);
}
