"use strict";
/**
 * Copilot Governance Hooks
 *
 * Governance controls for AI Copilot operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotPolicyError = exports.DEFAULT_PII_SCRUBBING_PATTERNS = exports.DEFAULT_BLOCKED_PATTERNS = exports.DEFAULT_BLOCKED_KEYWORDS = void 0;
exports.createQueryValidationHook = createQueryValidationHook;
exports.createPIIScrubbingHook = createPIIScrubbingHook;
exports.createCostControlHook = createCostControlHook;
exports.createCitationEnforcementHook = createCitationEnforcementHook;
exports.createCopilotProvenanceHook = createCopilotProvenanceHook;
exports.composeCopilotHooks = composeCopilotHooks;
function createQueryValidationHook(config) {
    return {
        async beforeQuery(request) {
            // Check query length
            if (request.query.length > config.maxQueryLength) {
                throw new CopilotPolicyError(`Query exceeds maximum length of ${config.maxQueryLength} characters`);
            }
            // Check for blocked keywords
            const lowerQuery = request.query.toLowerCase();
            for (const keyword of config.blockedKeywords) {
                if (lowerQuery.includes(keyword.toLowerCase())) {
                    throw new CopilotPolicyError(`Query contains blocked keyword: ${keyword}`);
                }
            }
            // Check for blocked patterns
            for (const pattern of config.blockedPatterns) {
                if (pattern.test(request.query)) {
                    throw new CopilotPolicyError('Query matches blocked pattern');
                }
            }
            // Check investigation requirement
            if (config.requireInvestigation && !request.investigationId) {
                throw new CopilotPolicyError('Investigation context is required for copilot queries');
            }
            return request;
        },
    };
}
exports.DEFAULT_BLOCKED_KEYWORDS = [
    'delete all',
    'drop table',
    'truncate',
    'rm -rf',
    'format c:',
    'sudo',
    'password',
    'credential',
];
exports.DEFAULT_BLOCKED_PATTERNS = [
    /\bdelete\s+from\b/i,
    /\bdrop\s+(table|database)\b/i,
    /\btruncate\s+table\b/i,
    /\bexec\s*\(/i,
    /\beval\s*\(/i,
];
function createPIIScrubbingHook(config) {
    return {
        async beforeQuery(request) {
            let scrubbedQuery = request.query;
            const detected = [];
            for (const pattern of config.patterns) {
                if (pattern.regex.test(scrubbedQuery)) {
                    detected.push(pattern.name);
                    scrubbedQuery = scrubbedQuery.replace(pattern.regex, pattern.replacement);
                }
            }
            if (detected.length > 0 && config.logDetection) {
                console.warn(`[CopilotPII] Detected PII in query: ${detected.join(', ')}`);
            }
            return {
                ...request,
                query: scrubbedQuery,
            };
        },
        async afterResponse(request, response) {
            let scrubbedAnswer = response.answer;
            for (const pattern of config.patterns) {
                scrubbedAnswer = scrubbedAnswer.replace(pattern.regex, pattern.replacement);
            }
            return {
                ...response,
                answer: scrubbedAnswer,
            };
        },
    };
}
exports.DEFAULT_PII_SCRUBBING_PATTERNS = [
    { name: 'SSN', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN]' },
    { name: 'Credit Card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD]' },
    { name: 'Phone', regex: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, replacement: '[PHONE]' },
];
function createCostControlHook(config) {
    return {
        async beforeQuery(request) {
            const usage = await config.getCurrentUsage(request.userId, request.tenantId);
            if (usage.userTokens >= config.maxTokensPerUserPerHour) {
                throw new CopilotPolicyError('User token limit exceeded for this hour');
            }
            if (usage.tenantTokens >= config.maxTokensPerTenantPerHour) {
                throw new CopilotPolicyError('Tenant token limit exceeded for this hour');
            }
            return request;
        },
        async afterResponse(request, response) {
            // Check if response exceeded token limit
            if (response.tokens.total > config.maxTokensPerRequest) {
                console.warn(`[CopilotCost] Response exceeded token limit: ${response.tokens.total} > ${config.maxTokensPerRequest}`);
            }
            // Estimate cost (rough estimate based on common pricing)
            const cost = estimateCost(response.model, response.tokens.input, response.tokens.output);
            // Track usage
            await config.trackCost(request.userId, request.tenantId, response.tokens.total, cost);
            return response;
        },
    };
}
function estimateCost(model, inputTokens, outputTokens) {
    const rates = {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        default: { input: 0.001, output: 0.002 },
    };
    const rate = rates[model] || rates.default;
    return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
}
function createCitationEnforcementHook(config) {
    return {
        async afterResponse(request, response) {
            const validCitations = response.citations.filter((c) => c.relevance >= config.minCitationConfidence);
            if (validCitations.length < config.minCitations) {
                if (config.rejectWithoutCitations) {
                    throw new CopilotPolicyError(`Response has insufficient citations: ${validCitations.length} < ${config.minCitations}`);
                }
                // Add warning to response
                return {
                    ...response,
                    answer: `[Warning: This response has limited supporting evidence]\n\n${response.answer}`,
                };
            }
            return response;
        },
    };
}
function createCopilotProvenanceHook(recorder) {
    return {
        async afterResponse(request, response) {
            await recorder.record({
                type: 'response',
                userId: request.userId,
                tenantId: request.tenantId,
                investigationId: request.investigationId,
                query: request.query.substring(0, 500), // Truncate for storage
                model: response.model,
                tokens: { input: response.tokens.input, output: response.tokens.output },
                citations: response.citations.map((c) => c.entityId),
                confidence: response.confidence,
                timestamp: new Date(),
            });
            return response;
        },
    };
}
// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------
function composeCopilotHooks(...hooks) {
    return {
        async beforeQuery(request) {
            let current = request;
            for (const hook of hooks) {
                if (hook.beforeQuery && current) {
                    current = await hook.beforeQuery(current);
                }
            }
            return current;
        },
        async afterResponse(request, response) {
            let current = response;
            for (const hook of hooks) {
                if (hook.afterResponse) {
                    current = await hook.afterResponse(request, current);
                }
            }
            return current;
        },
        async onError(request, error) {
            for (const hook of hooks) {
                if (hook.onError) {
                    await hook.onError(request, error);
                }
            }
        },
    };
}
// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------
class CopilotPolicyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CopilotPolicyError';
    }
}
exports.CopilotPolicyError = CopilotPolicyError;
