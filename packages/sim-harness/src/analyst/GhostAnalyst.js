"use strict";
/**
 * Ghost Analyst - Automated workflow driver for IntelGraph API testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostAnalyst = void 0;
const axios_1 = __importDefault(require("axios"));
const safety_js_1 = require("../utils/safety.js");
const uuid_1 = require("uuid");
class GhostAnalyst {
    apiUrl;
    wsUrl;
    token;
    tenantId;
    script;
    timeout;
    verbose;
    safetyGuard;
    httpClient;
    context;
    constructor(options) {
        this.apiUrl = options.apiUrl;
        this.wsUrl = options.wsUrl;
        this.token = options.token;
        this.tenantId = options.tenantId;
        this.timeout = options.timeout || 300000; // 5 minutes default
        this.verbose = options.verbose || false;
        this.script =
            typeof options.script === 'string'
                ? this.loadScript(options.script)
                : options.script;
        this.context = new Map();
        // Safety checks
        this.safetyGuard = new safety_js_1.SafetyGuard({
            requireTestPrefix: true,
            blockProductionUrls: true,
            maxDataSize: 10000,
        });
        this.safetyGuard.validateApiUrl(this.apiUrl);
        this.safetyGuard.validateTenantId(this.tenantId);
        // Setup HTTP client
        this.httpClient = axios_1.default.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                'X-Tenant-ID': this.tenantId,
                'X-Sim-Harness': 'true',
            },
        });
    }
    /**
     * Run the analyst workflow
     */
    async run(options = {}) {
        const sessionId = `session-${(0, uuid_1.v4)()}`;
        const startTime = new Date().toISOString();
        this.log(`Starting session ${sessionId} with workflow: ${this.script.name}`);
        // Initialize context
        if (options.scenario) {
            this.context.set('scenario', options.scenario);
        }
        if (options.context) {
            for (const [key, value] of Object.entries(options.context)) {
                this.context.set(key, value);
            }
        }
        const session = {
            id: sessionId,
            scenarioId: options.scenarioId || 'unknown',
            workflowName: this.script.name,
            startTime,
            status: 'running',
            steps: [],
            metrics: this.initializeMetrics(),
            errors: [],
        };
        try {
            // Execute each step
            for (const step of this.script.steps) {
                const stepResult = await this.executeStep(step, session);
                session.steps.push(stepResult);
                if (stepResult.status === 'failed') {
                    session.status = 'failed';
                    session.errors.push(`Step '${step.name}' failed: ${stepResult.error}`);
                    if (!this.shouldContinueOnError(step)) {
                        break;
                    }
                }
            }
            // Mark as completed if no failures
            if (session.status === 'running') {
                session.status = 'completed';
            }
        }
        catch (error) {
            session.status = 'failed';
            session.errors.push(error.message);
            this.log(`Session failed: ${error.message}`, 'error');
        }
        session.endTime = new Date().toISOString();
        session.metrics.totalDuration =
            new Date(session.endTime).getTime() - new Date(startTime).getTime();
        this.log(`Session ${sessionId} ${session.status}`, session.status === 'completed' ? 'success' : 'error');
        return session;
    }
    /**
     * Execute a single workflow step
     */
    async executeStep(step, session) {
        const startTime = new Date().toISOString();
        this.log(`Executing step: ${step.name}`, 'info');
        const result = {
            name: step.name,
            status: 'running',
            startTime,
        };
        try {
            switch (step.action) {
                case 'graphql-query':
                case 'graphql-mutation':
                    result.result = await this.executeGraphQL(step);
                    break;
                case 'rest-get':
                case 'rest-post':
                    result.result = await this.executeREST(step);
                    break;
                case 'poll':
                    result.result = await this.executePoll(step);
                    break;
                case 'wait':
                    await this.executeWait(step);
                    result.result = { waited: step.delay };
                    break;
                case 'assert':
                    result.result = await this.executeAssert(step);
                    break;
                default:
                    throw new Error(`Unknown action: ${step.action}`);
            }
            // Run assertions if defined
            if (step.assertions && step.assertions.length > 0) {
                result.assertions = await this.runAssertions(step.assertions, result.result);
                const failedAssertions = result.assertions.filter((a) => !a.passed);
                if (failedAssertions.length > 0) {
                    throw new Error(`Assertions failed: ${failedAssertions.map((a) => a.expression).join(', ')}`);
                }
            }
            result.status = 'success';
            result.endTime = new Date().toISOString();
            result.duration =
                new Date(result.endTime).getTime() - new Date(startTime).getTime();
            // Update metrics
            session.metrics.queriesIssued++;
            session.metrics.queryLatency.samples.push(result.duration);
            // Store result in context
            this.context.set(`steps.${step.name}`, result);
            this.log(`Step ${step.name} completed in ${result.duration}ms`, 'success');
        }
        catch (error) {
            result.status = 'failed';
            result.error = error.message;
            result.endTime = new Date().toISOString();
            result.duration =
                new Date(result.endTime).getTime() - new Date(startTime).getTime();
            session.metrics.errorCount++;
            this.log(`Step ${step.name} failed: ${result.error}`, 'error');
        }
        return result;
    }
    /**
     * Execute GraphQL query/mutation
     */
    async executeGraphQL(step) {
        if (!step.query) {
            throw new Error('GraphQL step requires query');
        }
        // Safety check
        this.safetyGuard.validateQuery(step.query);
        // Resolve variables
        const variables = this.resolveVariables(step.variables || {});
        const response = await this.httpClient.post(this.apiUrl, {
            query: step.query,
            variables,
        });
        if (response.data.errors) {
            throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
        }
        // Extract entities and relationships for metrics
        const data = response.data.data;
        this.updateMetricsFromResponse(data);
        return data;
    }
    /**
     * Execute REST API call
     */
    async executeREST(step) {
        if (!step.endpoint) {
            throw new Error('REST step requires endpoint');
        }
        const url = this.resolveTemplate(step.endpoint);
        const method = step.action === 'rest-get' ? 'GET' : 'POST';
        const config = { method, url };
        if (step.body) {
            config.data = this.resolveVariables(step.body);
        }
        const response = await this.httpClient.request(config);
        return response.data;
    }
    /**
     * Execute polling operation
     */
    async executePoll(step) {
        if (!step.endpoint || !step.until) {
            throw new Error('Poll step requires endpoint and until condition');
        }
        const timeout = step.timeout || 60000;
        const interval = step.interval || 1000;
        const startTime = Date.now();
        const url = this.resolveTemplate(step.endpoint);
        while (Date.now() - startTime < timeout) {
            const response = await this.httpClient.get(url);
            const data = response.data;
            // Evaluate until condition
            if (this.evaluateCondition(step.until, data)) {
                return data;
            }
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
        throw new Error(`Poll timeout after ${timeout}ms`);
    }
    /**
     * Execute wait operation
     */
    async executeWait(step) {
        const delay = step.delay || 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    /**
     * Execute assert operation
     */
    async executeAssert(step) {
        if (!step.assertions || step.assertions.length === 0) {
            throw new Error('Assert step requires assertions');
        }
        const results = await this.runAssertions(step.assertions, this.context);
        const failedAssertions = results.filter((a) => !a.passed);
        if (failedAssertions.length > 0) {
            throw new Error(`Assertions failed: ${failedAssertions.map((a) => a.expression).join(', ')}`);
        }
        return { assertions: results };
    }
    /**
     * Run assertions on data
     */
    async runAssertions(assertions, data) {
        const results = [];
        for (const assertion of assertions) {
            try {
                const passed = this.evaluateCondition(assertion, data);
                results.push({
                    expression: assertion,
                    passed,
                    actual: data,
                });
            }
            catch (error) {
                results.push({
                    expression: assertion,
                    passed: false,
                    actual: data,
                    expected: 'valid evaluation',
                });
            }
        }
        return results;
    }
    /**
     * Evaluate condition expression
     */
    evaluateCondition(expression, data) {
        try {
            // Simple expression evaluation
            // In production, use a safe expression evaluator library
            // Handle common patterns
            if (expression.includes('==')) {
                const [left, right] = expression.split('==').map((s) => s.trim());
                const leftVal = this.resolvePath(left, data);
                const rightVal = this.resolveTemplate(right);
                return leftVal == rightVal;
            }
            if (expression.includes('>=')) {
                const [left, right] = expression.split('>=').map((s) => s.trim());
                const leftVal = this.resolvePath(left, data);
                const rightVal = parseFloat(right);
                return leftVal >= rightVal;
            }
            if (expression.includes('<=')) {
                const [left, right] = expression.split('<=').map((s) => s.trim());
                const leftVal = this.resolvePath(left, data);
                const rightVal = parseFloat(right);
                return leftVal <= rightVal;
            }
            // Default: check if path exists and is truthy
            return !!this.resolvePath(expression, data);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Resolve path in object (e.g., "user.name")
     */
    resolvePath(path, data) {
        const parts = path.split('.');
        let current = data;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Resolve template variables (e.g., "{{scenario.id}}")
     */
    resolveTemplate(template) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.resolvePath(path.trim(), Object.fromEntries(this.context));
            return value !== undefined ? String(value) : match;
        });
    }
    /**
     * Resolve variables object
     */
    resolveVariables(variables) {
        const resolved = {};
        for (const [key, value] of Object.entries(variables)) {
            if (typeof value === 'string') {
                resolved[key] = this.resolveTemplate(value);
            }
            else if (typeof value === 'object' && value !== null) {
                resolved[key] = this.resolveVariables(value);
            }
            else {
                resolved[key] = value;
            }
        }
        return resolved;
    }
    /**
     * Update metrics from GraphQL response
     */
    updateMetricsFromResponse(data) {
        // Count entities
        if (data.entities && Array.isArray(data.entities)) {
            this.context.set('entitiesFound', (this.context.get('entitiesFound') || 0) + data.entities.length);
        }
        // Count relationships
        if (data.relationships && Array.isArray(data.relationships)) {
            this.context.set('relationshipsFound', (this.context.get('relationshipsFound') || 0) + data.relationships.length);
        }
        // Check for insights (first meaningful result)
        if (!this.context.has('timeToFirstInsight')) {
            if ((data.entities && data.entities.length > 0) ||
                (data.relationships && data.relationships.length > 0) ||
                (data.copilotRun && data.copilotRun.status === 'COMPLETED')) {
                this.context.set('timeToFirstInsight', Date.now());
            }
        }
    }
    /**
     * Should continue execution on error
     */
    shouldContinueOnError(step) {
        // Could be extended with step-level configuration
        return false;
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        return {
            totalDuration: 0,
            queriesIssued: 0,
            entitiesFound: 0,
            relationshipsFound: 0,
            queryLatency: {
                min: 0,
                max: 0,
                mean: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                samples: [],
            },
            errorCount: 0,
            retryCount: 0,
        };
    }
    /**
     * Load workflow script from file
     */
    loadScript(path) {
        // In real implementation, load from file system
        // For now, throw error
        throw new Error('Loading scripts from file not yet implemented');
    }
    /**
     * Log message
     */
    log(message, level = 'info') {
        if (!this.verbose && level === 'info') {
            return;
        }
        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
        };
        const reset = '\x1b[0m';
        console.log(`${colors[level]}[GhostAnalyst] ${message}${reset}`);
    }
}
exports.GhostAnalyst = GhostAnalyst;
