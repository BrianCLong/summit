"use strict";
// @ts-nocheck
/**
 * Policy Engine
 *
 * Core engine for evaluating policies against various inputs.
 * Supports built-in policies, OPA policies, and custom validators.
 *
 * @module pve/evaluator/PolicyEngine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResults = exports.aggregateResults = exports.fail = exports.pass = exports.PolicyResultBuilder = exports.PolicyViolationError = exports.PolicyEngine = void 0;
exports.createPolicyEngine = createPolicyEngine;
const node_path_1 = __importDefault(require("node:path"));
const OPAAdapter_js_1 = require("./OPAAdapter.js");
const PolicyResult_js_1 = require("./PolicyResult.js");
Object.defineProperty(exports, "PolicyResultBuilder", { enumerable: true, get: function () { return PolicyResult_js_1.PolicyResultBuilder; } });
Object.defineProperty(exports, "pass", { enumerable: true, get: function () { return PolicyResult_js_1.pass; } });
Object.defineProperty(exports, "fail", { enumerable: true, get: function () { return PolicyResult_js_1.fail; } });
Object.defineProperty(exports, "aggregateResults", { enumerable: true, get: function () { return PolicyResult_js_1.aggregateResults; } });
Object.defineProperty(exports, "formatResults", { enumerable: true, get: function () { return PolicyResult_js_1.formatResults; } });
const policyLoader_js_1 = require("../utils/policyLoader.js");
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
// Built-in validators
const PRDiffValidator_js_1 = require("./validators/PRDiffValidator.js");
const SchemaDriftValidator_js_1 = require("./validators/SchemaDriftValidator.js");
const TSConfigValidator_js_1 = require("./validators/TSConfigValidator.js");
const AgentOutputValidator_js_1 = require("./validators/AgentOutputValidator.js");
const MetadataInvariantValidator_js_1 = require("./validators/MetadataInvariantValidator.js");
const CIIntegrityValidator_js_1 = require("./validators/CIIntegrityValidator.js");
const DependencyAuditValidator_js_1 = require("./validators/DependencyAuditValidator.js");
const SecurityScanValidator_js_1 = require("./validators/SecurityScanValidator.js");
/**
 * Main Policy Engine class
 */
class PolicyEngine {
    config;
    opa;
    policies = new Map();
    regoPolicies = new Map();
    validators = new Map();
    resultCache = new Map();
    logger;
    initialized = false;
    constructor(config = {}) {
        this.config = {
            useBuiltIn: true,
            failFast: false,
            defaultSeverity: 'warning',
            cacheResults: false,
            ...config,
        };
        this.opa = new OPAAdapter_js_1.OPAAdapter(config.opa);
        this.logger = config.logger || (0, logger_js_1.createLogger)({ level: 'info' });
        // Register built-in validators
        if (this.config.useBuiltIn) {
            this.registerBuiltInValidators();
        }
        // Register custom validators
        if (config.validators) {
            for (const validator of config.validators) {
                this.registerValidator(validator);
            }
        }
    }
    /**
     * Initialize the policy engine
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Load policies from directory
        if (this.config.policiesDir) {
            const loaded = await (0, policyLoader_js_1.loadPolicies)({
                baseDir: this.config.policiesDir,
            });
            for (const policy of loaded) {
                this.policies.set(policy.config.id, policy);
            }
            // Load Rego policies
            this.regoPolicies = await (0, policyLoader_js_1.loadRegoPolicies)(this.config.policiesDir);
        }
        // Load built-in policies
        if (this.config.useBuiltIn) {
            const builtInDir = node_path_1.default.join(__dirname, '..', 'policies');
            try {
                const builtIn = await (0, policyLoader_js_1.loadPolicies)({ baseDir: builtInDir });
                for (const policy of builtIn) {
                    if (!this.policies.has(policy.config.id)) {
                        this.policies.set(policy.config.id, policy);
                    }
                }
                const builtInRego = await (0, policyLoader_js_1.loadRegoPolicies)(builtInDir);
                for (const [id, content] of builtInRego) {
                    if (!this.regoPolicies.has(id)) {
                        this.regoPolicies.set(id, content);
                    }
                }
            }
            catch {
                // Built-in policies may not exist yet
                this.logger.debug('No built-in policies found');
            }
        }
        // Apply overrides
        this.applyOverrides();
        this.initialized = true;
        this.logger.info('Policy engine initialized', {
            policies: this.policies.size,
            regoPolicies: this.regoPolicies.size,
            validators: this.validators.size,
        });
    }
    /**
     * Register built-in validators
     */
    registerBuiltInValidators() {
        const builtInValidators = [
            {
                id: 'pve.pr_diff',
                handles: ['pr_diff'],
                validate: (ctx) => new PRDiffValidator_js_1.PRDiffValidator().validate(ctx),
            },
            {
                id: 'pve.schema_drift',
                handles: ['schema_drift'],
                validate: (ctx) => new SchemaDriftValidator_js_1.SchemaDriftValidator().validate(ctx),
            },
            {
                id: 'pve.tsconfig_integrity',
                handles: ['tsconfig_integrity'],
                validate: (ctx) => new TSConfigValidator_js_1.TSConfigValidator().validate(ctx),
            },
            {
                id: 'pve.agent_output',
                handles: ['agent_output'],
                validate: (ctx) => new AgentOutputValidator_js_1.AgentOutputValidator().validate(ctx),
            },
            {
                id: 'pve.metadata_invariant',
                handles: ['metadata_invariant'],
                validate: (ctx) => new MetadataInvariantValidator_js_1.MetadataInvariantValidator().validate(ctx),
            },
            {
                id: 'pve.ci_integrity',
                handles: ['ci_integrity'],
                validate: (ctx) => new CIIntegrityValidator_js_1.CIIntegrityValidator().validate(ctx),
            },
            {
                id: 'pve.dependency_audit',
                handles: ['dependency_audit'],
                validate: (ctx) => new DependencyAuditValidator_js_1.DependencyAuditValidator().validate(ctx),
            },
            {
                id: 'pve.security_scan',
                handles: ['security_scan'],
                validate: (ctx) => new SecurityScanValidator_js_1.SecurityScanValidator().validate(ctx),
            },
        ];
        for (const validator of builtInValidators) {
            this.validators.set(validator.id, validator);
        }
    }
    /**
     * Register a custom validator
     */
    registerValidator(validator) {
        this.validators.set(validator.id, validator);
        this.logger.debug('Registered validator', { id: validator.id });
    }
    /**
     * Unregister a validator
     */
    unregisterValidator(id) {
        return this.validators.delete(id);
    }
    /**
     * Apply policy overrides
     */
    applyOverrides() {
        if (!this.config.overrides) {
            return;
        }
        for (const override of this.config.overrides) {
            const matchingPolicies = this.findMatchingPolicies(override.pattern);
            for (const policy of matchingPolicies) {
                if (override.enabled !== undefined) {
                    policy.config.enabled = override.enabled;
                }
                if (override.severity !== undefined) {
                    policy.config.severity = override.severity;
                }
                if (override.config !== undefined) {
                    policy.config.config = {
                        ...policy.config.config,
                        ...override.config,
                    };
                }
            }
        }
    }
    /**
     * Find policies matching a pattern
     */
    findMatchingPolicies(pattern) {
        const results = [];
        const isGlob = pattern.includes('*');
        for (const [id, policy] of this.policies) {
            if (isGlob) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
                if (regex.test(id)) {
                    results.push(policy);
                }
            }
            else if (id === pattern) {
                results.push(policy);
            }
        }
        return results;
    }
    /**
     * Evaluate policies against the given context
     */
    async evaluate(context, options = {}) {
        await this.initialize();
        const startTime = Date.now();
        const inputHash = (0, hash_js_1.hashObject)(context.input);
        // Check cache
        if (this.config.cacheResults) {
            const cacheKey = `${context.type}:${inputHash}`;
            const cached = this.resultCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const results = [];
        const policiesEvaluated = [];
        // Run built-in validators
        for (const [id, validator] of this.validators) {
            if (validator.handles.includes(context.type) &&
                (!options.types || options.types.includes(context.type))) {
                try {
                    const validatorResults = await validator.validate(context);
                    results.push(...validatorResults);
                    policiesEvaluated.push(id);
                    if (this.config.failFast &&
                        validatorResults.some((r) => !r.allowed && r.severity === 'error')) {
                        break;
                    }
                }
                catch (error) {
                    this.logger.error('Validator failed', {
                        validator: id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    results.push((0, PolicyResult_js_1.fail)(`${id}:execution`, `Validator execution failed: ${error}`, {
                        severity: 'error',
                    }));
                }
            }
        }
        // Run configured policies
        for (const [id, policy] of this.policies) {
            if (!policy.config.enabled) {
                continue;
            }
            if (!policy.config.appliesTo.includes(context.type) &&
                !policy.config.appliesTo.includes('custom')) {
                continue;
            }
            if (options.policies && !options.policies.includes(id)) {
                continue;
            }
            if (options.tags &&
                !options.tags.some((t) => policy.config.tags?.includes(t))) {
                continue;
            }
            try {
                const policyResult = await this.evaluatePolicy(policy, context);
                results.push(policyResult);
                policiesEvaluated.push(id);
                if (this.config.failFast &&
                    !policyResult.allowed &&
                    policyResult.severity === 'error') {
                    break;
                }
            }
            catch (error) {
                this.logger.error('Policy evaluation failed', {
                    policy: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                results.push((0, PolicyResult_js_1.fail)(id, `Policy evaluation failed: ${error}`, {
                    severity: 'error',
                }));
            }
        }
        const aggregate = (0, PolicyResult_js_1.aggregateResults)(results);
        const duration = Date.now() - startTime;
        const report = {
            passed: aggregate.passed,
            results,
            summary: {
                total: aggregate.total,
                passed: aggregate.passed_count,
                failed: aggregate.failed_count,
                errors: aggregate.errors.length,
                warnings: aggregate.warnings.length,
                infos: aggregate.infos.length,
            },
            metadata: {
                timestamp: new Date().toISOString(),
                duration,
                inputHash,
                policiesEvaluated,
            },
        };
        // Cache result
        if (this.config.cacheResults) {
            const cacheKey = `${context.type}:${inputHash}`;
            this.resultCache.set(cacheKey, report);
        }
        this.logger.info('Evaluation complete', {
            passed: report.passed,
            total: report.summary.total,
            duration,
        });
        return report;
    }
    /**
     * Evaluate a single policy
     */
    async evaluatePolicy(policy, context) {
        // If this is a Rego policy, use OPA
        const regoContent = this.regoPolicies.get(policy.config.id);
        if (regoContent) {
            const opaResult = await this.opa.evaluate(policy.source, context.input);
            if (!opaResult.allow) {
                const violations = opaResult.violations || [];
                return (0, PolicyResult_js_1.fail)(policy.config.id, violations[0]?.message || 'Policy violation', {
                    severity: policy.config.severity,
                    details: {
                        violations,
                        ...opaResult.details,
                    },
                });
            }
            return (0, PolicyResult_js_1.pass)(policy.config.id);
        }
        // Default: pass if no specific evaluator
        return (0, PolicyResult_js_1.pass)(policy.config.id, 'No evaluator configured');
    }
    /**
     * Assert that all policies pass
     */
    async assertAll(context, options) {
        const report = await this.evaluate(context, options);
        if (!report.passed) {
            const errorMessages = report.results
                .filter((r) => !r.allowed && r.severity === 'error')
                .map((r) => `${r.policy}: ${r.message}`)
                .join('\n');
            throw new PolicyViolationError(`Policy validation failed:\n${errorMessages}`, report);
        }
    }
    /**
     * Get all registered policies
     */
    getPolicies() {
        return Array.from(this.policies.values()).map((p) => p.config);
    }
    /**
     * Get a specific policy by ID
     */
    getPolicy(id) {
        return this.policies.get(id)?.config;
    }
    /**
     * Enable or disable a policy
     */
    setEnabled(id, enabled) {
        const policy = this.policies.get(id);
        if (policy) {
            policy.config.enabled = enabled;
            return true;
        }
        return false;
    }
    /**
     * Clear the result cache
     */
    clearCache() {
        this.resultCache.clear();
    }
    /**
     * Format results for display
     */
    formatReport(report, options) {
        return (0, PolicyResult_js_1.formatResults)(report.results, options);
    }
}
exports.PolicyEngine = PolicyEngine;
/**
 * Error thrown when policy validation fails
 */
class PolicyViolationError extends Error {
    report;
    constructor(message, report) {
        super(message);
        this.report = report;
        this.name = 'PolicyViolationError';
    }
}
exports.PolicyViolationError = PolicyViolationError;
/**
 * Create a new PolicyEngine instance
 */
function createPolicyEngine(config) {
    return new PolicyEngine(config);
}
