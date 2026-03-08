"use strict";
/**
 * Governance Engine
 *
 * Comprehensive governance system with content filtering, PII detection,
 * toxicity checking, prompt injection detection, and misuse prevention.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceEngine = void 0;
const eventemitter3_1 = require("eventemitter3");
class GovernanceEngine extends eventemitter3_1.EventEmitter {
    gates = new Map();
    customValidators = new Map();
    constructor(gates = []) {
        super();
        // Register default gates
        this.registerDefaultGates();
        // Register custom gates
        for (const gate of gates) {
            this.registerGate(gate);
        }
    }
    /**
     * Evaluate input against all governance gates
     */
    async evaluate(input, context, stage = 'prompt') {
        const violations = [];
        const warnings = [];
        let redactedInput = input;
        let totalScore = 0;
        let gateCount = 0;
        for (const [_, gate] of this.gates) {
            if (!gate.enabled)
                continue;
            gateCount++;
            const result = await this.evaluateGate(gate, input, context);
            if (!result.valid) {
                const violation = {
                    gateId: gate.id,
                    gateName: gate.name,
                    gateType: gate.type,
                    severity: this.determineSeverity(result.score),
                    message: result.issues.map((i) => i.message).join('; '),
                    action: this.determineAction(gate, result),
                    timestamp: new Date(),
                    input: input.substring(0, 200), // Truncate for storage
                    matched: result.issues.map((i) => i.type),
                };
                violations.push(violation);
                this.emit('governance:violation', { violation, context });
                if (gate.action === 'redact') {
                    redactedInput = this.redactContent(redactedInput, result.issues);
                }
                if (gate.action === 'warn') {
                    warnings.push(violation.message);
                }
            }
            totalScore += result.score;
        }
        const averageScore = gateCount > 0 ? totalScore / gateCount : 1;
        const blocked = violations.some((v) => v.action === 'blocked' && v.severity === 'critical');
        return {
            allowed: !blocked,
            violations,
            redactedInput: redactedInput !== input ? redactedInput : undefined,
            warnings,
            score: averageScore,
        };
    }
    /**
     * Evaluate messages for governance compliance
     */
    async evaluateMessages(messages, context) {
        const allViolations = [];
        const allWarnings = [];
        let minScore = 1;
        for (const message of messages) {
            const stage = message.role === 'assistant' ? 'response' : 'prompt';
            const result = await this.evaluate(message.content, context, stage);
            allViolations.push(...result.violations);
            allWarnings.push(...result.warnings);
            minScore = Math.min(minScore, result.score);
        }
        return {
            allowed: !allViolations.some((v) => v.action === 'blocked'),
            violations: allViolations,
            warnings: allWarnings,
            score: minScore,
        };
    }
    /**
     * Register a governance gate
     */
    registerGate(gate) {
        this.gates.set(gate.id, gate);
        if (gate.config.customValidator) {
            this.customValidators.set(gate.id, gate.config.customValidator);
        }
    }
    /**
     * Enable/disable a gate
     */
    setGateEnabled(gateId, enabled) {
        const gate = this.gates.get(gateId);
        if (gate) {
            gate.enabled = enabled;
        }
    }
    /**
     * Get all gates
     */
    getGates() {
        return Array.from(this.gates.values());
    }
    // ============================================================================
    // Gate Evaluation Methods
    // ============================================================================
    async evaluateGate(gate, input, context) {
        switch (gate.type) {
            case 'content-filter':
                return this.evaluateContentFilter(input, gate.config);
            case 'pii-detection':
                return this.evaluatePIIDetection(input, gate.config);
            case 'toxicity-check':
                return this.evaluateToxicity(input, gate.config);
            case 'prompt-injection':
                return this.evaluatePromptInjection(input, gate.config);
            case 'rate-limit':
                return this.evaluateRateLimit(context, gate.config);
            case 'budget-limit':
                return this.evaluateBudgetLimit(context, gate.config);
            case 'data-residency':
                return this.evaluateDataResidency(context, gate.config);
            case 'classification-level':
                return this.evaluateClassification(context, gate.config);
            case 'custom':
                return this.evaluateCustom(gate.id, input, context);
            default:
                return { valid: true, score: 1, issues: [] };
        }
    }
    evaluateContentFilter(input, config) {
        const issues = [];
        const lowerInput = input.toLowerCase();
        // Check block list
        if (config.blockList) {
            for (const pattern of config.blockList) {
                const regex = new RegExp(pattern, 'gi');
                if (regex.test(input)) {
                    issues.push({
                        type: 'blocked-content',
                        severity: 'high',
                        message: `Content contains blocked pattern: ${pattern}`,
                    });
                }
            }
        }
        // Check patterns
        if (config.patterns) {
            for (const pattern of config.patterns) {
                const regex = new RegExp(pattern, 'gi');
                if (regex.test(input)) {
                    issues.push({
                        type: 'pattern-match',
                        severity: 'medium',
                        message: `Content matches restricted pattern`,
                    });
                }
            }
        }
        const score = issues.length > 0 ? Math.max(0, 1 - issues.length * 0.2) : 1;
        return { valid: issues.length === 0, score, issues };
    }
    evaluatePIIDetection(input, config) {
        const issues = [];
        const piiPatterns = [
            { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
            { name: 'ssn', pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g },
            { name: 'phone', pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
            { name: 'credit-card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
            { name: 'ip-address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
            { name: 'passport', pattern: /\b[A-Z]{1,2}\d{6,9}\b/gi },
        ];
        for (const { name, pattern } of piiPatterns) {
            if (config.allowList?.includes(name))
                continue;
            const matches = input.match(pattern);
            if (matches) {
                issues.push({
                    type: `pii-${name}`,
                    severity: 'high',
                    message: `Detected ${name} (${matches.length} occurrences)`,
                });
            }
        }
        const score = issues.length > 0 ? Math.max(0, 1 - issues.length * 0.25) : 1;
        return { valid: issues.length === 0, score, issues };
    }
    evaluateToxicity(input, config) {
        const issues = [];
        const lowerInput = input.toLowerCase();
        // Simple toxicity patterns (in production, use ML model)
        const toxicPatterns = [
            { pattern: /\b(hate|kill|murder|attack)\s+(them|you|people)\b/gi, severity: 'critical' },
            { pattern: /\b(stupid|idiot|moron|dumb)\b/gi, severity: 'medium' },
            { pattern: /\b(threat|bomb|weapon|hack)\b/gi, severity: 'high' },
        ];
        for (const { pattern, severity } of toxicPatterns) {
            if (pattern.test(input)) {
                issues.push({
                    type: 'toxicity',
                    severity,
                    message: `Potentially toxic content detected`,
                });
            }
        }
        const threshold = config.threshold ?? 0.5;
        const toxicityScore = 1 - issues.length * 0.3;
        const valid = toxicityScore >= threshold;
        return { valid, score: Math.max(0, toxicityScore), issues };
    }
    evaluatePromptInjection(input, config) {
        const issues = [];
        // Common prompt injection patterns
        const injectionPatterns = [
            { pattern: /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi, name: 'ignore-instructions' },
            { pattern: /forget\s+(everything|all|your)\s+(instructions?|rules?)/gi, name: 'forget-instructions' },
            { pattern: /you\s+are\s+(now|actually)\s+a?\s*(different|new|other)/gi, name: 'role-change' },
            { pattern: /pretend\s+(to\s+be|you're?)\s+/gi, name: 'pretend' },
            { pattern: /disregard\s+(all|your|the)\s+(rules?|guidelines?|constraints?)/gi, name: 'disregard-rules' },
            { pattern: /jailbreak/gi, name: 'jailbreak' },
            { pattern: /DAN\s*mode/gi, name: 'dan-mode' },
            { pattern: /\[system\]|\[admin\]|\[root\]/gi, name: 'fake-system' },
            { pattern: /bypass\s+(security|safety|filter)/gi, name: 'bypass-security' },
            { pattern: /act\s+as\s+(if|though)\s+you\s+(have\s+)?no\s+(restrictions?|limits?)/gi, name: 'no-restrictions' },
        ];
        for (const { pattern, name } of injectionPatterns) {
            if (pattern.test(input)) {
                issues.push({
                    type: `injection-${name}`,
                    severity: 'critical',
                    message: `Potential prompt injection detected: ${name}`,
                });
            }
        }
        const score = issues.length > 0 ? 0 : 1;
        return { valid: issues.length === 0, score, issues };
    }
    evaluateRateLimit(context, config) {
        // Rate limiting would typically use Redis counters
        // This is a simplified implementation
        const maxRequests = config.maxRequests ?? 100;
        const currentRequests = context.metadata?.requestCount ?? 0;
        if (currentRequests >= maxRequests) {
            return {
                valid: false,
                score: 0,
                issues: [{
                        type: 'rate-limit',
                        severity: 'high',
                        message: `Rate limit exceeded: ${currentRequests}/${maxRequests}`,
                    }],
            };
        }
        return { valid: true, score: 1, issues: [] };
    }
    evaluateBudgetLimit(context, config) {
        const maxBudget = config.maxBudgetUSD ?? 50;
        const currentSpent = context.metadata?.totalSpentUSD ?? 0;
        if (currentSpent >= maxBudget) {
            return {
                valid: false,
                score: 0,
                issues: [{
                        type: 'budget-limit',
                        severity: 'critical',
                        message: `Budget limit exceeded: $${currentSpent.toFixed(2)}/$${maxBudget.toFixed(2)}`,
                    }],
            };
        }
        const remaining = maxBudget - currentSpent;
        const score = remaining / maxBudget;
        return { valid: true, score, issues: [] };
    }
    evaluateDataResidency(context, config) {
        const allowedRegions = config.allowedRegions ?? ['US', 'EU'];
        const currentRegion = context.metadata?.region ?? 'US';
        if (!allowedRegions.includes(currentRegion)) {
            return {
                valid: false,
                score: 0,
                issues: [{
                        type: 'data-residency',
                        severity: 'critical',
                        message: `Data residency violation: ${currentRegion} not in ${allowedRegions.join(', ')}`,
                    }],
            };
        }
        return { valid: true, score: 1, issues: [] };
    }
    evaluateClassification(context, config) {
        const requiredLevel = config.requiredClassification ?? 'UNCLASSIFIED';
        const currentLevel = context.metadata?.classificationLevel ?? 'UNCLASSIFIED';
        const levels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
        const requiredIndex = levels.indexOf(requiredLevel);
        const currentIndex = levels.indexOf(currentLevel);
        if (currentIndex < requiredIndex) {
            return {
                valid: false,
                score: 0,
                issues: [{
                        type: 'classification',
                        severity: 'critical',
                        message: `Classification level insufficient: ${currentLevel} < ${requiredLevel}`,
                    }],
            };
        }
        return { valid: true, score: 1, issues: [] };
    }
    async evaluateCustom(gateId, input, context) {
        const validator = this.customValidators.get(gateId);
        if (!validator) {
            return { valid: true, score: 1, issues: [] };
        }
        return validator(input, context);
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    determineSeverity(score) {
        if (score <= 0.25)
            return 'critical';
        if (score <= 0.5)
            return 'high';
        if (score <= 0.75)
            return 'medium';
        return 'low';
    }
    determineAction(gate, result) {
        if (gate.action === 'block' && result.score < 0.5)
            return 'blocked';
        if (gate.action === 'redact')
            return 'redacted';
        if (gate.action === 'warn')
            return 'warned';
        return 'logged';
    }
    redactContent(input, issues) {
        let redacted = input;
        // Redact PII patterns
        const piiPatterns = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
            /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        ];
        for (const pattern of piiPatterns) {
            redacted = redacted.replace(pattern, '[REDACTED]');
        }
        return redacted;
    }
    registerDefaultGates() {
        const defaultGates = [
            {
                id: 'content-filter-default',
                name: 'Default Content Filter',
                type: 'content-filter',
                enabled: true,
                config: {
                    blockList: ['password', 'secret_key', 'api_key'],
                },
                action: 'warn',
            },
            {
                id: 'pii-detection-default',
                name: 'PII Detection',
                type: 'pii-detection',
                enabled: true,
                config: {},
                action: 'redact',
            },
            {
                id: 'prompt-injection-default',
                name: 'Prompt Injection Detection',
                type: 'prompt-injection',
                enabled: true,
                config: {},
                action: 'block',
            },
            {
                id: 'toxicity-default',
                name: 'Toxicity Check',
                type: 'toxicity-check',
                enabled: true,
                config: { threshold: 0.5 },
                action: 'warn',
            },
        ];
        for (const gate of defaultGates) {
            this.gates.set(gate.id, gate);
        }
    }
}
exports.GovernanceEngine = GovernanceEngine;
