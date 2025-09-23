// server/src/conductor/web-orchestration/web-orchestrator.ts

import { Pool } from 'pg';
import { createClient } from 'redis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface WebInterface {
  id: string;
  domain: string;
  capabilities: string[];
  rateLimit: RateLimitConfig;
  authRequired: boolean;
  complianceLevel: number;  // 0-100 compliance score
  costPerQuery: number;
  qualityScore: number;     // Historical quality assessment
  specializations: string[];
  robotsPolicy?: RobotsPolicy;
  tosCompliant: boolean;
  licenseClass: 'public' | 'commercial' | 'academic' | 'restricted';
}

interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit: number;
  minimumDelay: number;     // Milliseconds between requests
  concurrencyLimit: number;
}

interface RobotsPolicy {
  allowed: string[];        // Allowed paths
  disallowed: string[];     // Disallowed paths
  crawlDelay: number;       // Seconds
  respectsCrawlDelay: boolean;
}

interface WebOrchestrationPlan {
  queryId: string;
  interfaces: WebInterface[];
  priority: number;
  budgetLimit: number;
  complianceRequired: boolean;
  expectedSources: number;
  synthesisStrategy: 'consensus' | 'authority' | 'recent' | 'comprehensive';
}

interface WebResponse {
  interfaceId: string;
  domain: string;
  content: string;
  contentType: string;
  extractedClaims: Claim[];
  citations: Citation[];
  fetchedAt: Date;
  confidence: number;
  cost: number;
  latency: number;
}

interface Claim {
  id: string;
  text: string;
  entities: string[];
  confidence: number;
  sourceInterface: string;
  extractedAt: Date;
}

interface Citation {
  id: string;
  url: string;
  title: string;
  domain: string;
  snippetText: string;
  relevanceScore: number;
  authorityScore: number;
  licenseInfo: string;
}

interface SynthesizedResult {
  answer: string;
  confidence: number;
  citations: Citation[];
  sourcesUsed: number;
  contradictions: Contradiction[];
  cost: number;
  synthesisMethod: string;
  provenanceHash: string;
}

interface Contradiction {
  claim1: Claim;
  claim2: Claim;
  contradictionType: 'factual' | 'temporal' | 'numeric' | 'categorical';
  severity: number;
  resolutionStrategy: string;
}

export class WebOrchestrator {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  private interfaces: Map<string, WebInterface>;
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.interfaces = new Map();
    this.rateLimiters = new Map();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.loadWebInterfaces();
    await this.initializeRateLimiters();
  }

  /**
   * Phase 2A: Core orchestration with compliance-first approach
   */
  async orchestrateWebQuery(
    query: string,
    context: {
      userId: string;
      tenantId: string;
      purpose: string;
      budgetLimit?: number;
      urgency?: 'low' | 'medium' | 'high';
      qualityThreshold?: number;
    }
  ): Promise<SynthesizedResult> {
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
      prometheusConductorMetrics.recordOperationalMetric(
        'web_orchestration_latency', 
        totalTime,
        { tenant_id: context.tenantId, sources_used: responses.length.toString() }
      );

      prometheusConductorMetrics.recordOperationalEvent(
        'web_orchestration_success', 
        true,
        { tenant_id: context.tenantId, query_type: this.classifyQuery(query) }
      );

      logger.info('Web orchestration completed', {
        queryId: plan.queryId,
        sourcesUsed: responses.length,
        confidence: synthesizedResult.confidence,
        totalTime,
        cost: synthesizedResult.cost
      });

      return synthesizedResult;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      prometheusConductorMetrics.recordOperationalEvent(
        'web_orchestration_error', 
        false,
        { tenant_id: context.tenantId, error_type: error.name }
      );

      logger.error('Web orchestration failed', {
        error: error.message,
        query: query.substring(0, 100),
        totalTime,
        userId: context.userId
      });

      throw error;
    }
  }

  /**
   * Create intelligent orchestration plan
   */
  private async createOrchestrationPlan(
    query: string, 
    context: { userId: string; tenantId: string; purpose: string; budgetLimit?: number }
  ): Promise<WebOrchestrationPlan> {
    const queryType = this.classifyQuery(query);
    const urgency = this.assessUrgency(query, context);
    
    // Get candidate interfaces based on query classification
    const candidateInterfaces = await this.getCandidateInterfaces(queryType, query);
    
    // Filter by compliance requirements
    const complianceThreshold = context.purpose === 'intelligence_analysis' ? 90 : 70;
    const compliantInterfaces = candidateInterfaces.filter(iface => 
      iface.complianceLevel >= complianceThreshold
    );

    const plan: WebOrchestrationPlan = {
      queryId: `wq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      interfaces: compliantInterfaces,
      priority: urgency === 'high' ? 1 : urgency === 'medium' ? 3 : 5,
      budgetLimit: context.budgetLimit || this.getDefaultBudget(context.tenantId),
      complianceRequired: true,
      expectedSources: Math.min(5, compliantInterfaces.length),
      synthesisStrategy: this.determineSynthesisStrategy(queryType, context.purpose)
    };

    // Store plan for audit trail
    await this.storePlan(plan);
    
    return plan;
  }

  /**
   * Policy gate validation using OPA
   */
  private async validatePolicy(
    plan: WebOrchestrationPlan, 
    context: { userId: string; tenantId: string; purpose: string }
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
      const response = await fetch(`${opaUrl}/v1/data/intelgraph/conductor/web_orchestration_allowed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            user: { id: context.userId, tenant: context.tenantId },
            purpose: context.purpose,
            interfaces: plan.interfaces.map(iface => ({
              domain: iface.domain,
              licenseClass: iface.licenseClass,
              complianceLevel: iface.complianceLevel
            })),
            budgetLimit: plan.budgetLimit
          }
        })
      });

      if (!response.ok) {
        logger.error('OPA policy check failed', { status: response.status });
        return { allowed: false, reason: 'Policy service unavailable' };
      }

      const result = await response.json();
      return {
        allowed: result.result?.allow || false,
        reason: result.result?.explanations || 'Policy denied'
      };

    } catch (error) {
      logger.error('Policy validation error', { error: error.message });
      return { allowed: false, reason: 'Policy validation failed' };
    }
  }

  /**
   * Thompson Sampling for optimal interface selection
   */
  private async selectOptimalInterfaces(
    plan: WebOrchestrationPlan,
    context: { userId: string; tenantId: string }
  ): Promise<WebInterface[]> {
    const maxInterfaces = Math.min(plan.expectedSources, plan.interfaces.length);
    const selected: WebInterface[] = [];
    
    // Get historical performance data for Thompson Sampling
    const performanceData = await this.getPerformanceData(plan.interfaces, context.tenantId);
    
    for (let i = 0; i < maxInterfaces; i++) {
      const remaining = plan.interfaces.filter(iface => !selected.includes(iface));
      if (remaining.length === 0) break;
      
      // Thompson Sampling: sample from beta distribution for each interface
      let bestInterface = remaining[0];
      let bestScore = 0;
      
      for (const iface of remaining) {
        const perf = performanceData.get(iface.id) || { successes: 1, failures: 1 };
        
        // Sample from Beta distribution
        const score = this.sampleBeta(perf.successes, perf.failures) * iface.qualityScore;
        
        if (score > bestScore) {
          bestScore = score;
          bestInterface = iface;
        }
      }
      
      selected.push(bestInterface);
    }

    logger.info('Interfaces selected via Thompson Sampling', {
      queryId: plan.queryId,
      selected: selected.map(iface => ({ domain: iface.domain, quality: iface.qualityScore }))
    });
    
    return selected;
  }

  /**
   * Execute parallel queries with respectful rate limiting
   */
  private async executeParallelQueries(
    query: string,
    interfaces: WebInterface[],
    context: { userId: string; tenantId: string; purpose: string }
  ): Promise<WebResponse[]> {
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
        
      } catch (error) {
        logger.warn('Query execution failed', {
          domain: iface.domain,
          error: error.message,
          query: query.substring(0, 50)
        });
        
        // Return empty response instead of failing entire orchestration
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    const successfulResponses = results
      .filter((result): result is PromiseFulfilledResult<WebResponse> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    if (successfulResponses.length === 0) {
      throw new Error('All web interface queries failed');
    }

    return successfulResponses;
  }

  /**
   * Execute query against specific web interface
   */
  private async executeQuery(
    query: string, 
    iface: WebInterface, 
    context: { userId: string; tenantId: string; purpose: string }
  ): Promise<WebResponse> {
    const startTime = Date.now();
    
    // Adapter pattern: different execution strategies per interface type
    let content: string;
    let contentType: string;
    
    if (iface.capabilities.includes('api')) {
      const result = await this.executeAPIQuery(query, iface);
      content = result.content;
      contentType = result.contentType;
    } else if (iface.capabilities.includes('scraping')) {
      const result = await this.executeScrapingQuery(query, iface);
      content = result.content;
      contentType = result.contentType;
    } else {
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
      latency
    };
  }

  /**
   * Build claim graph and detect contradictions
   */
  private async buildClaimGraph(responses: WebResponse[]): Promise<{
    claims: Claim[];
    contradictions: Contradiction[];
    supportingRelations: Array<{ claim1: string; claim2: string; strength: number }>;
  }> {
    const allClaims = responses.flatMap(response => response.extractedClaims);
    const contradictions: Contradiction[] = [];
    const supportingRelations: Array<{ claim1: string; claim2: string; strength: number }> = [];

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
            resolutionStrategy: this.determineResolutionStrategy(relationship)
          });
        } else if (relationship.type === 'support') {
          supportingRelations.push({
            claim1: claim1.id,
            claim2: claim2.id,
            strength: relationship.strength
          });
        }
      }
    }

    return { claims: allClaims, contradictions, supportingRelations };
  }

  /**
   * Synthesize final result with contradiction handling
   */
  private async synthesizeResult(
    query: string,
    claimGraph: { claims: Claim[]; contradictions: Contradiction[] },
    plan: WebOrchestrationPlan
  ): Promise<SynthesizedResult> {
    
    // Weight claims by source authority and confidence
    const weightedClaims = claimGraph.claims.map(claim => ({
      ...claim,
      weight: this.calculateClaimWeight(claim, plan.interfaces)
    }));

    // Generate answer based on synthesis strategy
    let answer: string;
    let confidence: number;
    
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
      provenanceHash
    };
  }

  // Utility methods
  private classifyQuery(query: string): string {
    // Simple classification - in production would use ML model
    if (query.toLowerCase().includes('how to') || query.toLowerCase().includes('tutorial')) {
      return 'tutorial';
    } else if (query.toLowerCase().includes('latest') || query.toLowerCase().includes('news')) {
      return 'current_events';
    } else if (query.toLowerCase().includes('api') || query.toLowerCase().includes('documentation')) {
      return 'technical_docs';
    } else if (query.toLowerCase().includes('research') || query.toLowerCase().includes('study')) {
      return 'academic';
    } else {
      return 'general';
    }
  }

  private assessUrgency(query: string, context: any): 'low' | 'medium' | 'high' {
    if (query.toLowerCase().includes('urgent') || query.toLowerCase().includes('emergency')) {
      return 'high';
    } else if (context.purpose === 'threat_analysis') {
      return 'high';
    } else {
      return 'medium';
    }
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simple beta distribution sampling - in production would use proper statistical library
    return Math.random(); // Placeholder
  }

  private async getCandidateInterfaces(queryType: string, query: string): Promise<WebInterface[]> {
    // Return filtered interfaces based on query type and capabilities
    return Array.from(this.interfaces.values()).filter(iface => 
      iface.capabilities.some(cap => this.isCapabilityRelevant(cap, queryType))
    );
  }

  private isCapabilityRelevant(capability: string, queryType: string): boolean {
    const relevanceMap: Record<string, string[]> = {
      'tutorial': ['documentation', 'community_qa', 'code_examples'],
      'current_events': ['news', 'feeds', 'real_time'],
      'technical_docs': ['documentation', 'api_reference', 'code_search'],
      'academic': ['research', 'papers', 'citations'],
      'general': ['search', 'qa', 'reference']
    };
    
    return relevanceMap[queryType]?.includes(capability) || false;
  }

  private determineSynthesisStrategy(queryType: string, purpose: string): 'consensus' | 'authority' | 'recent' | 'comprehensive' {
    if (purpose === 'intelligence_analysis') return 'comprehensive';
    if (queryType === 'current_events') return 'recent';
    if (queryType === 'technical_docs') return 'authority';
    return 'consensus';
  }

  // Implementation stubs for other methods
  private async loadWebInterfaces(): Promise<void> { /* Load from database */ }
  private async initializeRateLimiters(): Promise<void> { /* Initialize rate limiters */ }
  private getDefaultBudget(tenantId: string): number { return 25.0; }
  private async storePlan(plan: WebOrchestrationPlan): Promise<void> { /* Store in database */ }
  private async getPerformanceData(interfaces: WebInterface[], tenantId: string): Promise<Map<string, { successes: number; failures: number }>> { return new Map(); }
  private async executeAPIQuery(query: string, iface: WebInterface): Promise<{ content: string; contentType: string }> { return { content: '', contentType: 'application/json' }; }
  private async executeScrapingQuery(query: string, iface: WebInterface): Promise<{ content: string; contentType: string }> { return { content: '', contentType: 'text/html' }; }
  private async extractClaims(content: string, iface: WebInterface): Promise<Claim[]> { return []; }
  private async generateCitations(content: string, iface: WebInterface, query: string): Promise<Citation[]> { return []; }
  private calculateCost(iface: WebInterface, contentLength: number, latency: number): number { return 0.1; }
  private calculateConfidence(iface: WebInterface, claims: Claim[]): number { return 0.8; }
  private async normalizeResponses(responses: WebResponse[]): Promise<WebResponse[]> { return responses; }
  private async analyzeClaims(claim1: Claim, claim2: Claim): Promise<any> { return { type: 'neutral', strength: 0 }; }
  private determineResolutionStrategy(relationship: any): string { return 'authority_wins'; }
  private calculateClaimWeight(claim: Claim, interfaces: WebInterface[]): number { return 1.0; }
  private async synthesizeByConsensus(claims: any[], query: string): Promise<{ answer: string; confidence: number }> { return { answer: 'Synthesized answer', confidence: 0.85 }; }
  private async synthesizeByAuthority(claims: any[], query: string): Promise<{ answer: string; confidence: number }> { return { answer: 'Authority answer', confidence: 0.90 }; }
  private async synthesizeByRecency(claims: any[], query: string): Promise<{ answer: string; confidence: number }> { return { answer: 'Recent answer', confidence: 0.75 }; }
  private async synthesizeComprehensive(claims: any[], query: string): Promise<{ answer: string; confidence: number }> { return { answer: 'Comprehensive answer', confidence: 0.88 }; }
  private async generateFinalCitations(claims: any[], answer: string): Promise<Citation[]> { return []; }
  private async generateProvenanceHash(claimGraph: any, plan: WebOrchestrationPlan): Promise<string> { return 'hash123'; }
  private async recordProvenance(result: SynthesizedResult, plan: WebOrchestrationPlan, responses: WebResponse[]): Promise<void> { /* Record provenance */ }
  private async updateLearningModel(plan: WebOrchestrationPlan, result: SynthesizedResult, context: any): Promise<void> { /* Update ML model */ }
}

class RateLimiter {
  private lastRequest = 0;
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {}

  allowRequest(): boolean {
    const now = Date.now();
    
    // Check minimum delay
    if (now - this.lastRequest < this.config.minimumDelay) {
      return false;
    }
    
    // Check burst limit
    const windowStart = now - 1000; // 1 second window
    this.requests = this.requests.filter(time => time > windowStart);
    
    if (this.requests.length >= this.config.burstLimit) {
      return false;
    }
    
    return true;
  }

  recordRequest(): void {
    const now = Date.now();
    this.lastRequest = now;
    this.requests.push(now);
  }
}