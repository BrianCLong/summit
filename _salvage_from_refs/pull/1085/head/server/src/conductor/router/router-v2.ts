// Router v2: Adaptive Expert Selection with Online Learning
// Integrates bandit algorithms with production routing logic

import { EventEmitter } from 'events';
import { adaptiveRouter, BanditContext, ExpertArm, RouteDecision } from '../learn/bandit';
import { prometheusConductorMetrics } from '../observability/prometheus';
import { conductorResilienceManager } from '../resilience/circuit-breaker';

export interface RouterQuery {
  id: string;
  query: string;
  context: {
    domain?: string;
    sensitivity?: 'public' | 'internal' | 'confidential' | 'secret';
    tenant: string;
    userId?: string;
    urgency?: 'low' | 'medium' | 'high';
    expectedResponseTime?: number;
    maxCost?: number;
  };
  metadata?: Record<string, any>;
}

export interface RouterResponse {
  queryId: string;
  selectedExpert: ExpertArm;
  decisionId: string;
  confidence: number;
  estimatedCost: number;
  estimatedLatency: number;
  routingReason: string;
  fallbackChain: ExpertArm[];
  shadowDecision?: {
    arm: ExpertArm;
    confidence: number;
  };
  timing: {
    routingDecisionTime: number;
    totalProcessingTime: number;
  };
}

export interface ExpertCapability {
  arm: ExpertArm;
  costPerToken: number;
  averageLatency: number;
  maxTokens: number;
  domains: string[];
  sensitivityLevels: string[];
  reliability: number;
  currentLoad: number;
  maxConcurrency: number;
}

export interface RouterConfig {
  enableLearning: boolean;
  learningMode: 'shadow' | 'canary' | 'full';
  canaryPercent: number;
  fallbackEnabled: boolean;
  costOptimization: boolean;
  latencyOptimization: boolean;
  safetyFirst: boolean;
  tenantIsolation: boolean;
}

/**
 * Advanced Router v2 with Online Learning
 */
export class AdaptiveExpertRouter extends EventEmitter {
  private config: RouterConfig;
  private expertCapabilities: Map<ExpertArm, ExpertCapability> = new Map();
  private routingHistory = new Map<string, RouterResponse>();
  private performanceMetrics = new Map<ExpertArm, {
    successRate: number;
    averageLatency: number;
    averageCost: number;
    recentFailures: number;
  }>();

  constructor(config: RouterConfig) {
    super();
    this.config = config;
    this.initializeExpertCapabilities();
    this.startMetricsCollection();
  }

  /**
   * Route query to best expert using learning + heuristics
   */
  async route(query: RouterQuery): Promise<RouterResponse> {
    const startTime = Date.now();
    const routingStartTime = performance.now();

    try {
      // Extract routing context
      const banditContext = this.extractBanditContext(query);
      
      // Get token estimate
      const tokenEstimate = this.estimateTokens(query.query);
      banditContext.tokenEst = tokenEstimate;

      let selectedExpert: ExpertArm;
      let confidence: number;
      let routingReason: string;
      let decisionId: string;
      let shadowDecision: { arm: ExpertArm; confidence: number } | undefined;

      // Determine routing strategy
      if (this.shouldUseLearning(query, banditContext)) {
        // Use learning-based routing
        const learningDecision = await adaptiveRouter.route(banditContext, query.query);
        selectedExpert = learningDecision.selectedArm;
        confidence = learningDecision.confidence;
        decisionId = learningDecision.decisionId;
        routingReason = `Learning: ${learningDecision.explorationReason}`;

        // Shadow mode: also get production decision for comparison
        if (this.config.learningMode === 'shadow') {
          const productionExpert = this.getProductionExpert(query, banditContext);
          shadowDecision = {
            arm: productionExpert.expert,
            confidence: productionExpert.confidence
          };
          
          // Actually use production expert, but track learning decision
          if (Math.random() > this.config.canaryPercent / 100) {
            selectedExpert = productionExpert.expert;
            confidence = productionExpert.confidence;
            routingReason = `Production (shadowing ${learningDecision.selectedArm})`;
          }
        }
      } else {
        // Use production heuristics
        const productionDecision = this.getProductionExpert(query, banditContext);
        selectedExpert = productionDecision.expert;
        confidence = productionDecision.confidence;
        decisionId = `heuristic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        routingReason = productionDecision.reason;
      }

      // Apply safety checks and fallbacks
      const finalExpert = await this.applySafetyChecks(selectedExpert, query, banditContext);
      if (finalExpert !== selectedExpert) {
        routingReason += ` (safety fallback to ${finalExpert})`;
        selectedExpert = finalExpert;
        confidence *= 0.7; // Reduce confidence for fallbacks
      }

      // Calculate estimates
      const capability = this.expertCapabilities.get(selectedExpert)!;
      const estimatedCost = this.calculateCost(selectedExpert, tokenEstimate);
      const estimatedLatency = this.calculateLatency(selectedExpert, tokenEstimate, query.context);

      const routingDecisionTime = performance.now() - routingStartTime;

      const response: RouterResponse = {
        queryId: query.id,
        selectedExpert,
        decisionId,
        confidence,
        estimatedCost,
        estimatedLatency,
        routingReason,
        fallbackChain: this.generateFallbackChain(selectedExpert, banditContext),
        shadowDecision,
        timing: {
          routingDecisionTime: Math.round(routingDecisionTime * 100) / 100,
          totalProcessingTime: Date.now() - startTime
        }
      };

      // Store routing history
      this.routingHistory.set(query.id, response);

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent(`router_v2_selected_${selectedExpert}`, true);
      prometheusConductorMetrics.recordOperationalMetric('router_v2_decision_time', routingDecisionTime);
      prometheusConductorMetrics.recordOperationalMetric('router_v2_confidence', confidence);
      prometheusConductorMetrics.recordOperationalMetric('router_v2_estimated_cost', estimatedCost);

      // Emit routing event
      this.emit('route:decision', { query, response, context: banditContext });

      return response;

    } catch (error) {
      console.error('Routing error:', error);
      prometheusConductorMetrics.recordOperationalEvent('router_v2_error', false);
      
      // Fallback to safe default
      return this.createFallbackResponse(query, error.message, startTime);
    }
  }

  /**
   * Process routing outcome for learning
   */
  async processOutcome(
    queryId: string,
    outcome: {
      success: boolean;
      latency: number;
      cost: number;
      userSatisfaction?: number;
      errorType?: string;
      quality?: number;
    }
  ): Promise<void> {
    const routingResponse = this.routingHistory.get(queryId);
    if (!routingResponse) {
      console.warn(`No routing history found for query: ${queryId}`);
      return;
    }

    // Calculate reward value
    let rewardValue = outcome.success ? 0.7 : 0.2; // Base reward

    // Adjust for performance
    if (outcome.latency < routingResponse.estimatedLatency * 0.8) {
      rewardValue += 0.1; // Bonus for beating latency estimate
    } else if (outcome.latency > routingResponse.estimatedLatency * 1.5) {
      rewardValue -= 0.1; // Penalty for slow response
    }

    if (outcome.cost < routingResponse.estimatedCost * 0.9) {
      rewardValue += 0.1; // Bonus for cost efficiency
    } else if (outcome.cost > routingResponse.estimatedCost * 1.2) {
      rewardValue -= 0.1; // Penalty for cost overrun
    }

    // Factor in user satisfaction
    if (outcome.userSatisfaction !== undefined) {
      rewardValue = (rewardValue * 0.7) + (outcome.userSatisfaction * 0.3);
    }

    // Quality adjustment
    if (outcome.quality !== undefined) {
      rewardValue = (rewardValue * 0.8) + (outcome.quality * 0.2);
    }

    // Ensure reward is in [0,1] range
    rewardValue = Math.max(0, Math.min(1, rewardValue));

    // Submit reward to learning system
    if (this.config.enableLearning) {
      await adaptiveRouter.processReward({
        armId: routingResponse.selectedExpert,
        contextHash: routingResponse.decisionId,
        rewardValue,
        rewardType: outcome.success ? 'accepted_insight' : 'incident_free',
        timestamp: Date.now(),
        metadata: {
          latency: outcome.latency,
          cost: outcome.cost,
          userSatisfaction: outcome.userSatisfaction,
          quality: outcome.quality,
          errorType: outcome.errorType
        }
      });
    }

    // Update performance metrics
    this.updatePerformanceMetrics(routingResponse.selectedExpert, outcome);

    // Emit outcome event
    this.emit('route:outcome', { queryId, outcome, response: routingResponse, rewardValue });

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent('router_v2_outcome', outcome.success);
    prometheusConductorMetrics.recordOperationalMetric('router_v2_actual_latency', outcome.latency);
    prometheusConductorMetrics.recordOperationalMetric('router_v2_actual_cost', outcome.cost);
    prometheusConductorMetrics.recordOperationalMetric('router_v2_reward_value', rewardValue);
  }

  /**
   * Get routing performance analytics
   */
  getPerformanceAnalytics(): {
    expertPerformance: Record<ExpertArm, any>;
    routingAccuracy: number;
    costEfficiency: number;
    latencyAccuracy: number;
    learningMetrics: any;
  } {
    const expertPerformance: Record<ExpertArm, any> = {} as any;
    
    for (const [expert, metrics] of this.performanceMetrics) {
      expertPerformance[expert] = {
        successRate: metrics.successRate,
        averageLatency: metrics.averageLatency,
        averageCost: metrics.averageCost,
        recentFailures: metrics.recentFailures,
        reliability: this.expertCapabilities.get(expert)?.reliability || 0
      };
    }

    return {
      expertPerformance,
      routingAccuracy: this.calculateRoutingAccuracy(),
      costEfficiency: this.calculateCostEfficiency(),
      latencyAccuracy: this.calculateLatencyAccuracy(),
      learningMetrics: adaptiveRouter.getPerformanceMetrics()
    };
  }

  private extractBanditContext(query: RouterQuery): BanditContext {
    return {
      domain: this.inferDomain(query.query, query.context.domain),
      sensitivity: query.context.sensitivity || 'internal',
      tokenEst: 0, // Will be filled later
      tenant: query.context.tenant,
      userId: query.context.userId,
      timeOfDay: this.getTimeOfDay(),
      queryComplexity: this.assessComplexity(query.query),
      urgency: query.context.urgency || 'medium'
    };
  }

  private shouldUseLearning(query: RouterQuery, context: BanditContext): boolean {
    if (!this.config.enableLearning) {
      return false;
    }

    // Safety-first mode: don't learn on critical queries
    if (this.config.safetyFirst && 
        (context.sensitivity === 'secret' || context.urgency === 'high')) {
      return false;
    }

    // Tenant isolation: check if tenant is in no-learn list
    if (this.config.tenantIsolation && this.isNoLearnTenant(context.tenant)) {
      return false;
    }

    // Learning mode gates
    switch (this.config.learningMode) {
      case 'shadow':
        return true; // Always use learning in shadow mode
      case 'canary':
        return Math.random() < (this.config.canaryPercent / 100);
      case 'full':
        return true;
      default:
        return false;
    }
  }

  private getProductionExpert(
    query: RouterQuery, 
    context: BanditContext
  ): { expert: ExpertArm; confidence: number; reason: string } {
    // Production heuristics (the "old" routing logic)
    
    // Domain-based routing
    if (context.domain === 'graph') {
      return { expert: 'GRAPH_TOOL', confidence: 0.9, reason: 'Domain: graph operations' };
    }
    
    if (context.domain === 'files') {
      return { expert: 'FILES_TOOL', confidence: 0.9, reason: 'Domain: file operations' };
    }
    
    if (context.domain === 'osint') {
      return { expert: 'OSINT_TOOL', confidence: 0.85, reason: 'Domain: OSINT analysis' };
    }
    
    if (context.domain === 'export') {
      return { expert: 'EXPORT_TOOL', confidence: 0.9, reason: 'Domain: export operations' };
    }

    if (context.domain === 'rag') {
      return { expert: 'RAG_TOOL', confidence: 0.85, reason: 'Domain: RAG retrieval' };
    }

    // Token-based routing for LLM selection
    if (context.tokenEst > 5000 || context.queryComplexity === 'complex') {
      return { expert: 'LLM_HEAVY', confidence: 0.8, reason: 'High token count/complexity' };
    }

    // Default to light LLM
    return { expert: 'LLM_LIGHT', confidence: 0.7, reason: 'Default: general query' };
  }

  private async applySafetyChecks(
    selectedExpert: ExpertArm, 
    query: RouterQuery, 
    context: BanditContext
  ): Promise<ExpertArm> {
    // Check circuit breaker status
    const resilienceStatus = conductorResilienceManager.getResilienceStatus();
    const expertStatus = resilienceStatus.circuitBreakers[selectedExpert];
    
    if (expertStatus?.state === 'OPEN') {
      console.warn(`Circuit breaker OPEN for ${selectedExpert}, falling back`);
      return this.selectFallbackExpert(selectedExpert, context);
    }

    // Check expert capacity
    const capability = this.expertCapabilities.get(selectedExpert);
    if (capability && capability.currentLoad >= capability.maxConcurrency) {
      console.warn(`${selectedExpert} at capacity, falling back`);
      return this.selectFallbackExpert(selectedExpert, context);
    }

    // Check cost constraints
    if (query.context.maxCost) {
      const estimatedCost = this.calculateCost(selectedExpert, context.tokenEst);
      if (estimatedCost > query.context.maxCost) {
        console.warn(`${selectedExpert} exceeds cost limit, falling back`);
        return this.selectFallbackExpert(selectedExpert, context);
      }
    }

    return selectedExpert;
  }

  private selectFallbackExpert(originalExpert: ExpertArm, context: BanditContext): ExpertArm {
    const fallbackChain = this.generateFallbackChain(originalExpert, context);
    
    for (const fallback of fallbackChain) {
      const capability = this.expertCapabilities.get(fallback);
      const resilienceStatus = conductorResilienceManager.getResilienceStatus();
      const expertStatus = resilienceStatus.circuitBreakers[fallback];
      
      if (expertStatus?.state !== 'OPEN' && 
          capability && 
          capability.currentLoad < capability.maxConcurrency) {
        return fallback;
      }
    }
    
    // Last resort fallback
    return 'LLM_LIGHT';
  }

  private generateFallbackChain(expert: ExpertArm, context: BanditContext): ExpertArm[] {
    const fallbacks: ExpertArm[] = [];
    
    switch (expert) {
      case 'LLM_HEAVY':
        fallbacks.push('LLM_LIGHT');
        break;
      case 'LLM_LIGHT':
        fallbacks.push('LLM_HEAVY');
        break;
      case 'GRAPH_TOOL':
        fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
        break;
      case 'RAG_TOOL':
        fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
        break;
      case 'FILES_TOOL':
        fallbacks.push('LLM_LIGHT');
        break;
      case 'OSINT_TOOL':
        fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
        break;
      case 'EXPORT_TOOL':
        fallbacks.push('LLM_LIGHT');
        break;
    }
    
    // Remove duplicates and ensure fallback is different from original
    return Array.from(new Set(fallbacks)).filter(f => f !== expert);
  }

  private createFallbackResponse(
    query: RouterQuery, 
    error: string, 
    startTime: number
  ): RouterResponse {
    return {
      queryId: query.id,
      selectedExpert: 'LLM_LIGHT', // Safe fallback
      decisionId: `fallback_${Date.now()}`,
      confidence: 0.3,
      estimatedCost: 0.001,
      estimatedLatency: 2000,
      routingReason: `Fallback due to error: ${error}`,
      fallbackChain: [],
      timing: {
        routingDecisionTime: 1,
        totalProcessingTime: Date.now() - startTime
      }
    };
  }

  private initializeExpertCapabilities(): void {
    // Initialize expert capabilities with realistic values
    this.expertCapabilities.set('LLM_LIGHT', {
      arm: 'LLM_LIGHT',
      costPerToken: 0.00001,
      averageLatency: 800,
      maxTokens: 4000,
      domains: ['general', 'simple'],
      sensitivityLevels: ['public', 'internal'],
      reliability: 0.95,
      currentLoad: 0,
      maxConcurrency: 50
    });

    this.expertCapabilities.set('LLM_HEAVY', {
      arm: 'LLM_HEAVY',
      costPerToken: 0.0001,
      averageLatency: 3000,
      maxTokens: 32000,
      domains: ['general', 'complex', 'analysis'],
      sensitivityLevels: ['public', 'internal', 'confidential', 'secret'],
      reliability: 0.92,
      currentLoad: 0,
      maxConcurrency: 10
    });

    this.expertCapabilities.set('GRAPH_TOOL', {
      arm: 'GRAPH_TOOL',
      costPerToken: 0.00005,
      averageLatency: 1500,
      maxTokens: 8000,
      domains: ['graph', 'relationships', 'network'],
      sensitivityLevels: ['public', 'internal', 'confidential'],
      reliability: 0.90,
      currentLoad: 0,
      maxConcurrency: 20
    });

    this.expertCapabilities.set('RAG_TOOL', {
      arm: 'RAG_TOOL',
      costPerToken: 0.00003,
      averageLatency: 1200,
      maxTokens: 6000,
      domains: ['rag', 'search', 'retrieval'],
      sensitivityLevels: ['public', 'internal'],
      reliability: 0.88,
      currentLoad: 0,
      maxConcurrency: 25
    });

    this.expertCapabilities.set('FILES_TOOL', {
      arm: 'FILES_TOOL',
      costPerToken: 0.00002,
      averageLatency: 500,
      maxTokens: 2000,
      domains: ['files', 'documents', 'storage'],
      sensitivityLevels: ['public', 'internal', 'confidential'],
      reliability: 0.96,
      currentLoad: 0,
      maxConcurrency: 40
    });

    this.expertCapabilities.set('OSINT_TOOL', {
      arm: 'OSINT_TOOL',
      costPerToken: 0.00008,
      averageLatency: 5000,
      maxTokens: 10000,
      domains: ['osint', 'intelligence', 'investigation'],
      sensitivityLevels: ['public', 'internal', 'confidential', 'secret'],
      reliability: 0.85,
      currentLoad: 0,
      maxConcurrency: 5
    });

    this.expertCapabilities.set('EXPORT_TOOL', {
      arm: 'EXPORT_TOOL',
      costPerToken: 0.00001,
      averageLatency: 1000,
      maxTokens: 1000,
      domains: ['export', 'format', 'output'],
      sensitivityLevels: ['public', 'internal'],
      reliability: 0.94,
      currentLoad: 0,
      maxConcurrency: 30
    });

    // Initialize performance metrics
    for (const expert of this.expertCapabilities.keys()) {
      this.performanceMetrics.set(expert, {
        successRate: 0.85, // Start with reasonable baseline
        averageLatency: this.expertCapabilities.get(expert)!.averageLatency,
        averageCost: 0.001,
        recentFailures: 0
      });
    }
  }

  private estimateTokens(query: string): number {
    // Simple token estimation (4 chars ≈ 1 token)
    return Math.ceil(query.length / 4);
  }

  private calculateCost(expert: ExpertArm, tokens: number): number {
    const capability = this.expertCapabilities.get(expert);
    return capability ? capability.costPerToken * tokens : 0.001;
  }

  private calculateLatency(expert: ExpertArm, tokens: number, context: any): number {
    const capability = this.expertCapabilities.get(expert);
    if (!capability) return 2000;
    
    // Base latency + token processing time
    let latency = capability.averageLatency + (tokens * 2); // 2ms per token
    
    // Urgency adjustment
    if (context.urgency === 'high') {
      latency *= 0.8; // Faster processing for urgent requests
    }
    
    return Math.round(latency);
  }

  private inferDomain(query: string, providedDomain?: string): string {
    if (providedDomain) return providedDomain;
    
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('graph') || lowerQuery.includes('relationship') || lowerQuery.includes('network')) {
      return 'graph';
    }
    if (lowerQuery.includes('file') || lowerQuery.includes('document') || lowerQuery.includes('upload')) {
      return 'files';
    }
    if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('retrieve')) {
      return 'rag';
    }
    if (lowerQuery.includes('intelligence') || lowerQuery.includes('osint') || lowerQuery.includes('investigate')) {
      return 'osint';
    }
    if (lowerQuery.includes('export') || lowerQuery.includes('download') || lowerQuery.includes('format')) {
      return 'export';
    }
    
    return 'general';
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  private assessComplexity(query: string): 'simple' | 'medium' | 'complex' {
    if (query.length < 50) return 'simple';
    if (query.length < 200) return 'medium';
    return 'complex';
  }

  private isNoLearnTenant(tenant: string): boolean {
    // Check OPA policy or configuration for no-learn tenants
    const noLearnTenants = process.env.NO_LEARN_TENANTS?.split(',') || [];
    return noLearnTenants.includes(tenant);
  }

  private updatePerformanceMetrics(expert: ExpertArm, outcome: any): void {
    const metrics = this.performanceMetrics.get(expert);
    if (!metrics) return;
    
    // Update success rate (exponential moving average)
    const alpha = 0.1;
    metrics.successRate = (1 - alpha) * metrics.successRate + alpha * (outcome.success ? 1 : 0);
    
    // Update latency
    if (outcome.latency) {
      metrics.averageLatency = (1 - alpha) * metrics.averageLatency + alpha * outcome.latency;
    }
    
    // Update cost
    if (outcome.cost) {
      metrics.averageCost = (1 - alpha) * metrics.averageCost + alpha * outcome.cost;
    }
    
    // Update failure streak
    if (outcome.success) {
      metrics.recentFailures = 0;
    } else {
      metrics.recentFailures += 1;
    }
  }

  private calculateRoutingAccuracy(): number {
    // TODO: Implement based on routing history analysis
    return 0.85;
  }

  private calculateCostEfficiency(): number {
    // TODO: Implement cost efficiency calculation
    return 0.90;
  }

  private calculateLatencyAccuracy(): number {
    // TODO: Implement latency prediction accuracy
    return 0.82;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update current load metrics (simulate)
      for (const [expert, capability] of this.expertCapabilities) {
        capability.currentLoad = Math.floor(Math.random() * capability.maxConcurrency * 0.7);
      }
      
      // Record expert metrics
      for (const [expert, metrics] of this.performanceMetrics) {
        prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_success_rate`, metrics.successRate);
        prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_avg_latency`, metrics.averageLatency);
        prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_recent_failures`, metrics.recentFailures);
      }
      
      // Record router metrics
      prometheusConductorMetrics.recordOperationalMetric('router_v2_total_decisions', this.routingHistory.size);
      
    }, 30000); // Every 30 seconds
  }
}

// Default router configuration
export const defaultRouterConfig: RouterConfig = {
  enableLearning: process.env.NODE_ENV !== 'production',
  learningMode: 'shadow',
  canaryPercent: 10,
  fallbackEnabled: true,
  costOptimization: true,
  latencyOptimization: true,
  safetyFirst: process.env.NODE_ENV === 'production',
  tenantIsolation: true
};

// Singleton instance
export const adaptiveExpertRouter = new AdaptiveExpertRouter(defaultRouterConfig);