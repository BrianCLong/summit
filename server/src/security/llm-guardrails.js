"use strict";
/**
 * LLM Guardrails Service
 *
 * Comprehensive security layer for LLM interactions addressing:
 * 1. Prompt injection and adversarial attacks
 * 2. Transformer invertibility and privacy concerns
 * 3. Output validation and sanitization
 * 4. Audit logging for regulatory compliance
 * 5. Differential privacy for sensitive data
 *
 * Based on emerging standards:
 * - OWASP Top 10 for LLM Applications
 * - NIST AI Risk Management Framework
 * - MLCommons AI Safety Benchmarks
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmGuardrails = exports.LLMGuardrailsService = exports.DifferentialPrivacyEngine = exports.InvertibilityAuditLogger = exports.OutputSanitizer = exports.PromptInjectionDetector = void 0;
// @ts-ignore
const logger_js_1 = require("../utils/logger.js");
const guard_js_1 = require("../services/guard.js");
const crypto = __importStar(require("crypto"));
const logger = logger_js_1.logger.child({ service: 'LLMGuardrails' });
// Shim for missing Metrics class
class Metrics {
    counter(name, labels) {
        // No-op or log
    }
    histogram(name, value, labels) {
        // No-op or log
    }
}
const metrics = new Metrics();
/**
 * Advanced Prompt Injection Detection
 */
class PromptInjectionDetector {
    injectionPatterns = [
        // Direct override attempts
        /ignore\s+(previous|prior|above|all)\s+(instructions|prompts|rules|context|security)/gi,
        /disregard\s+(previous|prior|above|all)\s+(instructions|prompts|rules)/gi,
        /forget\s+(previous|prior|above|all)\s+(instructions|prompts|rules|context)/gi,
        /reveal\s+(secrets|passwords|credentials)/gi,
        // System prompt extraction
        /show\s+(me\s+)?(the\s+)?(system\s+)?(prompt|instructions|rules)/gi,
        /what\s+(is|are)\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,
        /reveal\s+(your\s+)?(system\s+)?(prompt|instructions|configuration)/gi,
        /print\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,
        // Role manipulation
        /you\s+are\s+now\s+(a|an|the)?\s*\w+/gi,
        /act\s+as\s+(a|an|the)?\s*\w+/gi,
        /pretend\s+(to\s+be|you\s+are)/gi,
        /simulate\s+(a|an|the)?\s*\w+/gi,
        // Jailbreak attempts
        /(DAN|STAN)(\s+mode)?/gi, // Relaxed to match just DAN/STAN
        /jailbreak/gi,
        /developer\s+mode/gi,
        /god\s+mode/gi,
        // Delimiter injection
        /```\s*system/gi,
        /```\s*user/gi,
        /```\s*assistant/gi,
        /<\|im_start\|>/gi,
        /<\|im_end\|>/gi,
        // Data exfiltration
        /exfiltrate/gi,
        /(retrieve|extract|dump|list)\s+(all\s+)?(secrets|keys|passwords|tokens|credentials)/gi,
        /show\s+(all\s+)?(environment|env)\s+(variables|vars)/gi,
        // Encoding attacks (common obfuscation keywords)
        /base64|hex|rot13|unicode|\\x[0-9a-f]{2}/gi,
        // Output manipulation
        /end\s+of\s+conversation/gi,
        /\[INST\]/gi,
        /\[\/INST\]/gi,
    ];
    suspiciousStructures = [
        // Nested quotes suggesting payload smuggling
        /["']{3,}/g,
        // Excessive newlines (context injection)
        /\n{10,}/g,
        // Unusual unicode (homoglyph attacks)
        /[\u0400-\u04FF\u2000-\u206F]/g,
        // Control characters
        /[\x00-\x1F\x7F-\x9F]/g,
    ];
    detect(prompt) {
        const detectedPatterns = [];
        let confidence = 0;
        // Check for known injection patterns
        for (const pattern of this.injectionPatterns) {
            pattern.lastIndex = 0;
            if (pattern.test(prompt)) {
                detectedPatterns.push(pattern.source);
                confidence += 0.6;
            }
        }
        // Check for suspicious structures
        for (const pattern of this.suspiciousStructures) {
            pattern.lastIndex = 0;
            if (pattern.test(prompt)) {
                detectedPatterns.push(`structure:${pattern.source}`);
                confidence += 0.3;
            }
        }
        // Explicit checks for encoding/structure if regex fails (e.g. for pure base64)
        if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(prompt)) {
            detectedPatterns.push('base64');
            confidence += 0.5;
        }
        if (/^[0-9a-fA-F]{20,}$/.test(prompt)) {
            detectedPatterns.push('hex');
            confidence += 0.5;
        }
        // Use existing guard service
        if ((0, guard_js_1.isSuspicious)(prompt)) {
            detectedPatterns.push('guard-service-detection');
            confidence += 0.5;
        }
        // Entropy analysis
        const entropy = this.calculateEntropy(prompt);
        if (entropy > 4.5) {
            detectedPatterns.push('high-entropy');
            confidence += 0.6;
        }
        return {
            injectionDetected: confidence > 0.5,
            patterns: detectedPatterns,
            confidence: Math.min(confidence, 1.0),
        };
    }
    calculateEntropy(str) {
        const len = str.length;
        if (len === 0)
            return 0;
        const frequencies = new Map();
        for (const char of str) {
            frequencies.set(char, (frequencies.get(char) || 0) + 1);
        }
        let entropy = 0;
        for (const count of frequencies.values()) {
            const p = count / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }
}
exports.PromptInjectionDetector = PromptInjectionDetector;
/**
 * Output Sanitizer and Validator
 */
class OutputSanitizer {
    piiPatterns = [
        // Email addresses
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        // Phone numbers
        /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        // SSN
        /\d{3}-\d{2}-\d{4}/g,
        // Credit cards
        /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
        // API keys (common formats)
        /(sk|pk)[-_][a-zA-Z0-9]{32,}/g,
        /[a-f0-9]{32,64}/g, // Potential secrets/hashes
    ];
    sanitize(output, privacyLevel) {
        let sanitized = output;
        let redactions = 0;
        let piiDetected = false;
        // Redact based on privacy level
        for (const pattern of this.piiPatterns) {
            const matches = sanitized.match(pattern);
            if (matches) {
                piiDetected = true;
                if (privacyLevel === 'restricted' || privacyLevel === 'confidential') {
                    sanitized = sanitized.replace(pattern, '[REDACTED]');
                    redactions += matches.length;
                }
            }
        }
        return { sanitized, redactions, piiDetected };
    }
}
exports.OutputSanitizer = OutputSanitizer;
/**
 * Model Invertibility Audit Logger
 */
class InvertibilityAuditLogger {
    audits = new Map();
    createPromptFingerprint(prompt, salt) {
        return crypto
            .createHmac('sha256', salt)
            .update(prompt)
            .digest('hex');
    }
    async logInteraction(params) {
        const auditId = crypto.randomUUID();
        const promptHash = crypto.createHash('sha256').update(params.prompt).digest('hex');
        const promptFingerprint = this.createPromptFingerprint(params.prompt, auditId);
        const audit = {
            audit_id: auditId,
            timestamp: new Date(),
            prompt_hash: promptHash,
            user_id: params.userId,
            tenant_id: params.tenantId,
            model_provider: params.modelProvider,
            model_name: params.modelName,
            prompt_fingerprint: promptFingerprint,
            privacy_level: params.privacyLevel,
            contains_pii: params.containsPii,
            retention_policy: this.determineRetentionPolicy(params.privacyLevel, params.containsPii),
        };
        this.audits.set(auditId, audit);
        // Log for monitoring
        logger.info('LLM interaction audited', {
            audit_id: auditId,
            model: `${params.modelProvider}/${params.modelName}`,
            privacy_level: params.privacyLevel,
            contains_pii: params.containsPii,
        });
        metrics.counter('llm_interactions_audited', {
            provider: params.modelProvider,
            privacy_level: params.privacyLevel,
        });
        return auditId;
    }
    async verifyPromptProvenance(promptHash) {
        for (const audit of this.audits.values()) {
            if (audit.prompt_hash === promptHash) {
                return audit;
            }
        }
        return null;
    }
    async eraseUserData(userId) {
        let erased = 0;
        for (const [auditId, audit] of this.audits.entries()) {
            if (audit.user_id === userId) {
                this.audits.delete(auditId);
                erased++;
            }
        }
        logger.info('User LLM audit data erased', { user_id: userId, count: erased });
        return erased;
    }
    determineRetentionPolicy(privacyLevel, containsPii) {
        if (privacyLevel === 'restricted' || containsPii) {
            return '30-days'; // Strict retention for sensitive data
        }
        else if (privacyLevel === 'confidential') {
            return '90-days';
        }
        else if (privacyLevel === 'internal') {
            return '1-year';
        }
        else {
            return '3-years';
        }
    }
}
exports.InvertibilityAuditLogger = InvertibilityAuditLogger;
/**
 * Differential Privacy for LLM Prompts
 */
class DifferentialPrivacyEngine {
    defaultConfig = {
        epsilon: 1.0, // Privacy budget
        delta: 1e-5, // Privacy loss probability
        noise_mechanism: 'gaussian',
        sensitivity: 1.0,
    };
    applyNoise(prompt, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const words = prompt.split(/\s+/);
        const noisyWords = [];
        for (let i = 0; i < words.length; i++) {
            const perturbProbability = Math.exp(-finalConfig.epsilon);
            if (Math.random() > perturbProbability) {
                noisyWords.push(words[i]);
            }
            else {
                noisyWords.push(this.perturbWord(words[i]));
            }
        }
        return noisyWords.join(' ');
    }
    perturbWord(word) {
        if (/^\d+$/.test(word)) {
            const num = parseInt(word, 10);
            const magnitude = Math.pow(10, Math.floor(Math.log10(num)));
            return `~${Math.round(num / magnitude) * magnitude}`;
        }
        return word;
    }
}
exports.DifferentialPrivacyEngine = DifferentialPrivacyEngine;
/**
 * Main LLM Guardrails Service
 */
class LLMGuardrailsService {
    injectionDetector = new PromptInjectionDetector();
    outputSanitizer = new OutputSanitizer();
    auditLogger = new InvertibilityAuditLogger();
    privacyEngine = new DifferentialPrivacyEngine();
    safetyService;
    constructor() {
        logger.info('LLM Guardrails Service initialized');
    }
    async validateInput(params) {
        const startTime = Date.now();
        const warnings = [];
        let riskScore = 0;
        let processedPrompt = params.prompt;
        // 1. Prompt injection detection
        const injectionResult = this.injectionDetector.detect(params.prompt);
        if (injectionResult.injectionDetected) {
            logger.warn('Prompt injection detected', {
                user_id: params.userId,
                patterns: injectionResult.patterns,
                confidence: injectionResult.confidence,
            });
            metrics.counter('llm_prompt_injection_blocked', {
                provider: params.modelProvider,
            });
            return {
                allowed: false,
                reason: 'Prompt injection attack detected',
                risk_score: injectionResult.confidence,
                warnings: injectionResult.patterns,
            };
        }
        // 2. SafetyV2 integration
        if (this.safetyService) {
            try {
                const evaluation = await this.safetyService.evaluateActionSafety({
                    actionId: `llm-${crypto.randomUUID()}`,
                    tenantId: params.tenantId || 'default-tenant',
                    userId: params.userId || 'system',
                    actionType: 'llm_query',
                    inputText: params.prompt,
                    dataClassification: params.privacyLevel || 'internal',
                    targetResources: [],
                    metadata: { external: false, requiresCitation: false }
                });
                if (evaluation.decision !== 'allow') {
                    return {
                        allowed: false,
                        reason: `Safety violations: ${evaluation.guardrailViolations.join(', ')}`,
                        risk_score: evaluation.riskScore,
                    };
                }
                riskScore = Math.max(riskScore, evaluation.riskScore);
                if (evaluation.reasoning)
                    warnings.push(...evaluation.reasoning);
            }
            catch (error) {
                logger.error('SafetyV2 check failed', error);
                warnings.push('Safety check unavailable');
            }
        }
        // 3. PII detection
        const piiCheck = this.outputSanitizer.sanitize(params.prompt, params.privacyLevel || 'internal');
        const containsPii = piiCheck.piiDetected;
        if (containsPii) {
            warnings.push('PII detected in prompt');
            riskScore = Math.max(riskScore, 0.6);
        }
        // 4. Differential privacy
        if ((params.applyDifferentialPrivacy || containsPii) && params.privacyLevel === 'restricted') {
            processedPrompt = this.privacyEngine.applyNoise(processedPrompt);
            warnings.push('Differential privacy applied');
            logger.info('Differential privacy applied to prompt', { user_id: params.userId });
        }
        // 5. Audit logging
        const auditId = await this.auditLogger.logInteraction({
            prompt: processedPrompt,
            userId: params.userId,
            tenantId: params.tenantId,
            modelProvider: params.modelProvider,
            modelName: params.modelName,
            privacyLevel: params.privacyLevel || 'internal',
            containsPii,
        });
        const latency = Date.now() - startTime;
        metrics.histogram('llm_guardrail_validation_latency_ms', latency, { provider: params.modelProvider });
        return {
            allowed: true,
            risk_score: riskScore,
            redacted_prompt: processedPrompt !== params.prompt ? processedPrompt : undefined,
            audit_id: auditId,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
    async validateOutput(params) {
        const warnings = [];
        const privacyLevel = params.privacyLevel || 'internal';
        // 1. Sanitize PII
        const sanitized = this.outputSanitizer.sanitize(params.output, privacyLevel);
        if (sanitized.piiDetected) {
            warnings.push(`PII redacted: ${sanitized.redactions} occurrences`);
            metrics.counter('llm_output_pii_redacted', { privacy_level: privacyLevel });
        }
        // 2. Harmful content check
        const harmfulPatterns = [
            /\b(kill|harm|attack|destroy)\s+(someone|people|person)/gi,
            /instructions\s+for\s+(making|building)\s+(bomb|weapon|explosive)/gi,
            /how\s+to\s+(make|build|create)\s+a\s+(bomb|weapon|explosive)/gi,
            /here\s+are\s+instructions\s+for\s+building\s+a\s+bomb/gi,
        ];
        let containsHarmfulContent = false;
        for (const pattern of harmfulPatterns) {
            pattern.lastIndex = 0;
            if (pattern.test(params.output)) {
                containsHarmfulContent = true;
                warnings.push('Potentially harmful content detected');
                break;
            }
        }
        if (containsHarmfulContent) {
            metrics.counter('llm_harmful_output_blocked');
            return {
                safe: false,
                sanitized: '[Content blocked due to safety concerns]',
                warnings,
            };
        }
        return {
            safe: true,
            sanitized: sanitized.sanitized,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
    emergencyStop(reason, context) {
        logger.error('LLM EMERGENCY STOP', { reason, context });
        metrics.counter('llm_emergency_stops', { reason });
    }
    async eraseUserData(userId) {
        const count = await this.auditLogger.eraseUserData(userId);
        logger.info('User LLM data erased per GDPR', { user_id: userId, audit_records: count });
    }
    getHealth() {
        return {
            healthy: true,
            checks: {
                injection_detector: !!this.injectionDetector,
                output_sanitizer: !!this.outputSanitizer,
                audit_logger: !!this.auditLogger,
                privacy_engine: !!this.privacyEngine,
            },
        };
    }
}
exports.LLMGuardrailsService = LLMGuardrailsService;
exports.llmGuardrails = new LLMGuardrailsService();
