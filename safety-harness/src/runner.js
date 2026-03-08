"use strict";
/**
 * Safety Harness Test Runner
 *
 * Executes test packs against target endpoints and validates safety policies.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyHarnessRunner = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const client_js_1 = require("./client.js");
const metrics_js_1 = require("./metrics.js");
const logger = (0, pino_1.default)({ name: 'safety-harness-runner' });
class SafetyHarnessRunner {
    config;
    apiClient;
    metrics;
    testPacks = new Map();
    previousResults;
    constructor(config) {
        this.config = config;
        this.apiClient = new client_js_1.APIClient({
            baseURL: config.targetEndpoint,
            timeout: config.timeout,
            apiKey: config.apiKey,
            retries: 3,
            retryDelay: 1000,
        });
        this.metrics = new metrics_js_1.MetricsCollector();
    }
    /**
     * Load test packs from directory
     */
    async loadTestPacks(packIds) {
        logger.info({ testPacksDir: this.config.testPacksDir }, 'Loading test packs');
        const components = await (0, promises_1.readdir)(this.config.testPacksDir);
        for (const component of components) {
            const componentPath = (0, path_1.join)(this.config.testPacksDir, component);
            const files = await (0, promises_1.readdir)(componentPath);
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                const packPath = (0, path_1.join)(componentPath, file);
                const content = await (0, promises_1.readFile)(packPath, 'utf-8');
                const data = JSON.parse(content);
                // Validate test pack schema
                const testPack = types_js_1.TestPackSchema.parse(data);
                // Filter by packIds if provided
                if (packIds && !packIds.includes(testPack.id)) {
                    continue;
                }
                this.testPacks.set(testPack.id, testPack);
                logger.info({ packId: testPack.id, scenarios: testPack.scenarios.length }, 'Loaded test pack');
            }
        }
        logger.info({ totalPacks: this.testPacks.size }, 'Test packs loaded');
    }
    /**
     * Load previous run results for regression detection
     */
    async loadPreviousResults(runId) {
        // In production, load from database or storage
        // For now, this is a placeholder
        logger.info({ runId }, 'Loading previous results for regression detection');
        this.previousResults = new Map();
    }
    /**
     * Execute all loaded test packs
     */
    async runAll() {
        const runId = (0, uuid_1.v4)();
        const startTime = new Date().toISOString();
        const startMs = Date.now();
        logger.info({ runId, packs: this.testPacks.size }, 'Starting test run');
        // Load previous results if configured
        if (this.config.previousRunId) {
            await this.loadPreviousResults(this.config.previousRunId);
        }
        const allResults = [];
        const packIds = [];
        for (const [packId, testPack] of this.testPacks) {
            packIds.push(packId);
            // Filter enabled scenarios
            const enabledScenarios = testPack.scenarios.filter(s => s.enabled);
            logger.info({ packId, total: testPack.scenarios.length, enabled: enabledScenarios.length }, 'Executing test pack');
            // Execute scenarios
            const results = await this.executeScenarios(enabledScenarios);
            allResults.push(...results);
            // Track metrics per pack
            this.metrics.recordPackResults(packId, results);
        }
        const endTime = new Date().toISOString();
        const durationMs = Date.now() - startMs;
        // Calculate summary statistics
        const summary = this.calculateSummary(allResults);
        // Detect regressions
        const regressions = this.detectRegressions(allResults);
        const testRun = {
            runId,
            startTime,
            endTime,
            durationMs,
            config: {
                targetEndpoint: this.config.targetEndpoint,
                environment: this.config.environment,
                modelVersion: this.config.modelVersion,
                buildVersion: this.config.buildVersion,
                parallel: this.config.parallel,
                maxConcurrency: this.config.maxConcurrency,
            },
            testPacks: packIds,
            results: allResults,
            summary,
            regressions,
        };
        logger.info({
            runId,
            total: summary.total,
            passed: summary.passed,
            failed: summary.failed,
            durationMs,
        }, 'Test run completed');
        return testRun;
    }
    /**
     * Execute scenarios with optional parallelization
     */
    async executeScenarios(scenarios) {
        if (this.config.parallel) {
            return this.executeParallel(scenarios);
        }
        else {
            return this.executeSequential(scenarios);
        }
    }
    /**
     * Execute scenarios sequentially
     */
    async executeSequential(scenarios) {
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.executeScenario(scenario);
            results.push(result);
        }
        return results;
    }
    /**
     * Execute scenarios in parallel with concurrency limit
     */
    async executeParallel(scenarios) {
        const results = [];
        const limit = this.config.maxConcurrency;
        for (let i = 0; i < scenarios.length; i += limit) {
            const batch = scenarios.slice(i, i + limit);
            const batchResults = await Promise.all(batch.map(scenario => this.executeScenario(scenario)));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Execute a single test scenario
     */
    async executeScenario(scenario) {
        const startMs = Date.now();
        const timestamp = new Date().toISOString();
        logger.debug({ scenarioId: scenario.id, name: scenario.name }, 'Executing scenario');
        try {
            // Execute based on component type
            const actual = await this.executeByComponent(scenario);
            // Compare with expected behavior
            const comparison = this.compareResults(scenario, actual);
            // Determine if test passed
            const passed = this.evaluatePass(comparison, scenario);
            const result = {
                scenarioId: scenario.id,
                passed,
                timestamp,
                durationMs: Date.now() - startMs,
                actual,
                comparison,
                failure: passed ? undefined : {
                    reason: this.generateFailureReason(comparison, scenario),
                    details: { expected: scenario.expected, actual },
                    severity: scenario.riskLevel,
                },
            };
            this.metrics.recordScenarioResult(scenario, result);
            return result;
        }
        catch (error) {
            logger.error({ scenarioId: scenario.id, error: error.message }, 'Scenario execution failed');
            return {
                scenarioId: scenario.id,
                passed: false,
                timestamp,
                durationMs: Date.now() - startMs,
                actual: {
                    outcome: 'error',
                    response: {},
                    blocked: false,
                    guardrailsTriggered: [],
                    policyViolations: [],
                    logs: [error.message],
                },
                comparison: {
                    outcomeMatch: false,
                },
                failure: {
                    reason: `Execution error: ${error.message}`,
                    details: { error: error.stack },
                    severity: 'high',
                },
            };
        }
    }
    /**
     * Execute scenario based on component type
     */
    async executeByComponent(scenario) {
        switch (scenario.component) {
            case 'copilot':
                return this.executeCopilotScenario(scenario);
            case 'analytics':
                return this.executeAnalyticsScenario(scenario);
            case 'case':
                return this.executeCaseScenario(scenario);
            case 'export':
                return this.executeExportScenario(scenario);
            default:
                throw new Error(`Unsupported component: ${scenario.component}`);
        }
    }
    /**
     * Execute Copilot scenario
     */
    async executeCopilotScenario(scenario) {
        const response = await this.apiClient.copilot({
            prompt: scenario.input.prompt,
            context: scenario.input.context,
            investigationId: `test-${scenario.id}`,
        });
        return {
            outcome: response.blocked ? 'block' : 'allow-with-logging',
            response,
            blocked: response.blocked || false,
            guardrailsTriggered: response.guardrailsTriggered || [],
            policyViolations: response.policyViolations || [],
            riskScore: response.riskScore,
        };
    }
    /**
     * Execute Analytics scenario
     */
    async executeAnalyticsScenario(scenario) {
        const response = await this.apiClient.analytics({
            query: scenario.input.query,
            context: scenario.input.context,
            dataClassification: 'internal',
        });
        return {
            outcome: response.blocked ? 'block' : 'allow-with-logging',
            response,
            blocked: response.blocked,
            guardrailsTriggered: response.guardrailsTriggered,
            policyViolations: [],
        };
    }
    /**
     * Execute Case scenario
     */
    async executeCaseScenario(scenario) {
        // Mock case execution - would call actual case API
        return {
            outcome: 'block',
            response: { message: 'Case API integration pending' },
            blocked: true,
            guardrailsTriggered: [],
            policyViolations: [],
        };
    }
    /**
     * Execute Export scenario
     */
    async executeExportScenario(scenario) {
        // Mock export execution - would call actual export API
        return {
            outcome: 'require-approval',
            response: { message: 'Export API integration pending' },
            blocked: false,
            guardrailsTriggered: [],
            policyViolations: [],
        };
    }
    /**
     * Compare actual results with expected outcomes
     */
    compareResults(scenario, actual) {
        const comparison = {
            outcomeMatch: this.matchOutcome(scenario.expected.outcome, actual.outcome),
        };
        // Check content matches
        if (scenario.expected.shouldContain || scenario.expected.shouldNotContain) {
            comparison.contentMatch = this.matchContent(actual.response, scenario.expected.shouldContain, scenario.expected.shouldNotContain);
        }
        // Check guardrails
        if (scenario.expected.guardrailsTriggered) {
            comparison.guardrailsMatch = this.matchGuardrails(actual.guardrailsTriggered, scenario.expected.guardrailsTriggered);
        }
        // Check policy violations
        if (scenario.expected.policyViolations) {
            comparison.policyMatch = this.matchPolicies(actual.policyViolations, scenario.expected.policyViolations);
        }
        // Check risk score range
        if (scenario.expected.riskScoreRange && actual.riskScore !== undefined) {
            const [min, max] = scenario.expected.riskScoreRange;
            comparison.riskScoreInRange = actual.riskScore >= min && actual.riskScore <= max;
        }
        return comparison;
    }
    /**
     * Match outcome expectation
     */
    matchOutcome(expected, actual) {
        // Normalize outcomes
        const normalize = (outcome) => outcome.toLowerCase().replace(/[-_]/g, '');
        return normalize(expected) === normalize(actual);
    }
    /**
     * Match content expectations
     */
    matchContent(response, shouldContain, shouldNotContain) {
        const responseStr = JSON.stringify(response).toLowerCase();
        if (shouldContain) {
            for (const pattern of shouldContain) {
                const regex = new RegExp(pattern, 'i');
                if (!regex.test(responseStr)) {
                    return false;
                }
            }
        }
        if (shouldNotContain) {
            for (const pattern of shouldNotContain) {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(responseStr)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Match guardrails expectations
     */
    matchGuardrails(actual, expected) {
        return expected.every(e => actual.includes(e));
    }
    /**
     * Match policy violations expectations
     */
    matchPolicies(actual, expected) {
        return expected.every(e => actual.includes(e));
    }
    /**
     * Evaluate if test passed based on comparison
     */
    evaluatePass(comparison, scenario) {
        // Outcome must match
        if (!comparison.outcomeMatch)
            return false;
        // Content must match if specified
        if (comparison.contentMatch !== undefined && !comparison.contentMatch)
            return false;
        // Guardrails must match if specified
        if (comparison.guardrailsMatch !== undefined && !comparison.guardrailsMatch)
            return false;
        // Policies must match if specified
        if (comparison.policyMatch !== undefined && !comparison.policyMatch)
            return false;
        // Risk score must be in range if specified
        if (comparison.riskScoreInRange !== undefined && !comparison.riskScoreInRange)
            return false;
        return true;
    }
    /**
     * Generate failure reason
     */
    generateFailureReason(comparison, scenario) {
        const reasons = [];
        if (!comparison.outcomeMatch) {
            reasons.push(`Outcome mismatch: expected ${scenario.expected.outcome}`);
        }
        if (comparison.contentMatch === false) {
            reasons.push('Content mismatch');
        }
        if (comparison.guardrailsMatch === false) {
            reasons.push('Guardrails not triggered as expected');
        }
        if (comparison.policyMatch === false) {
            reasons.push('Policy violations not detected as expected');
        }
        if (comparison.riskScoreInRange === false) {
            reasons.push('Risk score out of expected range');
        }
        return reasons.join('; ');
    }
    /**
     * Calculate summary statistics
     */
    calculateSummary(results) {
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;
        const errorRate = failed / total;
        // Group by risk level, component, attack type
        const byRiskLevel = {};
        const byComponent = {};
        const byAttackType = {};
        for (const [packId, pack] of this.testPacks) {
            for (const scenario of pack.scenarios) {
                const result = results.find(r => r.scenarioId === scenario.id);
                if (!result)
                    continue;
                // By risk level
                if (!byRiskLevel[scenario.riskLevel]) {
                    byRiskLevel[scenario.riskLevel] = { total: 0, passed: 0, failed: 0 };
                }
                byRiskLevel[scenario.riskLevel].total++;
                if (result.passed)
                    byRiskLevel[scenario.riskLevel].passed++;
                else
                    byRiskLevel[scenario.riskLevel].failed++;
                // By component
                if (!byComponent[scenario.component]) {
                    byComponent[scenario.component] = { total: 0, passed: 0, failed: 0 };
                }
                byComponent[scenario.component].total++;
                if (result.passed)
                    byComponent[scenario.component].passed++;
                else
                    byComponent[scenario.component].failed++;
                // By attack type
                if (!byAttackType[scenario.attackType]) {
                    byAttackType[scenario.attackType] = { total: 0, passed: 0, failed: 0 };
                }
                byAttackType[scenario.attackType].total++;
                if (result.passed)
                    byAttackType[scenario.attackType].passed++;
                else
                    byAttackType[scenario.attackType].failed++;
            }
        }
        return {
            total,
            passed,
            failed,
            skipped: 0,
            errorRate,
            byRiskLevel,
            byComponent,
            byAttackType,
        };
    }
    /**
     * Detect regressions from previous run
     */
    detectRegressions(results) {
        if (!this.previousResults)
            return [];
        const regressions = [];
        for (const result of results) {
            const previous = this.previousResults.get(result.scenarioId);
            if (!previous)
                continue;
            // Regression: previously passed, now failing
            if (previous.passed && !result.passed) {
                const scenario = this.findScenario(result.scenarioId);
                regressions.push({
                    scenarioId: result.scenarioId,
                    previousResult: 'passed',
                    currentResult: 'failed',
                    severity: scenario?.riskLevel || 'high',
                });
            }
        }
        return regressions;
    }
    /**
     * Find scenario by ID
     */
    findScenario(scenarioId) {
        for (const pack of this.testPacks.values()) {
            const scenario = pack.scenarios.find(s => s.id === scenarioId);
            if (scenario)
                return scenario;
        }
        return undefined;
    }
}
exports.SafetyHarnessRunner = SafetyHarnessRunner;
