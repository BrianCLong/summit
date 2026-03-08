"use strict";
/**
 * Error Scenario Testing Framework
 *
 * Framework for systematically testing error handling and failure scenarios.
 * Covers network failures, timeouts, validation errors, and service degradation.
 *
 * @module tests/error-scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonErrorScenarios = exports.ErrorInjector = exports.ErrorScenarioRunner = void 0;
exports.createErrorScenarioRunner = createErrorScenarioRunner;
exports.createErrorInjector = createErrorInjector;
const events_1 = require("events");
/**
 * Error Scenario Test Runner
 *
 * Executes error scenarios and validates system behavior under failure conditions.
 *
 * @example
 * ```typescript
 * const runner = new ErrorScenarioRunner();
 *
 * runner.registerScenario({
 *   type: 'network_failure',
 *   name: 'Database Connection Lost',
 *   description: 'Tests behavior when database connection is lost',
 *   setup: async () => { ... },
 *   trigger: async () => { ... },
 *   verify: async (result) => result.handled === true,
 *   cleanup: async () => { ... },
 *   expectedBehavior: 'Should return cached data or graceful error',
 *   severity: 'high',
 *   tags: ['database', 'resilience'],
 * });
 *
 * const results = await runner.runAll();
 * ```
 */
class ErrorScenarioRunner extends events_1.EventEmitter {
    scenarios = new Map();
    results = [];
    isRunning = false;
    /**
     * Register an error scenario
     */
    registerScenario(scenario) {
        this.scenarios.set(scenario.name, scenario);
        return this;
    }
    /**
     * Register multiple scenarios
     */
    registerScenarios(scenarios) {
        scenarios.forEach((s) => this.registerScenario(s));
        return this;
    }
    /**
     * Run a specific scenario
     */
    async runScenario(name) {
        const scenario = this.scenarios.get(name);
        if (!scenario) {
            throw new Error(`Scenario not found: ${name}`);
        }
        const startTime = Date.now();
        this.emit('scenario:start', { name, type: scenario.type });
        try {
            // Setup
            await scenario.setup();
            this.emit('scenario:setup', { name });
            // Trigger error condition
            let triggerResult;
            try {
                await scenario.trigger();
            }
            catch (error) {
                triggerResult = error;
            }
            // Verify expected behavior
            const passed = await scenario.verify(triggerResult);
            // Cleanup
            await scenario.cleanup();
            this.emit('scenario:cleanup', { name });
            const result = {
                scenario: name,
                type: scenario.type,
                passed,
                duration: Date.now() - startTime,
                timestamp: new Date(),
                details: { triggerResult },
            };
            this.results.push(result);
            this.emit('scenario:complete', result);
            return result;
        }
        catch (error) {
            // Ensure cleanup runs even on failure
            try {
                await scenario.cleanup();
            }
            catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
            }
            const result = {
                scenario: name,
                type: scenario.type,
                passed: false,
                error,
                duration: Date.now() - startTime,
                timestamp: new Date(),
                details: { errorMessage: error.message },
            };
            this.results.push(result);
            this.emit('scenario:error', result);
            return result;
        }
    }
    /**
     * Run all registered scenarios
     */
    async runAll() {
        if (this.isRunning) {
            throw new Error('Runner is already executing scenarios');
        }
        this.isRunning = true;
        this.results = [];
        this.emit('run:start', { count: this.scenarios.size });
        const results = [];
        for (const [name] of this.scenarios) {
            const result = await this.runScenario(name);
            results.push(result);
        }
        this.isRunning = false;
        this.emit('run:complete', { results });
        return results;
    }
    /**
     * Run scenarios by type
     */
    async runByType(type) {
        const matchingScenarios = Array.from(this.scenarios.entries())
            .filter(([_, s]) => s.type === type)
            .map(([name]) => name);
        const results = [];
        for (const name of matchingScenarios) {
            results.push(await this.runScenario(name));
        }
        return results;
    }
    /**
     * Run scenarios by tag
     */
    async runByTag(tag) {
        const matchingScenarios = Array.from(this.scenarios.entries())
            .filter(([_, s]) => s.tags.includes(tag))
            .map(([name]) => name);
        const results = [];
        for (const name of matchingScenarios) {
            results.push(await this.runScenario(name));
        }
        return results;
    }
    /**
     * Get all results
     */
    getResults() {
        return [...this.results];
    }
    /**
     * Get summary of results
     */
    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter((r) => r.passed).length;
        const failed = total - passed;
        const byType = {};
        for (const result of this.results) {
            if (!byType[result.type]) {
                byType[result.type] = { passed: 0, failed: 0 };
            }
            if (result.passed) {
                byType[result.type].passed++;
            }
            else {
                byType[result.type].failed++;
            }
        }
        return {
            total,
            passed,
            failed,
            passRate: total > 0 ? passed / total : 0,
            byType: byType,
        };
    }
    /**
     * Clear all scenarios and results
     */
    clear() {
        this.scenarios.clear();
        this.results = [];
    }
}
exports.ErrorScenarioRunner = ErrorScenarioRunner;
/**
 * Error Injector for simulating failures
 */
class ErrorInjector {
    injections = new Map();
    activeInjections = new Set();
    /**
     * Configure error injection for a target
     */
    configure(target, config) {
        this.injections.set(target, config);
        return this;
    }
    /**
     * Enable error injection for a target
     */
    enable(target) {
        if (!this.injections.has(target)) {
            throw new Error(`No injection configured for target: ${target}`);
        }
        this.activeInjections.add(target);
    }
    /**
     * Disable error injection for a target
     */
    disable(target) {
        this.activeInjections.delete(target);
    }
    /**
     * Disable all error injections
     */
    disableAll() {
        this.activeInjections.clear();
    }
    /**
     * Check if target should fail
     */
    shouldFail(target) {
        if (!this.activeInjections.has(target)) {
            return false;
        }
        const config = this.injections.get(target);
        if (config.probability !== undefined) {
            return Math.random() < config.probability;
        }
        return true;
    }
    /**
     * Get error for target
     */
    getError(target) {
        const config = this.injections.get(target);
        if (!config) {
            return new Error(`Error injection: ${target}`);
        }
        if (config.customError) {
            return config.customError;
        }
        return this.createErrorByType(config.type, target);
    }
    /**
     * Create error by type
     */
    createErrorByType(type, target) {
        const errors = {
            network_failure: () => new Error(`Network failure: ${target}`),
            timeout: () => {
                const error = new Error(`Timeout: ${target}`);
                error.name = 'TimeoutError';
                return error;
            },
            connection_refused: () => {
                const error = new Error(`Connection refused: ${target}`);
                error.code = 'ECONNREFUSED';
                return error;
            },
            dns_failure: () => {
                const error = new Error(`DNS lookup failed: ${target}`);
                error.code = 'ENOTFOUND';
                return error;
            },
            ssl_error: () => {
                const error = new Error(`SSL certificate error: ${target}`);
                error.code = 'CERT_HAS_EXPIRED';
                return error;
            },
            rate_limit: () => {
                const error = new Error(`Rate limit exceeded: ${target}`);
                error.statusCode = 429;
                return error;
            },
            service_unavailable: () => {
                const error = new Error(`Service unavailable: ${target}`);
                error.statusCode = 503;
                return error;
            },
            internal_error: () => {
                const error = new Error(`Internal server error: ${target}`);
                error.statusCode = 500;
                return error;
            },
            validation_error: () => {
                const error = new Error(`Validation failed: ${target}`);
                error.statusCode = 400;
                return error;
            },
            authentication_error: () => {
                const error = new Error(`Authentication required: ${target}`);
                error.statusCode = 401;
                return error;
            },
            authorization_error: () => {
                const error = new Error(`Permission denied: ${target}`);
                error.statusCode = 403;
                return error;
            },
            resource_not_found: () => {
                const error = new Error(`Resource not found: ${target}`);
                error.statusCode = 404;
                return error;
            },
            conflict: () => {
                const error = new Error(`Conflict: ${target}`);
                error.statusCode = 409;
                return error;
            },
            data_corruption: () => new Error(`Data corruption detected: ${target}`),
            partial_failure: () => new Error(`Partial failure: ${target}`),
            cascade_failure: () => new Error(`Cascade failure triggered: ${target}`),
        };
        return errors[type]();
    }
    /**
     * Wrap a function with error injection
     */
    wrap(target, fn) {
        const injector = this;
        return (async (...args) => {
            if (injector.shouldFail(target)) {
                const config = injector.injections.get(target);
                // Apply delay if configured
                if (config?.delay) {
                    await new Promise((resolve) => setTimeout(resolve, config.delay));
                }
                throw injector.getError(target);
            }
            return fn(...args);
        });
    }
}
exports.ErrorInjector = ErrorInjector;
/**
 * Predefined error scenarios for common failure patterns
 */
exports.CommonErrorScenarios = {
    /**
     * Create a database connection failure scenario
     */
    databaseConnectionFailure(triggerFn, verifyFn) {
        return {
            type: 'connection_refused',
            name: 'Database Connection Failure',
            description: 'Tests behavior when database connection fails',
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should return error and not crash',
            severity: 'critical',
            tags: ['database', 'connection', 'resilience'],
        };
    },
    /**
     * Create a timeout scenario
     */
    requestTimeout(triggerFn, verifyFn, timeoutMs = 5000) {
        return {
            type: 'timeout',
            name: 'Request Timeout',
            description: `Tests behavior when request times out after ${timeoutMs}ms`,
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should timeout gracefully with appropriate error',
            severity: 'high',
            tags: ['timeout', 'network', 'resilience'],
        };
    },
    /**
     * Create a rate limit scenario
     */
    rateLimitExceeded(triggerFn, verifyFn) {
        return {
            type: 'rate_limit',
            name: 'Rate Limit Exceeded',
            description: 'Tests behavior when rate limit is exceeded',
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should return 429 with retry-after header',
            severity: 'medium',
            tags: ['rate-limit', 'api', 'throttling'],
        };
    },
    /**
     * Create an authentication failure scenario
     */
    authenticationFailure(triggerFn, verifyFn) {
        return {
            type: 'authentication_error',
            name: 'Authentication Failure',
            description: 'Tests behavior when authentication fails',
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should return 401 and redirect to login',
            severity: 'high',
            tags: ['auth', 'security'],
        };
    },
    /**
     * Create a validation error scenario
     */
    validationError(triggerFn, verifyFn) {
        return {
            type: 'validation_error',
            name: 'Validation Error',
            description: 'Tests behavior when input validation fails',
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should return 400 with validation details',
            severity: 'medium',
            tags: ['validation', 'input', 'api'],
        };
    },
    /**
     * Create a service unavailable scenario
     */
    serviceUnavailable(serviceName, triggerFn, verifyFn) {
        return {
            type: 'service_unavailable',
            name: `${serviceName} Service Unavailable`,
            description: `Tests behavior when ${serviceName} service is unavailable`,
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should degrade gracefully or use fallback',
            severity: 'high',
            tags: ['service', 'availability', 'resilience', serviceName.toLowerCase()],
        };
    },
    /**
     * Create a partial failure scenario
     */
    partialFailure(triggerFn, verifyFn) {
        return {
            type: 'partial_failure',
            name: 'Partial Failure',
            description: 'Tests behavior when operation partially fails',
            setup: async () => { },
            trigger: triggerFn,
            verify: verifyFn,
            cleanup: async () => { },
            expectedBehavior: 'Should return partial results with error details',
            severity: 'medium',
            tags: ['partial', 'batch', 'resilience'],
        };
    },
};
/**
 * Create a pre-configured error scenario runner
 */
function createErrorScenarioRunner() {
    return new ErrorScenarioRunner();
}
/**
 * Create an error injector
 */
function createErrorInjector() {
    return new ErrorInjector();
}
exports.default = {
    ErrorScenarioRunner,
    ErrorInjector,
    CommonErrorScenarios: exports.CommonErrorScenarios,
    createErrorScenarioRunner,
    createErrorInjector,
};
