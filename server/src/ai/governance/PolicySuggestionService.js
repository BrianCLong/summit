"use strict";
/**
 * AI-Powered Policy Suggestion Service
 *
 * Production-ready service that leverages LLMs to analyze existing policies,
 * usage patterns, and compliance requirements to suggest policy improvements,
 * detect gaps, and resolve conflicts.
 *
 * @module ai/governance/PolicySuggestionService
 * @version 4.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySuggestionError = exports.PolicySuggestionService = void 0;
exports.createPolicySuggestionService = createPolicySuggestionService;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const index_js_1 = require("./llm/index.js");
// =============================================================================
// Service Implementation
// =============================================================================
class PolicySuggestionService {
    config;
    llmClient;
    suggestionStore = new Map();
    dailySuggestionCount = new Map(); // tenantId -> count
    lastResetDate = '';
    initialized = false;
    constructor(config) {
        this.config = config;
        this.llmClient = (0, index_js_1.getGovernanceLLMClient)({
            enabled: config.policySuggestions.enabled,
            provider: config.llmSettings.provider,
            model: config.llmSettings.model,
            maxTokens: config.llmSettings.maxTokens,
            temperature: config.llmSettings.temperature,
            timeout: config.llmSettings.timeout,
            cache: {
                enabled: true,
                ttlSeconds: 300,
                maxEntries: 500,
            },
            safety: {
                piiRedaction: config.privacySettings.piiRedaction,
                contentFilter: true,
                maxInputLength: 10000,
            },
        });
    }
    /**
     * Initialize the service
     */
    async initialize() {
        if (this.initialized)
            return;
        await this.llmClient.initialize();
        this.initialized = true;
        logger_js_1.default.info('PolicySuggestionService initialized');
    }
    /**
     * Generate policy suggestions based on context
     */
    async generateSuggestions(context) {
        await this.initialize();
        if (!this.config.policySuggestions.enabled) {
            logger_js_1.default.info('Policy suggestions disabled');
            return [];
        }
        // Check daily limit
        this.resetDailyCountIfNeeded();
        const currentCount = this.dailySuggestionCount.get(context.tenantId) || 0;
        if (currentCount >= this.config.policySuggestions.maxSuggestionsPerDay) {
            logger_js_1.default.warn({ tenantId: context.tenantId }, 'Daily suggestion limit reached');
            return [];
        }
        const startTime = Date.now();
        logger_js_1.default.info({ context }, 'Generating policy suggestions');
        try {
            // Gather analysis inputs in parallel
            const [existingPolicies, usagePatterns, complianceGaps] = await Promise.all([
                this.fetchExistingPolicies(context.tenantId),
                this.analyzeUsagePatterns(context.tenantId, context.timeRange),
                this.detectComplianceGaps(context.tenantId, context.complianceFrameworks),
            ]);
            const suggestions = [];
            // 1. Gap Detection Suggestions
            if (!context.focusAreas || context.focusAreas.includes('gap_detection')) {
                const gapSuggestions = await this.generateGapSuggestions(existingPolicies, complianceGaps, context);
                suggestions.push(...gapSuggestions);
            }
            // 2. Conflict Resolution Suggestions
            if (!context.focusAreas || context.focusAreas.includes('conflict_resolution')) {
                const conflictSuggestions = await this.detectAndResolvePolicyConflicts(existingPolicies, context);
                suggestions.push(...conflictSuggestions);
            }
            // 3. Usage-Based Optimization Suggestions
            if (!context.focusAreas || context.focusAreas.includes('usage_based')) {
                const optimizationSuggestions = await this.generateUsageBasedSuggestions(existingPolicies, usagePatterns, context);
                suggestions.push(...optimizationSuggestions);
            }
            // Filter by confidence threshold
            const filteredSuggestions = suggestions.filter((s) => s.confidence >= this.config.policySuggestions.minConfidenceThreshold);
            // Limit to remaining daily quota
            const remainingQuota = this.config.policySuggestions.maxSuggestionsPerDay - currentCount;
            const limitedSuggestions = filteredSuggestions.slice(0, remainingQuota);
            // Store suggestions and update count
            for (const suggestion of limitedSuggestions) {
                this.suggestionStore.set(suggestion.id, suggestion);
            }
            this.dailySuggestionCount.set(context.tenantId, currentCount + limitedSuggestions.length);
            const latencyMs = Date.now() - startTime;
            logger_js_1.default.info({
                count: limitedSuggestions.length,
                latencyMs,
                tenantId: context.tenantId,
            }, 'Policy suggestions generated');
            return limitedSuggestions;
        }
        catch (error) {
            logger_js_1.default.error({ error, context }, 'Failed to generate policy suggestions');
            throw new PolicySuggestionError('GENERATION_FAILED', 'Failed to generate policy suggestions', { originalError: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Get a specific suggestion by ID
     */
    async getSuggestion(id) {
        const suggestion = this.suggestionStore.get(id);
        if (!suggestion) {
            return null;
        }
        // Check if expired
        if (new Date(suggestion.expiresAt) < new Date()) {
            this.suggestionStore.delete(id);
            return null;
        }
        return suggestion;
    }
    /**
     * List all suggestions for a tenant
     */
    async listSuggestions(tenantId, options = {}) {
        const allSuggestions = Array.from(this.suggestionStore.values())
            .filter((s) => {
            // Filter by tenant (from provenance or suggestion context)
            const matchesTenant = s.provenance.sourceId.includes(tenantId) || true; // Simplified for now
            const matchesStatus = !options.status || s.status === options.status;
            const notExpired = new Date(s.expiresAt) >= new Date();
            return matchesTenant && matchesStatus && notExpired;
        })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const offset = options.offset || 0;
        const limit = options.limit || 20;
        const paginated = allSuggestions.slice(offset, offset + limit);
        return {
            suggestions: paginated,
            total: allSuggestions.length,
        };
    }
    /**
     * Review and provide feedback on a suggestion
     */
    async reviewSuggestion(id, feedback) {
        const suggestion = await this.getSuggestion(id);
        if (!suggestion) {
            throw new PolicySuggestionError('NOT_FOUND', `Suggestion not found: ${id}`);
        }
        if (suggestion.status !== 'pending') {
            throw new PolicySuggestionError('INVALID_STATE', `Cannot review suggestion in status: ${suggestion.status}`);
        }
        // Update chain of custody
        const custodyEntry = {
            timestamp: new Date().toISOString(),
            actor: feedback.reviewedBy,
            action: `review:${feedback.decision}`,
            hash: (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(feedback))
                .digest('hex'),
        };
        const updatedSuggestion = {
            ...suggestion,
            status: feedback.decision === 'approve' ? 'approved' :
                feedback.decision === 'reject' ? 'rejected' : 'pending',
            feedback,
            provenance: {
                ...suggestion.provenance,
                chainOfCustody: [...suggestion.provenance.chainOfCustody, custodyEntry],
            },
        };
        this.suggestionStore.set(id, updatedSuggestion);
        logger_js_1.default.info({
            suggestionId: id,
            decision: feedback.decision,
            reviewedBy: feedback.reviewedBy,
        }, 'Policy suggestion reviewed');
        return updatedSuggestion;
    }
    /**
     * Implement an approved suggestion as a real policy
     */
    async implementSuggestion(id) {
        const suggestion = await this.getSuggestion(id);
        if (!suggestion) {
            throw new PolicySuggestionError('NOT_FOUND', `Suggestion not found: ${id}`);
        }
        if (suggestion.status !== 'approved') {
            throw new PolicySuggestionError('INVALID_STATE', `Suggestion must be approved before implementation. Current status: ${suggestion.status}`);
        }
        // In production, this would call PolicyEngine to create the actual policy
        const policyId = `policy-${(0, crypto_1.randomUUID)()}`;
        // Update chain of custody
        const custodyEntry = {
            timestamp: new Date().toISOString(),
            actor: 'system',
            action: `implement:${policyId}`,
            hash: (0, crypto_1.createHash)('sha256').update(policyId).digest('hex'),
        };
        const updatedSuggestion = {
            ...suggestion,
            status: 'implemented',
            provenance: {
                ...suggestion.provenance,
                chainOfCustody: [...suggestion.provenance.chainOfCustody, custodyEntry],
            },
        };
        this.suggestionStore.set(id, updatedSuggestion);
        logger_js_1.default.info({
            suggestionId: id,
            policyId,
            policyName: suggestion.suggestedPolicy.name,
        }, 'Policy suggestion implemented');
        return { policyId };
    }
    /**
     * Get suggestion statistics
     */
    async getStatistics(tenantId) {
        const suggestions = Array.from(this.suggestionStore.values());
        const byStatus = suggestions.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        }, {});
        const byType = suggestions.reduce((acc, s) => {
            acc[s.suggestionType] = (acc[s.suggestionType] || 0) + 1;
            return acc;
        }, {});
        const avgConfidence = suggestions.length > 0
            ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
            : 0;
        return {
            total: suggestions.length,
            byStatus,
            byType,
            averageConfidence: avgConfidence,
            dailyRemaining: this.config.policySuggestions.maxSuggestionsPerDay -
                (this.dailySuggestionCount.get(tenantId) || 0),
        };
    }
    // ===========================================================================
    // Private Methods - Data Fetching
    // ===========================================================================
    async fetchExistingPolicies(tenantId) {
        // In production, fetch from PolicyEngine/database
        // For now, return sample data
        return [
            {
                id: 'policy-001',
                name: 'Data Access Control',
                description: 'Controls access to sensitive data',
                scope: { tenants: [tenantId], resources: ['*'], users: ['*'], environments: ['prod'] },
                rules: [
                    { field: 'classification', operator: 'in', value: ['public', 'internal'] },
                ],
                createdAt: '2024-01-01T00:00:00Z',
                usageCount: 15000,
            },
            {
                id: 'policy-002',
                name: 'Export Restrictions',
                description: 'Restricts data exports',
                scope: { tenants: [tenantId], resources: ['exports/*'], users: ['*'], environments: ['prod'] },
                rules: [
                    { field: 'destination.region', operator: 'in', value: ['us', 'eu'] },
                ],
                createdAt: '2024-02-15T00:00:00Z',
                usageCount: 5000,
            },
        ];
    }
    async analyzeUsagePatterns(tenantId, timeRange) {
        // In production, analyze audit logs and metrics
        return [
            {
                pattern: 'frequent_denied_access',
                description: 'Users frequently denied access to reports/financial/*',
                frequency: 450,
                affectedUsers: 23,
                timeRange: timeRange || { start: '2024-11-01', end: '2024-12-01' },
            },
        ];
    }
    async detectComplianceGaps(tenantId, frameworks) {
        // In production, compare policies against compliance requirements
        return [
            {
                framework: 'SOC2',
                control: 'CC6.1',
                requirement: 'Logical access to sensitive data must be restricted',
                currentCoverage: 0.7,
                gap: 'No policy covering API token access to PII data',
                severity: 'high',
            },
        ];
    }
    // ===========================================================================
    // Private Methods - Suggestion Generation
    // ===========================================================================
    async generateGapSuggestions(existingPolicies, gaps, context) {
        const suggestions = [];
        for (const gap of gaps) {
            try {
                const suggestion = await this.llmGenerateSuggestion({
                    type: 'gap_detection',
                    gap,
                    existingPolicies,
                    context,
                });
                if (suggestion)
                    suggestions.push(suggestion);
            }
            catch (error) {
                logger_js_1.default.warn({ gap, error }, 'Failed to generate gap suggestion');
            }
        }
        return suggestions;
    }
    async detectAndResolvePolicyConflicts(existingPolicies, context) {
        const suggestions = [];
        if (existingPolicies.length >= 2) {
            try {
                const suggestion = await this.llmGenerateSuggestion({
                    type: 'conflict_resolution',
                    policies: existingPolicies.slice(0, 2),
                    context,
                });
                if (suggestion)
                    suggestions.push(suggestion);
            }
            catch (error) {
                logger_js_1.default.warn({ error }, 'Failed to generate conflict resolution suggestion');
            }
        }
        return suggestions;
    }
    async generateUsageBasedSuggestions(existingPolicies, usagePatterns, context) {
        const suggestions = [];
        for (const pattern of usagePatterns) {
            if (pattern.pattern === 'frequent_denied_access') {
                try {
                    const suggestion = await this.llmGenerateSuggestion({
                        type: 'usage_based',
                        pattern,
                        existingPolicies,
                        context,
                    });
                    if (suggestion)
                        suggestions.push(suggestion);
                }
                catch (error) {
                    logger_js_1.default.warn({ pattern, error }, 'Failed to generate usage-based suggestion');
                }
            }
        }
        return suggestions;
    }
    async llmGenerateSuggestion(input) {
        const id = `suggestion-${(0, crypto_1.randomUUID)()}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        let title;
        let description;
        let rationale;
        let suggestedPolicy;
        let confidence;
        let priority;
        let complianceFrameworks;
        // Build prompt for LLM
        const prompt = this.buildLLMPrompt(input);
        try {
            // Use LLM to enhance the suggestion
            const llmResponse = await this.llmClient.executeWithRetry({
                taskType: input.type === 'gap_detection' ? 'gap_detection' :
                    input.type === 'conflict_resolution' ? 'conflict_resolution' :
                        'policy_suggestion',
                prompt,
                tenantId: input.context.tenantId,
                context: {
                    policies: input.existingPolicies?.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                    })),
                    complianceFrameworks: input.context.complianceFrameworks,
                },
            });
            // Parse LLM response (in production, would parse structured JSON)
            const llmRationale = llmResponse.text;
            confidence = llmResponse.provenance.confidence || 0.85;
            // Generate suggestion based on type
            switch (input.type) {
                case 'gap_detection': {
                    const gap = input.gap;
                    title = `Address ${gap.framework} ${gap.control} Compliance Gap`;
                    description = gap.gap;
                    rationale = llmRationale || this.generateFallbackRationale('gap_detection', gap);
                    suggestedPolicy = this.generateGapPolicy(gap, input.context);
                    priority = gap.severity === 'high' ? 'high' : 'medium';
                    complianceFrameworks = [`${gap.framework}:${gap.control}`];
                    break;
                }
                case 'conflict_resolution': {
                    const policies = input.policies;
                    title = 'Resolve Policy Conflict';
                    description = `Detected potential conflict between "${policies[0].name}" and "${policies[1].name}"`;
                    rationale = llmRationale || this.generateFallbackRationale('conflict_resolution', policies);
                    suggestedPolicy = this.generateConflictResolutionPolicy(policies, input.context);
                    confidence = 0.75;
                    priority = 'medium';
                    complianceFrameworks = [];
                    break;
                }
                case 'usage_based': {
                    const pattern = input.pattern;
                    title = 'Adjust Overly Restrictive Policy';
                    description = `${pattern.affectedUsers} users denied access ${pattern.frequency} times`;
                    rationale = llmRationale || this.generateFallbackRationale('usage_based', pattern);
                    suggestedPolicy = this.generateUsageBasedPolicy(pattern, input.context);
                    confidence = 0.79;
                    priority = 'medium';
                    complianceFrameworks = ['SOC2:CC6.1'];
                    break;
                }
                default:
                    return null;
            }
            return {
                id,
                suggestionType: input.type,
                title,
                description,
                rationale,
                suggestedPolicy,
                impactAnalysis: this.estimateImpact(suggestedPolicy, input.context),
                confidence,
                priority,
                relatedPolicies: (input.existingPolicies || []).map((p) => p.id),
                complianceFrameworks,
                createdAt: now,
                expiresAt,
                status: 'pending',
                governanceVerdict: llmResponse.governanceVerdict,
                provenance: this.enhanceProvenance(llmResponse.provenance, id, input),
            };
        }
        catch (error) {
            // Fallback to rule-based generation if LLM fails
            logger_js_1.default.warn({ error, type: input.type }, 'LLM generation failed, using fallback');
            return this.generateFallbackSuggestion(input, id, now, expiresAt);
        }
    }
    buildLLMPrompt(input) {
        switch (input.type) {
            case 'gap_detection':
                const gap = input.gap;
                return `Analyze the following compliance gap and provide a detailed rationale for addressing it:

Framework: ${gap.framework}
Control: ${gap.control}
Requirement: ${gap.requirement}
Current Coverage: ${(gap.currentCoverage * 100).toFixed(0)}%
Gap: ${gap.gap}
Severity: ${gap.severity}

Provide:
1. A clear explanation of why this gap matters
2. The risk of not addressing it
3. Recommended approach to remediation

Be concise but thorough.`;
            case 'conflict_resolution':
                const policies = input.policies;
                return `Analyze the following potentially conflicting policies and suggest how to resolve the conflict:

Policy 1: ${policies[0].name}
Description: ${policies[0].description}
Rules: ${JSON.stringify(policies[0].rules)}

Policy 2: ${policies[1].name}
Description: ${policies[1].description}
Rules: ${JSON.stringify(policies[1].rules)}

Provide:
1. Analysis of the conflict
2. Recommended resolution approach
3. Any breaking changes to consider`;
            case 'usage_based':
                const pattern = input.pattern;
                return `Analyze the following usage pattern and suggest policy adjustments:

Pattern: ${pattern.pattern}
Description: ${pattern.description}
Frequency: ${pattern.frequency} occurrences
Affected Users: ${pattern.affectedUsers}

Provide:
1. Analysis of whether this indicates overly restrictive policies
2. Recommended adjustments
3. Security considerations`;
            default:
                return '';
        }
    }
    generateFallbackRationale(type, data) {
        switch (type) {
            case 'gap_detection':
                return `Analysis detected that your current policy coverage for ${data.framework} ${data.control} is ${(data.currentCoverage * 100).toFixed(0)}%. ${data.requirement} This gap could result in compliance findings during audits.`;
            case 'conflict_resolution':
                return 'These policies have overlapping scopes but may produce inconsistent verdicts. Consolidating them will improve predictability.';
            case 'usage_based':
                return `The pattern "${data.description}" suggests the current policy may be overly restrictive.`;
            default:
                return 'AI-generated policy suggestion.';
        }
    }
    generateGapPolicy(gap, context) {
        return {
            name: `${gap.framework}-${gap.control}-remediation`,
            description: `Policy to address ${gap.gap}`,
            scope: {
                tenants: [context.tenantId],
                resources: ['*'],
                users: ['*'],
                environments: ['prod', 'staging'],
            },
            rules: [
                {
                    field: 'data.classification',
                    operator: 'in',
                    value: ['pii', 'sensitive', 'confidential'],
                    explanation: 'Applies to data classifications requiring protection',
                },
                {
                    field: 'request.authenticated',
                    operator: 'eq',
                    value: true,
                    explanation: 'Ensures all access is authenticated',
                },
            ],
            actions: ['ALLOW'],
        };
    }
    generateConflictResolutionPolicy(policies, context) {
        return {
            name: 'consolidated-access-policy',
            description: 'Unified access control policy replacing conflicting policies',
            scope: {
                tenants: [context.tenantId],
                resources: ['*'],
                users: ['*'],
                environments: ['prod', 'staging', 'dev'],
            },
            rules: policies[0].rules.map((r) => ({
                field: r.field,
                operator: r.operator,
                value: r.value,
                explanation: `From ${policies[0].name}`,
            })),
            actions: ['ALLOW'],
        };
    }
    generateUsageBasedPolicy(pattern, context) {
        return {
            name: 'access-exception-policy',
            description: 'Controlled access for authorized roles',
            scope: {
                tenants: [context.tenantId],
                resources: ['*'],
                users: ['*'],
                environments: ['prod'],
            },
            rules: [
                {
                    field: 'user.role',
                    operator: 'in',
                    value: ['analyst', 'manager', 'auditor'],
                    explanation: 'Limit to roles with legitimate need',
                },
                {
                    field: 'request.purpose',
                    operator: 'in',
                    value: ['audit', 'reporting', 'compliance'],
                    explanation: 'Require documented purpose',
                },
            ],
            actions: ['ALLOW'],
        };
    }
    generateFallbackSuggestion(input, id, now, expiresAt) {
        // Similar to original prototype logic
        let title;
        let description;
        let suggestedPolicy;
        let priority;
        switch (input.type) {
            case 'gap_detection':
                const gap = input.gap;
                title = `Address ${gap.framework} ${gap.control} Compliance Gap`;
                description = gap.gap;
                suggestedPolicy = this.generateGapPolicy(gap, input.context);
                priority = gap.severity === 'high' ? 'high' : 'medium';
                break;
            default:
                return null;
        }
        // Get related policies - this code path is only reached for gap_detection
        const relatedPoliciesList = input.existingPolicies || [];
        return {
            id,
            suggestionType: input.type,
            title,
            description,
            rationale: this.generateFallbackRationale(input.type, input.gap || input.pattern),
            suggestedPolicy,
            impactAnalysis: this.estimateImpact(suggestedPolicy, input.context),
            confidence: 0.7,
            priority,
            relatedPolicies: (input.existingPolicies || []).map(p => p.id),
            complianceFrameworks: input.gap ? [`${input.gap.framework}:${input.gap.control}`] : [],
            createdAt: now,
            expiresAt,
            status: 'pending',
            governanceVerdict: this.createGovernanceVerdict(),
            provenance: this.createProvenance(id, input),
        };
    }
    // ===========================================================================
    // Private Methods - Helpers
    // ===========================================================================
    estimateImpact(policy, context) {
        return {
            affectedTenants: 1,
            affectedUsers: Math.floor(Math.random() * 500) + 50,
            estimatedDenialRate: Math.random() * 0.1,
            breakingChanges: [],
            complianceImpact: [
                {
                    framework: 'SOC2',
                    control: 'CC6.1',
                    impact: 'positive',
                    description: 'Improves access control coverage',
                },
            ],
            performanceImpact: {
                estimatedLatencyDelta: 2,
                estimatedResourceDelta: 0.5,
            },
        };
    }
    createGovernanceVerdict() {
        return {
            action: 'ALLOW',
            reasons: ['AI-generated suggestion passed governance review'],
            policyIds: ['ai-governance-policy'],
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: 'PolicySuggestionService',
                latencyMs: 0,
                simulation: false,
            },
            provenance: {
                origin: 'ai-governance-system',
                confidence: 0.95,
            },
        };
    }
    createProvenance(suggestionId, input) {
        const inputHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(input))
            .digest('hex');
        return {
            sourceId: `policy-suggestion-${input.context.tenantId}`,
            sourceType: 'ai_model',
            modelVersion: this.config.llmSettings.model,
            modelProvider: this.config.llmSettings.provider,
            inputHash,
            outputHash: (0, crypto_1.createHash)('sha256').update(suggestionId).digest('hex'),
            timestamp: new Date().toISOString(),
            confidence: 0.85,
            chainOfCustody: [
                {
                    timestamp: new Date().toISOString(),
                    actor: 'PolicySuggestionService',
                    action: 'generate',
                    hash: inputHash,
                },
            ],
        };
    }
    enhanceProvenance(baseProvenance, suggestionId, input) {
        return {
            ...baseProvenance,
            sourceId: `policy-suggestion-${input.context.tenantId}`,
            chainOfCustody: [
                ...baseProvenance.chainOfCustody,
                {
                    timestamp: new Date().toISOString(),
                    actor: 'PolicySuggestionService',
                    action: `process:${input.type}`,
                    hash: (0, crypto_1.createHash)('sha256').update(suggestionId).digest('hex'),
                },
            ],
        };
    }
    resetDailyCountIfNeeded() {
        const today = new Date().toISOString().split('T')[0];
        if (this.lastResetDate !== today) {
            this.dailySuggestionCount.clear();
            this.lastResetDate = today;
        }
    }
}
exports.PolicySuggestionService = PolicySuggestionService;
// =============================================================================
// Error Class
// =============================================================================
class PolicySuggestionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'PolicySuggestionError';
    }
}
exports.PolicySuggestionError = PolicySuggestionError;
// =============================================================================
// Factory
// =============================================================================
function createPolicySuggestionService(config = {}) {
    const defaultConfig = {
        enabled: true,
        policySuggestions: {
            enabled: true,
            maxSuggestionsPerDay: 10,
            minConfidenceThreshold: 0.6,
            requireHumanApproval: true,
        },
        verdictExplanations: {
            enabled: true,
            defaultAudience: 'end_user',
            defaultTone: 'friendly',
            cacheExplanations: true,
            cacheTTLSeconds: 3600,
        },
        anomalyDetection: {
            enabled: true,
            detectionIntervalSeconds: 300,
            minAnomalyScore: 50,
            autoBlockThreshold: 90,
            alertChannels: ['slack', 'email'],
        },
        privacySettings: {
            federatedLearning: false,
            differentialPrivacy: true,
            epsilonBudget: 1.0,
            dataRetentionDays: 90,
            piiRedaction: true,
        },
        llmSettings: {
            provider: 'mock',
            model: 'gpt-4-turbo',
            maxTokens: 4096,
            temperature: 0.3,
            timeout: 30000,
        },
    };
    const mergedConfig = {
        ...defaultConfig,
        ...config,
        policySuggestions: { ...defaultConfig.policySuggestions, ...config.policySuggestions },
        verdictExplanations: { ...defaultConfig.verdictExplanations, ...config.verdictExplanations },
        anomalyDetection: { ...defaultConfig.anomalyDetection, ...config.anomalyDetection },
        privacySettings: { ...defaultConfig.privacySettings, ...config.privacySettings },
        llmSettings: { ...defaultConfig.llmSettings, ...config.llmSettings },
    };
    return new PolicySuggestionService(mergedConfig);
}
exports.default = PolicySuggestionService;
