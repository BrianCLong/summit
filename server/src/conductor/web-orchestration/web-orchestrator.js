"use strict";
// @ts-nocheck
// server/src/conductor/web-orchestration/web-orchestrator.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebOrchestrator = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class WebOrchestrator {
    pool;
    redis;
    interfaces;
    rateLimiters;
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.interfaces = new Map();
        this.rateLimiters = new Map();
    }
    async connect() {
        await this.redis.connect();
        await this.loadWebInterfaces();
        await this.initializeRateLimiters();
    }
    /**
     * Phase 2A: Core orchestration with compliance-first approach
     */
    async orchestrateWebQuery(query, context) {
        const startTime = Date.now();
        try {
            // Step 1: Create orchestration plan
            const plan = await this.createOrchestrationPlan(query, context);
            // Step 2: Policy gate validation
            const policyCheck = await this.validatePolicy(plan, context);
            if (!policyCheck.allowed) {
                throw new Error(`Policy violation: ${policyCheck.reason}`);
            }
            // Step 3: Select optimal interfaces using Thompson Sampling
            const selectedInterfaces = await this.selectOptimalInterfaces(plan, context);
            // Step 4: Parallel execution with rate limiting
            const responses = await this.executeParallelQueries(query, selectedInterfaces, context);
            // Step 5: Normalize and extract claims
            const normalizedResponses = await this.normalizeResponses(responses);
            // Step 6: Build claim graph and detect contradictions
            const claimGraph = await this.buildClaimGraph(normalizedResponses);
            // Step 7: Synthesize final result
            const synthesizedResult = await this.synthesizeResult(query, claimGraph, plan);
            // Step 8: Record provenance and update learning
            await this.recordProvenance(synthesizedResult, plan, responses);
            await this.updateLearningModel(plan, synthesizedResult, context);
            // Update metrics
            const totalTime = Date.now() - startTime;
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('web_orchestration_latency', totalTime, {
                tenant_id: context.tenantId,
                sources_used: responses.length.toString(),
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('web_orchestration_success', true, {
                tenant_id: context.tenantId,
                query_type: this.classifyQuery(query),
            });
            logger_js_1.default.info('Web orchestration completed', {
                queryId: plan.queryId,
                sourcesUsed: responses.length,
                confidence: synthesizedResult.confidence,
                totalTime,
                cost: synthesizedResult.cost,
            });
            return synthesizedResult;
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('web_orchestration_error', false, {
                tenant_id: context.tenantId,
                error_type: error.name,
            });
            logger_js_1.default.error('Web orchestration failed', {
                error: error.message,
                query: query.substring(0, 100),
                totalTime,
                userId: context.userId,
            });
            throw error;
        }
    }
    /**
     * Create intelligent orchestration plan
     */
    async createOrchestrationPlan(query, context) {
        const queryType = this.classifyQuery(query);
        const urgency = this.assessUrgency(query, context);
        // Get candidate interfaces based on query classification
        const candidateInterfaces = await this.getCandidateInterfaces(queryType, query);
        // Filter by compliance requirements
        const complianceThreshold = context.purpose === 'intelligence_analysis' ? 90 : 70;
        const compliantInterfaces = candidateInterfaces.filter((iface) => iface.complianceLevel >= complianceThreshold);
        const plan = {
            queryId: `wq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            interfaces: compliantInterfaces,
            priority: urgency === 'high' ? 1 : urgency === 'medium' ? 3 : 5,
            budgetLimit: context.budgetLimit || this.getDefaultBudget(context.tenantId),
            complianceRequired: true,
            expectedSources: Math.min(5, compliantInterfaces.length),
            synthesisStrategy: this.determineSynthesisStrategy(queryType, context.purpose),
        };
        // Store plan for audit trail
        await this.storePlan(plan);
        return plan;
    }
    /**
     * Policy gate validation using OPA
     */
    async validatePolicy(plan, context) {
        try {
            const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
            const response = await fetch(`${opaUrl}/v1/data/intelgraph/conductor/web_orchestration_allowed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: {
                        user: { id: context.userId, tenant: context.tenantId },
                        purpose: context.purpose,
                        interfaces: plan.interfaces.map((iface) => ({
                            domain: iface.domain,
                            licenseClass: iface.licenseClass,
                            complianceLevel: iface.complianceLevel,
                        })),
                        budgetLimit: plan.budgetLimit,
                    },
                }),
            });
            if (!response.ok) {
                logger_js_1.default.error('OPA policy check failed', { status: response.status });
                return { allowed: false, reason: 'Policy service unavailable' };
            }
            const result = await response.json();
            return {
                allowed: result.result?.allow || false,
                reason: result.result?.explanations || 'Policy denied',
            };
        }
        catch (error) {
            logger_js_1.default.error('Policy validation error', { error: error.message });
            return { allowed: false, reason: 'Policy validation failed' };
        }
    }
    /**
     * Thompson Sampling for optimal interface selection
     */
    async selectOptimalInterfaces(plan, context) {
        const maxInterfaces = Math.min(plan.expectedSources, plan.interfaces.length);
        const selected = [];
        // Get historical performance data for Thompson Sampling
        const performanceData = await this.getPerformanceData(plan.interfaces, context.tenantId);
        for (let i = 0; i < maxInterfaces; i++) {
            const remaining = plan.interfaces.filter((iface) => !selected.includes(iface));
            if (remaining.length === 0)
                break;
            // Thompson Sampling: sample from beta distribution for each interface
            let bestInterface = remaining[0];
            let bestScore = 0;
            for (const iface of remaining) {
                const perf = performanceData.get(iface.id) || {
                    successes: 1,
                    failures: 1,
                };
                // Sample from Beta distribution
                const score = this.sampleBeta(perf.successes, perf.failures) * iface.qualityScore;
                if (score > bestScore) {
                    bestScore = score;
                    bestInterface = iface;
                }
            }
            selected.push(bestInterface);
        }
        logger_js_1.default.info('Interfaces selected via Thompson Sampling', {
            queryId: plan.queryId,
            selected: selected.map((iface) => ({
                domain: iface.domain,
                quality: iface.qualityScore,
            })),
        });
        return selected;
    }
    /**
     * Execute parallel queries with respectful rate limiting
     */
    async executeParallelQueries(query, interfaces, context) {
        const promises = interfaces.map(async (iface) => {
            try {
                // Check rate limiter
                const rateLimiter = this.rateLimiters.get(iface.domain);
                if (rateLimiter && !rateLimiter.allowRequest()) {
                    throw new Error(`Rate limit exceeded for ${iface.domain}`);
                }
                // Execute query against interface
                const response = await this.executeQuery(query, iface, context);
                // Update rate limiter
                if (rateLimiter) {
                    rateLimiter.recordRequest();
                }
                return response;
            }
            catch (error) {
                logger_js_1.default.warn('Query execution failed', {
                    domain: iface.domain,
                    error: error.message,
                    query: query.substring(0, 50),
                });
                // Return empty response instead of failing entire orchestration
                return null;
            }
        });
        const results = await Promise.allSettled(promises);
        const successfulResponses = results
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => result.value);
        if (successfulResponses.length === 0) {
            throw new Error('All web interface queries failed');
        }
        return successfulResponses;
    }
    /**
     * Execute query against specific web interface
     */
    async executeQuery(query, iface, context) {
        const startTime = Date.now();
        // Adapter pattern: different execution strategies per interface type
        let content;
        let contentType;
        if (iface.capabilities.includes('api')) {
            const result = await this.executeAPIQuery(query, iface);
            content = result.content;
            contentType = result.contentType;
        }
        else if (iface.capabilities.includes('scraping')) {
            const result = await this.executeScrapingQuery(query, iface);
            content = result.content;
            contentType = result.contentType;
        }
        else {
            throw new Error(`Unsupported interface type for ${iface.domain}`);
        }
        // Extract claims from content
        const claims = await this.extractClaims(content, iface);
        const citations = await this.generateCitations(content, iface, query);
        const latency = Date.now() - startTime;
        const estimatedCost = this.calculateCost(iface, content.length, latency);
        return {
            interfaceId: iface.id,
            domain: iface.domain,
            content,
            contentType,
            extractedClaims: claims,
            citations,
            fetchedAt: new Date(),
            confidence: this.calculateConfidence(iface, claims),
            cost: estimatedCost,
            latency,
        };
    }
    /**
     * Build claim graph and detect contradictions
     */
    async buildClaimGraph(responses) {
        const allClaims = responses.flatMap((response) => response.extractedClaims);
        const contradictions = [];
        const supportingRelations = [];
        // Detect contradictions using semantic similarity and factual analysis
        for (let i = 0; i < allClaims.length; i++) {
            for (let j = i + 1; j < allClaims.length; j++) {
                const claim1 = allClaims[i];
                const claim2 = allClaims[j];
                const relationship = await this.analyzeClaims(claim1, claim2);
                if (relationship.type === 'contradiction') {
                    contradictions.push({
                        claim1,
                        claim2,
                        contradictionType: relationship.contradictionType,
                        severity: relationship.severity,
                        resolutionStrategy: this.determineResolutionStrategy(relationship),
                    });
                }
                else if (relationship.type === 'support') {
                    supportingRelations.push({
                        claim1: claim1.id,
                        claim2: claim2.id,
                        strength: relationship.strength,
                    });
                }
            }
        }
        return { claims: allClaims, contradictions, supportingRelations };
    }
    /**
     * Synthesize final result with contradiction handling
     */
    async synthesizeResult(query, claimGraph, plan) {
        // Weight claims by source authority and confidence
        const weightedClaims = claimGraph.claims.map((claim) => ({
            ...claim,
            weight: this.calculateClaimWeight(claim, plan.interfaces),
        }));
        // Generate answer based on synthesis strategy
        let answer;
        let confidence;
        switch (plan.synthesisStrategy) {
            case 'consensus':
                ({ answer, confidence } = await this.synthesizeByConsensus(weightedClaims, query));
                break;
            case 'authority':
                ({ answer, confidence } = await this.synthesizeByAuthority(weightedClaims, query));
                break;
            case 'recent':
                ({ answer, confidence } = await this.synthesizeByRecency(weightedClaims, query));
                break;
            default:
                ({ answer, confidence } = await this.synthesizeComprehensive(weightedClaims, query));
        }
        // Generate citations from claims used in answer
        const citations = await this.generateFinalCitations(weightedClaims, answer);
        // Calculate total cost
        const totalCost = plan.interfaces.reduce((sum, iface) => sum + iface.costPerQuery, 0);
        // Generate provenance hash for auditability
        const provenanceHash = await this.generateProvenanceHash(claimGraph, plan);
        return {
            answer,
            confidence,
            citations,
            sourcesUsed: plan.interfaces.length,
            contradictions: claimGraph.contradictions,
            cost: totalCost,
            synthesisMethod: plan.synthesisStrategy,
            provenanceHash,
        };
    }
    // Utility methods
    classifyQuery(query) {
        // Simple classification - in production would use ML model
        if (query.toLowerCase().includes('how to') ||
            query.toLowerCase().includes('tutorial')) {
            return 'tutorial';
        }
        else if (query.toLowerCase().includes('latest') ||
            query.toLowerCase().includes('news')) {
            return 'current_events';
        }
        else if (query.toLowerCase().includes('api') ||
            query.toLowerCase().includes('documentation')) {
            return 'technical_docs';
        }
        else if (query.toLowerCase().includes('research') ||
            query.toLowerCase().includes('study')) {
            return 'academic';
        }
        else {
            return 'general';
        }
    }
    assessUrgency(query, context) {
        if (query.toLowerCase().includes('urgent') ||
            query.toLowerCase().includes('emergency')) {
            return 'high';
        }
        else if (context.purpose === 'threat_analysis') {
            return 'high';
        }
        else {
            return 'medium';
        }
    }
    sampleBeta(alpha, beta) {
        // Simple beta distribution sampling - in production would use proper statistical library
        return Math.random(); // Placeholder
    }
    async getCandidateInterfaces(queryType, query) {
        // Return filtered interfaces based on query type and capabilities
        return Array.from(this.interfaces.values()).filter((iface) => iface.capabilities.some((cap) => this.isCapabilityRelevant(cap, queryType)));
    }
    isCapabilityRelevant(capability, queryType) {
        const relevanceMap = {
            tutorial: ['documentation', 'community_qa', 'code_examples'],
            current_events: ['news', 'feeds', 'real_time'],
            technical_docs: ['documentation', 'api_reference', 'code_search'],
            academic: ['research', 'papers', 'citations'],
            general: ['search', 'qa', 'reference'],
        };
        return relevanceMap[queryType]?.includes(capability) || false;
    }
    determineSynthesisStrategy(queryType, purpose) {
        if (purpose === 'intelligence_analysis')
            return 'comprehensive';
        if (queryType === 'current_events')
            return 'recent';
        if (queryType === 'technical_docs')
            return 'authority';
        return 'consensus';
    }
    // Implementation stubs for other methods
    async loadWebInterfaces() {
        /* Load from database */
    }
    async initializeRateLimiters() {
        /* Initialize rate limiters */
    }
    getDefaultBudget(tenantId) {
        return 25.0;
    }
    async storePlan(plan) {
        /* Store in database */
    }
    async getPerformanceData(interfaces, tenantId) {
        return new Map();
    }
    async executeAPIQuery(query, iface) {
        return { content: '', contentType: 'application/json' };
    }
    async executeScrapingQuery(query, iface) {
        return { content: '', contentType: 'text/html' };
    }
    async extractClaims(content, iface) {
        return [];
    }
    async generateCitations(content, iface, query) {
        return [];
    }
    calculateCost(iface, contentLength, latency) {
        return 0.1;
    }
    calculateConfidence(iface, claims) {
        return 0.8;
    }
    async normalizeResponses(responses) {
        return responses;
    }
    async analyzeClaims(claim1, claim2) {
        return { type: 'neutral', strength: 0 };
    }
    determineResolutionStrategy(relationship) {
        return 'authority_wins';
    }
    calculateClaimWeight(claim, interfaces) {
        return 1.0;
    }
    async synthesizeByConsensus(claims, query) {
        return { answer: 'Synthesized answer', confidence: 0.85 };
    }
    async synthesizeByAuthority(claims, query) {
        return { answer: 'Authority answer', confidence: 0.9 };
    }
    async synthesizeByRecency(claims, query) {
        return { answer: 'Recent answer', confidence: 0.75 };
    }
    async synthesizeComprehensive(claims, query) {
        return { answer: 'Comprehensive answer', confidence: 0.88 };
    }
    async generateFinalCitations(claims, answer) {
        return [];
    }
    async generateProvenanceHash(claimGraph, plan) {
        return 'hash123';
    }
    async recordProvenance(result, plan, responses) {
        /* Record provenance */
    }
    async updateLearningModel(plan, result, context) {
        /* Update ML model */
    }
}
exports.WebOrchestrator = WebOrchestrator;
class RateLimiter {
    config;
    lastRequest = 0;
    requests = [];
    constructor(config) {
        this.config = config;
    }
    allowRequest() {
        const now = Date.now();
        // Check minimum delay
        if (now - this.lastRequest < this.config.minimumDelay) {
            return false;
        }
        // Check burst limit
        const windowStart = now - 1000; // 1 second window
        this.requests = this.requests.filter((time) => time > windowStart);
        if (this.requests.length >= this.config.burstLimit) {
            return false;
        }
        return true;
    }
    recordRequest() {
        const now = Date.now();
        this.lastRequest = now;
        this.requests.push(now);
    }
}
