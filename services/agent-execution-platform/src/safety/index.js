"use strict";
/**
 * Comprehensive Safety Layer
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.SafetyValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const index_js_1 = require("../logging/index.js");
class SafetyValidator {
    config;
    ajv;
    rules;
    constructor(config) {
        this.config = config;
        this.ajv = new ajv_1.default({ allErrors: true });
        (0, ajv_formats_1.default)(this.ajv);
        this.rules = new Map();
        this.initializeRules();
    }
    initializeRules() {
        // Default safety rules
        const defaultRules = [
            {
                id: 'no-sql-injection',
                name: 'SQL Injection Detection',
                check: 'injection-detection',
                severity: 'critical',
                pattern: "(?i)(union|select|insert|update|delete|drop|';|--|/\\*)",
                action: 'block',
                enabled: true,
            },
            {
                id: 'no-script-injection',
                name: 'Script Injection Detection',
                check: 'injection-detection',
                severity: 'critical',
                pattern: '(?i)(<script|javascript:|on\\w+=|eval\\()',
                action: 'block',
                enabled: true,
            },
            {
                id: 'rate-limit-check',
                name: 'Rate Limiting',
                check: 'rate-limiting',
                severity: 'warning',
                action: 'block',
                enabled: true,
            },
        ];
        for (const rule of defaultRules) {
            this.rules.set(rule.id, rule);
        }
        // Add custom rules from config
        if (this.config.customRules) {
            for (const rule of this.config.customRules) {
                this.rules.set(rule.id, rule);
            }
        }
    }
    async validate(input, executionId) {
        const violations = [];
        const timestamp = new Date();
        index_js_1.logger.getLogger().debug('Starting safety validation', {
            executionId,
            checks: this.config.enabledChecks,
        });
        // Input validation
        if (this.config.enabledChecks.includes('input-validation')) {
            const inputViolations = await this.validateInput(input);
            violations.push(...inputViolations);
        }
        // PII detection
        if (this.config.enabledChecks.includes('pii-detection')) {
            const piiViolations = await this.detectPII(input);
            violations.push(...piiViolations);
        }
        // Malicious content detection
        if (this.config.enabledChecks.includes('malicious-content')) {
            const contentViolations = await this.detectMaliciousContent(input);
            violations.push(...contentViolations);
        }
        // Injection detection
        if (this.config.enabledChecks.includes('injection-detection')) {
            const injectionViolations = await this.detectInjection(input);
            violations.push(...injectionViolations);
        }
        const passed = violations.length === 0 ||
            violations.every((v) => v.action !== 'block');
        const report = {
            passed,
            violations,
            timestamp,
            executionId,
        };
        if (!passed) {
            index_js_1.logger.getLogger().warn('Safety validation failed', {
                executionId,
                violationCount: violations.length,
                violations: violations.map((v) => v.ruleId),
            });
        }
        return report;
    }
    async validateInput(input) {
        const violations = [];
        // Check for null/undefined
        if (input === null || input === undefined) {
            violations.push({
                ruleId: 'input-null-check',
                check: 'input-validation',
                severity: 'error',
                message: 'Input cannot be null or undefined',
                details: { input },
                timestamp: new Date(),
                action: 'block',
            });
        }
        return violations;
    }
    async detectPII(content) {
        const violations = [];
        const result = await this.runPIIDetection(content);
        if (result.found) {
            violations.push({
                ruleId: 'pii-detected',
                check: 'pii-detection',
                severity: 'warning',
                message: 'PII entities detected in content',
                details: {
                    entities: result.entities,
                    confidence: result.confidence,
                },
                timestamp: new Date(),
                action: 'sanitize',
            });
        }
        return violations;
    }
    async runPIIDetection(content) {
        const entities = [];
        // Email detection
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        let match;
        while ((match = emailRegex.exec(content)) !== null) {
            entities.push({
                type: 'email',
                value: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }
        // Phone number detection (US format)
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        while ((match = phoneRegex.exec(content)) !== null) {
            entities.push({
                type: 'phone',
                value: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.85,
            });
        }
        // SSN detection
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
        while ((match = ssnRegex.exec(content)) !== null) {
            entities.push({
                type: 'ssn',
                value: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.9,
            });
        }
        return {
            found: entities.length > 0,
            entities,
            confidence: entities.length > 0
                ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
                : 0,
        };
    }
    async detectMaliciousContent(input) {
        const violations = [];
        const content = typeof input === 'string' ? input : JSON.stringify(input);
        // Check against patterns
        for (const [ruleId, rule] of this.rules) {
            if (rule.check === 'malicious-content' && rule.pattern && rule.enabled) {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(content)) {
                    violations.push({
                        ruleId,
                        check: rule.check,
                        severity: rule.severity,
                        message: 'Malicious content pattern detected: ' + rule.name,
                        details: { pattern: rule.pattern },
                        timestamp: new Date(),
                        action: rule.action,
                    });
                }
            }
        }
        return violations;
    }
    async detectInjection(input) {
        const violations = [];
        const content = typeof input === 'string' ? input : JSON.stringify(input);
        // Check injection patterns
        for (const [ruleId, rule] of this.rules) {
            if (rule.check === 'injection-detection' && rule.pattern && rule.enabled) {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(content)) {
                    violations.push({
                        ruleId,
                        check: rule.check,
                        severity: rule.severity,
                        message: 'Injection pattern detected: ' + rule.name,
                        details: { pattern: rule.pattern },
                        timestamp: new Date(),
                        action: rule.action,
                    });
                }
            }
        }
        return violations;
    }
    sanitize(content, report) {
        let sanitized = content;
        for (const violation of report.violations) {
            if (violation.action === 'sanitize' && violation.check === 'pii-detection') {
                const entities = violation.details.entities;
                for (const entity of entities) {
                    const replacement = '[REDACTED_' + entity.type.toUpperCase() + ']';
                    sanitized = sanitized.substring(0, entity.start) +
                        replacement +
                        sanitized.substring(entity.end);
                }
            }
        }
        return sanitized;
    }
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    getRules() {
        return Array.from(this.rules.values());
    }
}
exports.SafetyValidator = SafetyValidator;
class RateLimiter {
    requests;
    windowMs;
    maxRequests;
    constructor(windowMs = 60000, maxRequests = 100) {
        this.requests = new Map();
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    async checkLimit(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        // Get existing requests for this identifier
        let timestamps = this.requests.get(identifier) || [];
        // Remove old requests outside the window
        timestamps = timestamps.filter((ts) => ts > windowStart);
        // Check if limit exceeded
        if (timestamps.length >= this.maxRequests) {
            return false;
        }
        // Add current request
        timestamps.push(now);
        this.requests.set(identifier, timestamps);
        return true;
    }
    reset(identifier) {
        this.requests.delete(identifier);
    }
    getRemaining(identifier) {
        const timestamps = this.requests.get(identifier) || [];
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const validRequests = timestamps.filter((ts) => ts > windowStart);
        return Math.max(0, this.maxRequests - validRequests.length);
    }
}
exports.RateLimiter = RateLimiter;
