"use strict";
/**
 * Governance LLM Client
 *
 * Specialized LLM client for AI-assisted governance operations.
 * Integrates with the existing LLMRouter infrastructure while providing
 * governance-specific prompts, caching, and safety measures.
 *
 * @module ai/governance/llm/GovernanceLLMClient
 * @version 4.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceLLMError = exports.GovernanceLLMClient = void 0;
exports.getGovernanceLLMClient = getGovernanceLLMClient;
exports.createGovernanceLLMClient = createGovernanceLLMClient;
const crypto_1 = require("crypto");
const LLMRouter_js_1 = require("../../../services/llm/LLMRouter.js");
const logger_js_1 = __importDefault(require("../../../utils/logger.js"));
class LLMResponseCache {
    cache = new Map();
    maxEntries;
    ttlSeconds;
    constructor(maxEntries, ttlSeconds) {
        this.maxEntries = maxEntries;
        this.ttlSeconds = ttlSeconds;
    }
    generateKey(request) {
        const keyData = JSON.stringify({
            taskType: request.taskType,
            prompt: request.prompt,
            context: request.context,
            tenantId: request.tenantId,
        });
        return (0, crypto_1.createHash)('sha256').update(keyData).digest('hex');
    }
    get(request) {
        const key = this.generateKey(request);
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return { ...entry.response, cached: true };
    }
    set(request, response) {
        // Evict oldest entries if at capacity
        if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        const key = this.generateKey(request);
        this.cache.set(key, {
            response,
            expiresAt: Date.now() + this.ttlSeconds * 1000,
        });
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
class GovernanceRateLimiter {
    buckets = new Map();
    requestsPerMinute;
    tokensPerMinute;
    constructor(requestsPerMinute, tokensPerMinute) {
        this.requestsPerMinute = requestsPerMinute;
        this.tokensPerMinute = tokensPerMinute;
    }
    async checkLimit(tenantId, estimatedTokens) {
        const now = Date.now();
        const windowMs = 60 * 1000;
        let bucket = this.buckets.get(tenantId);
        // Reset bucket if window expired
        if (!bucket || now - bucket.windowStart >= windowMs) {
            bucket = { requests: 0, tokens: 0, windowStart: now };
            this.buckets.set(tenantId, bucket);
        }
        // Check limits
        if (bucket.requests >= this.requestsPerMinute) {
            const retryAfterMs = windowMs - (now - bucket.windowStart);
            return { allowed: false, retryAfterMs };
        }
        if (bucket.tokens + estimatedTokens > this.tokensPerMinute) {
            const retryAfterMs = windowMs - (now - bucket.windowStart);
            return { allowed: false, retryAfterMs };
        }
        return { allowed: true };
    }
    recordUsage(tenantId, tokens) {
        const bucket = this.buckets.get(tenantId);
        if (bucket) {
            bucket.requests++;
            bucket.tokens += tokens;
        }
    }
}
// =============================================================================
// Main Client Implementation
// =============================================================================
const DEFAULT_CONFIG = {
    enabled: true,
    provider: 'mock',
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.3,
    timeout: 30000,
    cache: {
        enabled: true,
        ttlSeconds: 300,
        maxEntries: 1000,
    },
    rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
    },
    safety: {
        piiRedaction: true,
        contentFilter: true,
        maxInputLength: 10000,
    },
};
class GovernanceLLMClient {
    config;
    llmRouter = null;
    cache;
    rateLimiter;
    initialized = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new LLMResponseCache(this.config.cache.maxEntries, this.config.cache.ttlSeconds);
        this.rateLimiter = new GovernanceRateLimiter(this.config.rateLimit.requestsPerMinute, this.config.rateLimit.tokensPerMinute);
    }
    /**
     * Initialize the LLM client
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        const routerConfig = {
            providers: [
                {
                    name: this.config.provider,
                    type: this.config.provider,
                    apiKeyEnv: this.getApiKeyEnvVar(),
                    models: {
                        policy_suggestion: this.config.model,
                        verdict_explanation: this.config.model,
                        anomaly_analysis: this.config.model,
                        gap_detection: this.config.model,
                        conflict_resolution: this.config.model,
                    },
                },
            ],
            routing: {
                defaultPolicy: 'cost-control',
            },
        };
        this.llmRouter = new LLMRouter_js_1.LLMRouter(routerConfig);
        this.initialized = true;
        logger_js_1.default.info({ config: this.config }, 'GovernanceLLMClient initialized');
    }
    /**
     * Execute a governance LLM request
     */
    async execute(request) {
        if (!this.config.enabled) {
            throw new GovernanceLLMError('LLM_DISABLED', 'AI governance features are disabled');
        }
        await this.initialize();
        const startTime = Date.now();
        // Check cache first
        if (this.config.cache.enabled) {
            const cachedResponse = this.cache.get(request);
            if (cachedResponse) {
                logger_js_1.default.debug({ taskType: request.taskType, cached: true }, 'Cache hit');
                return cachedResponse;
            }
        }
        // Check rate limit
        const estimatedTokens = this.estimateTokens(request.prompt);
        const rateLimitResult = await this.rateLimiter.checkLimit(request.tenantId, estimatedTokens);
        if (!rateLimitResult.allowed) {
            throw new GovernanceLLMError('RATE_LIMITED', `Rate limit exceeded. Retry after ${rateLimitResult.retryAfterMs}ms`, { retryAfterMs: rateLimitResult.retryAfterMs });
        }
        // Apply safety measures
        const sanitizedPrompt = this.applySafetyMeasures(request.prompt);
        // Build LLM request
        const llmRequest = {
            taskType: request.taskType,
            prompt: this.buildPrompt(request.taskType, sanitizedPrompt, request.context),
            tenantId: request.tenantId,
            metadata: {
                userId: request.userId,
                governance: true,
            },
        };
        // Execute request
        let result;
        try {
            result = await this.llmRouter.execute(llmRequest);
        }
        catch (error) {
            logger_js_1.default.error({ error, taskType: request.taskType }, 'LLM request failed');
            throw new GovernanceLLMError('LLM_ERROR', error.message);
        }
        if (!result.ok) {
            throw new GovernanceLLMError('LLM_ERROR', result.error || 'Unknown LLM error');
        }
        // Record usage
        const totalTokens = result.usage?.total_tokens || estimatedTokens;
        this.rateLimiter.recordUsage(request.tenantId, totalTokens);
        const latencyMs = Date.now() - startTime;
        // Build response with governance wrapping
        const response = {
            text: result.text || '',
            model: result.model || this.config.model,
            provider: result.provider || this.config.provider,
            usage: {
                promptTokens: result.usage?.prompt_tokens || 0,
                completionTokens: result.usage?.completion_tokens || 0,
                totalTokens,
            },
            cached: false,
            latencyMs,
            provenance: this.buildProvenance(request, result),
            governanceVerdict: this.buildGovernanceVerdict(request, latencyMs),
        };
        // Cache response
        if (this.config.cache.enabled) {
            this.cache.set(request, response);
        }
        logger_js_1.default.info({
            taskType: request.taskType,
            latencyMs,
            tokens: totalTokens,
            cached: false,
        }, 'LLM request completed');
        return response;
    }
    /**
     * Execute with automatic retry on transient failures
     */
    async executeWithRetry(request, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.execute(request);
            }
            catch (error) {
                lastError = error;
                // Don't retry on non-transient errors
                if (error.code === 'LLM_DISABLED' || error.code === 'RATE_LIMITED') {
                    throw error;
                }
                if (attempt < maxRetries) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    logger_js_1.default.warn({ attempt, backoffMs, error: error.message }, 'Retrying LLM request');
                    await this.sleep(backoffMs);
                }
            }
        }
        throw lastError;
    }
    /**
     * Clear the response cache
     */
    clearCache() {
        this.cache.clear();
        logger_js_1.default.info('LLM response cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size(),
            maxSize: this.config.cache.maxEntries,
        };
    }
    // ===========================================================================
    // Private Helper Methods
    // ===========================================================================
    getApiKeyEnvVar() {
        switch (this.config.provider) {
            case 'openai':
                return 'OPENAI_API_KEY';
            case 'anthropic':
                return 'ANTHROPIC_API_KEY';
            default:
                return 'MOCK_API_KEY';
        }
    }
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    applySafetyMeasures(prompt) {
        let sanitized = prompt;
        // Truncate if too long
        if (this.config.safety.maxInputLength && sanitized.length > this.config.safety.maxInputLength) {
            sanitized = sanitized.substring(0, this.config.safety.maxInputLength);
            logger_js_1.default.warn({ originalLength: prompt.length }, 'Prompt truncated');
        }
        // PII redaction (basic patterns)
        if (this.config.safety.piiRedaction) {
            // SSN pattern
            sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
            // Email pattern
            sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED-EMAIL]');
            // Phone pattern
            sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED-PHONE]');
        }
        return sanitized;
    }
    buildPrompt(taskType, userPrompt, context) {
        const systemPrompts = {
            policy_suggestion: `You are an AI governance policy analyst. Analyze the provided context and suggest policy improvements. Your suggestions must be specific, actionable, and aligned with compliance frameworks. Output structured JSON.`,
            verdict_explanation: `You are an AI governance explainer. Transform technical governance verdicts into clear, human-readable explanations. Tailor your language to the specified audience. Be concise but thorough.`,
            anomaly_analysis: `You are a security analyst specializing in behavioral anomaly detection. Analyze the provided behavior patterns and identify potential security concerns. Rate severity and provide actionable recommendations.`,
            gap_detection: `You are a compliance analyst. Identify gaps between current policies and compliance requirements. Reference specific framework controls and provide remediation guidance.`,
            conflict_resolution: `You are a policy conflict resolver. Analyze overlapping policies and suggest how to consolidate or prioritize them without breaking existing workflows.`,
        };
        let prompt = systemPrompts[taskType] + '\n\n';
        if (context) {
            prompt += 'CONTEXT:\n';
            if (context.policies?.length) {
                prompt += `Existing Policies: ${JSON.stringify(context.policies)}\n`;
            }
            if (context.complianceFrameworks?.length) {
                prompt += `Compliance Frameworks: ${context.complianceFrameworks.join(', ')}\n`;
            }
            if (context.userRole) {
                prompt += `User Role: ${context.userRole}\n`;
            }
            prompt += '\n';
        }
        prompt += `REQUEST:\n${userPrompt}`;
        return prompt;
    }
    buildProvenance(request, result) {
        const inputHash = (0, crypto_1.createHash)('sha256').update(request.prompt).digest('hex');
        const outputHash = (0, crypto_1.createHash)('sha256').update(result.text || '').digest('hex');
        const custodyEntry = {
            timestamp: new Date().toISOString(),
            actor: `llm:${this.config.provider}:${result.model || this.config.model}`,
            action: `generate:${request.taskType}`,
            hash: outputHash,
        };
        return {
            sourceId: `governance-llm-${this.config.provider}`,
            sourceType: 'ai_model',
            modelVersion: result.model || this.config.model,
            modelProvider: this.config.provider,
            inputHash,
            outputHash,
            timestamp: new Date().toISOString(),
            confidence: this.calculateConfidence(result),
            chainOfCustody: [custodyEntry],
        };
    }
    buildGovernanceVerdict(request, latencyMs) {
        return {
            action: 'ALLOW',
            reasons: [`AI governance output for ${request.taskType}`],
            policyIds: ['ai-governance-policy'],
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: 'governance-llm-client',
                latencyMs,
                simulation: false,
            },
            provenance: {
                origin: `ai-governance:${request.taskType}`,
                confidence: 0.95,
            },
        };
    }
    calculateConfidence(result) {
        // Base confidence based on successful response
        let confidence = 0.85;
        // Adjust based on response length (very short might indicate issues)
        if (result.text && result.text.length > 100) {
            confidence += 0.05;
        }
        // Cap at 0.95 for AI-generated content
        return Math.min(confidence, 0.95);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.GovernanceLLMClient = GovernanceLLMClient;
// =============================================================================
// Error Class
// =============================================================================
class GovernanceLLMError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'GovernanceLLMError';
    }
}
exports.GovernanceLLMError = GovernanceLLMError;
// =============================================================================
// Factory Function
// =============================================================================
let defaultClient = null;
function getGovernanceLLMClient(config) {
    if (!defaultClient) {
        defaultClient = new GovernanceLLMClient(config);
    }
    return defaultClient;
}
function createGovernanceLLMClient(config) {
    return new GovernanceLLMClient(config);
}
