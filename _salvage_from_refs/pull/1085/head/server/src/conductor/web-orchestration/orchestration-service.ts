// server/src/conductor/web-orchestration/orchestration-service.ts

import { WebOrchestrator } from './web-orchestrator.js';
import { PremiumModelRouter } from '../premium-routing/premium-model-router.js';
import { ComplianceGate } from './compliance-gate.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface OrchestrationRequest {
  query: string;
  context: {
    userId: string;
    tenantId: string;
    sessionId?: string;
    purpose: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    budgetLimit?: number;
    qualityThreshold?: number;
    expectedOutputLength?: number;
    requiredSources?: number;
    synthesisStrategy?: 'consensus' | 'authority' | 'recent' | 'comprehensive';
  };
  constraints?: {
    maxLatency?: number;
    maxCost?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
    requireCitations?: boolean;
    confidenceThreshold?: number;
  };
}

interface OrchestrationResult {
  orchestrationId: string;
  answer: string;
  confidence: number;
  citations: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    relevanceScore: number;
    licenseInfo: string;
  }>;
  metadata: {
    sourcesUsed: number;
    synthesisMethod: string;
    totalCost: number;
    processingTime: number;
    complianceScore: number;
    contradictionsFound: number;
    provenanceHash: string;
  };
  warnings?: string[];
  fallbacksUsed?: string[];
}

export class OrchestrationService {
  private webOrchestrator: WebOrchestrator;
  private premiumRouter: PremiumModelRouter;
  private complianceGate: ComplianceGate;
  private rateLimiter: RedisRateLimiter;

  constructor() {
    this.webOrchestrator = new WebOrchestrator();
    this.premiumRouter = new PremiumModelRouter();
    this.complianceGate = new ComplianceGate();
    this.rateLimiter = new RedisRateLimiter();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Maestro Orchestration Service...');
    
    await Promise.all([
      this.webOrchestrator.connect(),
      this.premiumRouter.connect(),
      this.complianceGate.connect(),
      this.rateLimiter.connect()
    ]);

    logger.info('🎼 Maestro Orchestration Service ready - the symphony begins!');
  }

  /**
   * 🎯 MAESTRO CORE: Universal Web Intelligence Orchestration
   * Phase 2A: Compliance-first multi-source synthesis with premium routing
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const orchestrationId = `maestro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info('🚀 Starting Maestro orchestration', {
      orchestrationId,
      query: request.query.substring(0, 100),
      userId: request.context.userId,
      purpose: request.context.purpose
    });

    try {
      // Phase 1: Pre-flight validation and compliance check
      const preflightCheck = await this.performPreflightCheck(request, orchestrationId);
      if (!preflightCheck.allowed) {
        throw new Error(`Pre-flight compliance failure: ${preflightCheck.reason}`);
      }

      // Phase 2: Web orchestration with multi-source synthesis
      const webResult = await this.webOrchestrator.orchestrateWebQuery(
        request.query,
        {
          userId: request.context.userId,
          tenantId: request.context.tenantId,
          purpose: request.context.purpose,
          budgetLimit: request.context.budgetLimit,
          urgency: request.context.urgency,
          qualityThreshold: request.context.qualityThreshold
        }
      );

      // Phase 3: Premium model routing for synthesis enhancement (if budget allows)
      let enhancedResult = webResult;
      const remainingBudget = (request.context.budgetLimit || 25) - webResult.cost;
      
      if (remainingBudget > 5 && webResult.contradictions.length > 0) {
        logger.info('🧠 Engaging premium synthesis for contradiction resolution', {
          orchestrationId,
          contradictions: webResult.contradictions.length,
          remainingBudget
        });

        enhancedResult = await this.enhanceWithPremiumSynthesis(
          webResult, 
          request, 
          remainingBudget
        );
      }

      // Phase 4: Final quality assurance and compliance verification
      const finalResult = await this.performQualityAssurance(
        enhancedResult, 
        request, 
        orchestrationId
      );

      // Phase 5: Record provenance and update learning
      await this.recordOrchestrationResult(finalResult, request, orchestrationId);

      const totalTime = Date.now() - startTime;

      // Update success metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'maestro_orchestration_latency',
        totalTime,
        { tenant_id: request.context.tenantId, sources_used: finalResult.sourcesUsed.toString() }
      );

      prometheusConductorMetrics.recordOperationalEvent(
        'maestro_orchestration_success',
        true,
        { tenant_id: request.context.tenantId, purpose: request.context.purpose }
      );

      logger.info('✅ Maestro orchestration completed successfully', {
        orchestrationId,
        totalTime,
        sourcesUsed: finalResult.sourcesUsed,
        confidence: finalResult.confidence,
        cost: finalResult.cost,
        complianceScore: this.calculateComplianceScore(finalResult)
      });

      return {
        orchestrationId,
        answer: finalResult.answer,
        confidence: finalResult.confidence,
        citations: finalResult.citations.map(c => ({
          url: c.url,
          title: c.title,
          snippet: c.snippetText,
          domain: c.domain,
          relevanceScore: c.relevanceScore,
          licenseInfo: c.licenseInfo
        })),
        metadata: {
          sourcesUsed: finalResult.sourcesUsed,
          synthesisMethod: finalResult.synthesisMethod,
          totalCost: finalResult.cost,
          processingTime: totalTime,
          complianceScore: this.calculateComplianceScore(finalResult),
          contradictionsFound: finalResult.contradictions.length,
          provenanceHash: finalResult.provenanceHash
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      // Record failure metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'maestro_orchestration_error',
        false,
        { 
          tenant_id: request.context.tenantId, 
          error_type: error.name,
          purpose: request.context.purpose
        }
      );

      logger.error('❌ Maestro orchestration failed', {
        orchestrationId,
        error: error.message,
        totalTime,
        query: request.query.substring(0, 100),
        userId: request.context.userId
      });

      throw error;
    }
  }

  /**
   * Pre-flight compliance and capacity check
   */
  private async performPreflightCheck(
    request: OrchestrationRequest, 
    _orchestrationId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    // Check user rate limits
    const rateLimitCheck = await this.rateLimiter.checkRateLimit(
      'global', 
      request.context.tenantId, 
      1
    );
    
    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`
      };
    }

    // Validate purpose and user authorization
    const purposeCheck = await this.validatePurpose(request.context.purpose, request.context.userId);
    if (!purposeCheck.allowed) {
      return purposeCheck;
    }

    // Budget validation
    if (request.context.budgetLimit && request.context.budgetLimit < 1) {
      return {
        allowed: false,
        reason: 'Insufficient budget for orchestration'
      };
    }

    // Query safety validation
    const safetyCheck = await this.validateQuerySafety(request.query, request.context);
    if (!safetyCheck.allowed) {
      return safetyCheck;
    }

    return { allowed: true };
  }

  /**
   * Enhance synthesis using premium models for complex cases
   */
  private async enhanceWithPremiumSynthesis(
    webResult: any,
    request: OrchestrationRequest,
    remainingBudget: number
  ): Promise<any> {
    
    try {
      // Build synthesis request for premium model
      const synthesisPrompt = this.buildSynthesisPrompt(webResult, request);
      
      // Route to optimal premium model
      const routingDecision = await this.premiumRouter.routeToOptimalModel({
        query: synthesisPrompt,
        context: {
          userId: request.context.userId,
          tenantId: request.context.tenantId,
          taskType: 'synthesis_enhancement',
          complexity: 0.8,
          budget: remainingBudget,
          urgency: request.context.urgency || 'medium',
          qualityRequirement: request.context.qualityThreshold || 0.8,
          expectedOutputLength: 2000
        },
        constraints: {
          maxCost: remainingBudget * 0.8, // Leave buffer
          requiredCapabilities: ['reasoning', 'analysis']
        }
      });

      // Execute premium synthesis (placeholder - would call actual model)
      const premiumResult = await this.executePremiumSynthesis(
        routingDecision.selectedModel,
        synthesisPrompt,
        webResult
      );

      // Record premium model performance
      await this.premiumRouter.recordExecutionResult(
        routingDecision.selectedModel.id,
        'synthesis_enhancement',
        {
          success: premiumResult.success,
          actualCost: premiumResult.cost,
          actualLatency: premiumResult.latency,
          qualityScore: premiumResult.qualityScore
        }
      );

      if (premiumResult.success) {
        // Merge premium insights with web result
        return {
          ...webResult,
          answer: premiumResult.enhancedAnswer,
          confidence: Math.min(webResult.confidence + 0.1, 1.0),
          contradictions: premiumResult.resolvedContradictions || webResult.contradictions,
          cost: webResult.cost + premiumResult.cost,
          synthesisMethod: `${webResult.synthesisMethod}+premium_${routingDecision.selectedModel.name}`
        };
      }

    } catch (error) {
      logger.warn('Premium synthesis failed, using web-only result', {
        error: error.message,
        webResultConfidence: webResult.confidence
      });
    }

    return webResult;
  }

  /**
   * Final quality assurance and compliance verification
   */
  private async performQualityAssurance(
    result: any,
    request: OrchestrationRequest,
    _orchestrationId: string
  ): Promise<any> {
    
    const warnings: string[] = [];

    // Confidence threshold check
    if (request.constraints?.confidenceThreshold && 
        result.confidence < request.constraints.confidenceThreshold) {
      warnings.push(`Confidence ${(result.confidence * 100).toFixed(1)}% below threshold ${(request.constraints.confidenceThreshold * 100)}%`);
    }

    // Citation requirement check
    if (request.constraints?.requireCitations && result.citations.length === 0) {
      warnings.push('No citations available despite requirement');
    }

    // Cost validation
    if (request.context.budgetLimit && result.cost > request.context.budgetLimit) {
      warnings.push(`Cost $${result.cost.toFixed(2)} exceeded budget $${request.context.budgetLimit}`);
    }

    // Contradiction handling
    if (result.contradictions.length > 0) {
      warnings.push(`${result.contradictions.length} unresolved contradictions found in sources`);
    }

    // Final compliance audit
    const complianceAudit = await this.performFinalComplianceAudit(result, request);
    if (!complianceAudit.compliant) {
      throw new Error(`Final compliance audit failed: ${complianceAudit.reason}`);
    }

    return {
      ...result,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Build synthesis prompt for premium model enhancement
   */
  private buildSynthesisPrompt(webResult: any, request: OrchestrationRequest): string {
    const contradictions = webResult.contradictions.map((c: any) => 
      `- ${c.claim1.text} (from ${c.claim1.sourceInterface}) vs ${c.claim2.text} (from ${c.claim2.sourceInterface})`
    ).join('\n');

    return `
Please enhance the following synthesis by resolving contradictions and improving coherence:

ORIGINAL QUERY: ${request.query}

CURRENT SYNTHESIS: ${webResult.answer}

CONTRADICTIONS FOUND:
${contradictions}

SOURCES: ${webResult.sourcesUsed} web sources consulted

Please provide an enhanced synthesis that:
1. Resolves or acknowledges the contradictions explicitly
2. Maintains factual accuracy and proper citations
3. Improves overall coherence and confidence
4. Adds any missing context or nuance

Enhanced synthesis:`;
  }

  /**
   * Execute premium synthesis (placeholder for actual model call)
   */
  private async executePremiumSynthesis(
    model: any,
    prompt: string,
    webResult: any
  ): Promise<{
    success: boolean;
    enhancedAnswer: string;
    cost: number;
    latency: number;
    qualityScore: number;
    resolvedContradictions?: any[];
  }> {
    const startTime = Date.now();
    
    // Placeholder implementation - in production would call actual model API
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    
    const latency = Date.now() - startTime;
    const cost = 0.15; // Estimated cost
    
    return {
      success: true,
      enhancedAnswer: `${webResult.answer}\n\n[Premium Enhanced]: This synthesis has been enhanced by ${model.name} to resolve contradictions and improve coherence.`,
      cost,
      latency,
      qualityScore: 0.92,
      resolvedContradictions: webResult.contradictions.slice(0, 2) // Resolve first 2 contradictions
    };
  }

  /**
   * Utility methods
   */
  private async validatePurpose(purpose: string, _userId: string): Promise<{ allowed: boolean; reason?: string }> {
    void _userId;
    const validPurposes = ['intelligence_analysis', 'research', 'documentation', 'development'];
    
    if (!validPurposes.includes(purpose)) {
      return { allowed: false, reason: `Invalid purpose: ${purpose}` };
    }

    // In production, would check user permissions for purpose
    return { allowed: true };
  }

  private async validateQuerySafety(query: string, _context: any): Promise<{ allowed: boolean; reason?: string }> {
    // Basic safety checks - in production would use ML-based content filtering
    const unsafePatterns = [
      /password/i,
      /api[_\s]*key/i,
      /secret/i,
      /token/i,
      /credential/i
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(query)) {
        return { 
          allowed: false, 
          reason: 'Query contains potentially sensitive information' 
        };
      }
    }

    return { allowed: true };
  }

  private async performFinalComplianceAudit(result: any, request: OrchestrationRequest): Promise<{
    compliant: boolean;
    reason?: string;
  }> {
    // Verify all citations have proper license attribution
    for (const citation of result.citations) {
      if (!citation.licenseInfo || citation.licenseInfo === '') {
        return {
          compliant: false,
          reason: `Missing license information for citation: ${citation.url}`
        };
      }
    }

    // Verify no blocked domains were used
    if (request.constraints?.blockedDomains) {
      for (const citation of result.citations) {
        const domain = new URL(citation.url).hostname;
        if (request.constraints.blockedDomains.includes(domain)) {
          return {
            compliant: false,
            reason: `Blocked domain found in citations: ${domain}`
          };
        }
      }
    }

    return { compliant: true };
  }

  private calculateComplianceScore(result: any): number {
    let score = 1.0;
    
    // Deduct for missing citations
    if (result.citations.length === 0) {
      score -= 0.3;
    }
    
    // Deduct for contradictions
    score -= (result.contradictions.length * 0.1);
    
    // Deduct for warnings
    if (result.warnings) {
      score -= (result.warnings.length * 0.05);
    }
    
    return Math.max(0, Math.min(1, score)) * 100;
  }

  private async recordOrchestrationResult(
    result: any,
    request: OrchestrationRequest,
    _orchestrationId: string
  ): Promise<void> {
    // Record in audit log for compliance
    logger.info('Orchestration result recorded', {
      orchestrationId: _orchestrationId,
       
      _userId: request.context.userId,
      tenantId: request.context.tenantId,
      sourcesUsed: result.sourcesUsed,
      cost: result.cost,
      confidence: result.confidence,
      complianceScore: this.calculateComplianceScore(result)
    });

    // Update rate limiter
    await this.rateLimiter.recordSuccessfulFetch('global', request.context.tenantId);
  }
}
