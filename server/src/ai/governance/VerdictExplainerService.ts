/**
 * AI-Powered Verdict Explanation Service
 *
 * Transforms technical governance verdicts into human-readable explanations
 * with actionable remediation steps, tailored to different audiences.
 *
 * Production-ready implementation with:
 * - LLM integration for natural language explanations
 * - Explanation caching with TTL
 * - Statistics tracking
 * - Enhanced provenance with chain of custody
 * - Multi-locale support
 *
 * @module ai/governance/VerdictExplainerService
 * @version 4.0.0
 */

import { randomUUID, createHash } from 'crypto';
import { GovernanceVerdict, PolicyAction } from '../../governance/types.js';
import logger from '../../utils/logger.js';
import {
  ExplainedVerdict,
  TechnicalDetail,
  RemediationStep,
  PolicyReference,
  RelatedExample,
  ExplanationContext,
  ExplanationTone,
  ExplanationAudience,
  VerdictExplainerService as IVerdictExplainerService,
  AIGovernanceConfig,
  ProvenanceMetadata,
  ChainOfCustodyEntry,
} from './types.js';
import { GovernanceLLMClient, getGovernanceLLMClient } from './llm/index.js';

// =============================================================================
// Explanation Templates
// =============================================================================

const EXPLANATION_TEMPLATES: Record<PolicyAction, Record<ExplanationAudience, string>> = {
  ALLOW: {
    end_user: 'Your request was approved and has been processed successfully.',
    developer: 'Request permitted. All policy checks passed.',
    compliance_officer: 'Request approved. Governance policies satisfied. Audit trail recorded.',
    executive: 'Action approved within policy guidelines.',
  },
  DENY: {
    end_user: 'Your request could not be completed because it doesn\'t meet our security requirements.',
    developer: 'Request denied due to policy violation. Review the technical details below.',
    compliance_officer: 'Request blocked. Policy violation detected. Review required controls.',
    executive: 'Action blocked to maintain compliance and security posture.',
  },
  ESCALATE: {
    end_user: 'Your request needs additional approval before it can be processed.',
    developer: 'Request escalated for manual review. Automatic approval not possible.',
    compliance_officer: 'Request escalated per policy. Manual review required before proceeding.',
    executive: 'Action requires elevated approval due to risk classification.',
  },
  WARN: {
    end_user: 'Your request was processed, but please note some concerns were flagged.',
    developer: 'Request permitted with warnings. Review flagged items.',
    compliance_officer: 'Request approved with warnings. Monitoring recommended.',
    executive: 'Action permitted with advisory flags. Review recommended.',
  },
};

// =============================================================================
// Types
// =============================================================================

interface CachedExplanation {
  explanation: ExplainedVerdict;
  expiresAt: number;
}

interface ExplanationStatistics {
  totalExplanations: number;
  byAction: Record<PolicyAction, number>;
  byAudience: Record<ExplanationAudience, number>;
  cacheHits: number;
  cacheMisses: number;
  llmUsed: number;
  templateFallbacks: number;
  averageLatencyMs: number;
  lastReset: string;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class VerdictExplainerService implements IVerdictExplainerService {
  private config: AIGovernanceConfig;
  private llmClient: GovernanceLLMClient;
  private explanationCache: Map<string, CachedExplanation> = new Map();
  private explanationStore: Map<string, ExplainedVerdict> = new Map();
  private statistics: ExplanationStatistics;

  constructor(config: AIGovernanceConfig) {
    this.config = config;
    this.llmClient = getGovernanceLLMClient({
      enabled: config.llmSettings?.provider !== 'mock',
      provider: config.llmSettings?.provider || 'mock',
      model: config.llmSettings?.model || 'gpt-4',
      maxTokens: config.llmSettings?.maxTokens || 2048,
      temperature: config.llmSettings?.temperature || 0.3,
      timeout: config.llmSettings?.timeout || 30000,
    });
    this.statistics = this.initializeStatistics();
  }

  private initializeStatistics(): ExplanationStatistics {
    return {
      totalExplanations: 0,
      byAction: { ALLOW: 0, DENY: 0, ESCALATE: 0, WARN: 0 },
      byAudience: { end_user: 0, developer: 0, compliance_officer: 0, executive: 0 },
      cacheHits: 0,
      cacheMisses: 0,
      llmUsed: 0,
      templateFallbacks: 0,
      averageLatencyMs: 0,
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Generate a human-readable explanation for a governance verdict
   */
  async explainVerdict(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): Promise<ExplainedVerdict> {
    if (!this.config.verdictExplanations.enabled) {
      throw new Error('Verdict explanations are disabled');
    }

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(verdict, context);

    // Check cache
    if (this.config.verdictExplanations.cacheExplanations) {
      const cached = this.explanationCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        this.statistics.cacheHits++;
        logger.debug('Returning cached verdict explanation', { cacheKey });
        return cached.explanation;
      }
      // Remove expired entry
      if (cached) {
        this.explanationCache.delete(cacheKey);
      }
      this.statistics.cacheMisses++;
    }

    try {
      // Generate explanation using LLM (or template fallback)
      const explanation = await this.generateExplanation(verdict, context);

      // Update statistics
      this.statistics.totalExplanations++;
      this.statistics.byAction[verdict.action]++;
      this.statistics.byAudience[context.audience]++;

      const latencyMs = Date.now() - startTime;
      this.updateAverageLatency(latencyMs);

      // Cache result
      if (this.config.verdictExplanations.cacheExplanations) {
        this.explanationCache.set(cacheKey, {
          explanation,
          expiresAt: Date.now() + this.config.verdictExplanations.cacheTTLSeconds * 1000,
        });
      }

      // Store for retrieval
      this.explanationStore.set(explanation.provenance?.id || cacheKey, explanation);

      logger.info('Verdict explanation generated', {
        action: verdict.action,
        audience: context.audience,
        latencyMs,
        usedLLM: explanation.provenance?.method === 'llm_generation',
      });

      return explanation;
    } catch (error: any) {
      logger.error('Failed to generate verdict explanation', { error, verdict });
      throw error;
    }
  }

  private updateAverageLatency(latencyMs: number): void {
    const total = this.statistics.totalExplanations;
    const currentAvg = this.statistics.averageLatencyMs;
    this.statistics.averageLatencyMs = (currentAvg * (total - 1) + latencyMs) / total;
  }

  /**
   * Generate explanations for multiple verdicts
   */
  async batchExplain(
    verdicts: GovernanceVerdict[],
    context: ExplanationContext
  ): Promise<ExplainedVerdict[]> {
    // Process in batches of 5 to avoid overwhelming the LLM
    const batchSize = 5;
    const results: ExplainedVerdict[] = [];

    for (let i = 0; i < verdicts.length; i += batchSize) {
      const batch = verdicts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((v) => this.explainVerdict(v, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get an explanation by ID
   */
  async getExplanation(id: string): Promise<ExplainedVerdict | null> {
    return this.explanationStore.get(id) || null;
  }

  /**
   * List all stored explanations with pagination
   */
  async listExplanations(options: {
    page?: number;
    pageSize?: number;
    action?: PolicyAction;
    audience?: ExplanationAudience;
  } = {}): Promise<{ explanations: ExplainedVerdict[]; total: number }> {
    const { page = 1, pageSize = 20, action, audience } = options;

    let explanations = Array.from(this.explanationStore.values());

    // Apply filters
    if (action) {
      explanations = explanations.filter((e) => e.originalVerdict.action === action);
    }
    if (audience) {
      explanations = explanations.filter((e) => e.audience === audience);
    }

    // Sort by generation time (newest first)
    explanations.sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );

    const total = explanations.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedExplanations = explanations.slice(startIndex, startIndex + pageSize);

    return { explanations: paginatedExplanations, total };
  }

  /**
   * Get statistics about explanation generation
   */
  getStatistics(): ExplanationStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.initializeStatistics();
    logger.info('Verdict explanation statistics reset');
  }

  /**
   * Clear the explanation cache
   */
  clearCache(): void {
    this.explanationCache.clear();
    logger.info('Verdict explanation cache cleared');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateCacheKey(verdict: GovernanceVerdict, context: ExplanationContext): string {
    const verdictHash = JSON.stringify({
      action: verdict.action,
      policyIds: verdict.policyIds.sort(),
      reasons: verdict.reasons.sort(),
    });
    return `${verdictHash}-${context.audience}-${context.tone}-${context.locale || 'en'}`;
  }

  private async generateExplanation(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): Promise<ExplainedVerdict> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // Generate summary based on template and context
    const summary = this.generateSummary(verdict, context);

    // Generate detailed explanation (with LLM or template fallback)
    const { text: detailedExplanation, usedLLM } = await this.generateDetailedExplanation(verdict, context);

    // Extract technical details
    const technicalDetails = this.extractTechnicalDetails(verdict);

    // Generate remediation steps
    const remediationSteps = this.generateRemediationSteps(verdict, context);

    // Get policy references
    const policyReferences = await this.getPolicyReferences(verdict.policyIds);

    // Generate related examples if requested
    const relatedExamples = context.includeExamples
      ? this.generateRelatedExamples(verdict)
      : [];

    // Calculate confidence based on explanation quality
    const confidence = this.calculateExplanationConfidence(verdict, detailedExplanation);

    // Build explanation with proper provenance
    let finalDetailedExplanation = detailedExplanation;

    // Truncate if maxLength specified
    if (context.maxLength && finalDetailedExplanation.length > context.maxLength) {
      finalDetailedExplanation = finalDetailedExplanation.substring(0, context.maxLength - 3) + '...';
    }

    const explanation: ExplainedVerdict = {
      originalVerdict: verdict,
      summary,
      detailedExplanation: finalDetailedExplanation,
      technicalDetails,
      remediationSteps,
      policyReferences,
      relatedExamples,
      confidence,
      tone: context.tone,
      audience: context.audience,
      generatedAt: now,
      governanceVerdict: this.createMetaGovernanceVerdict(),
      provenance: this.createProvenance(id, verdict, usedLLM),
    };

    return explanation;
  }

  private generateSummary(verdict: GovernanceVerdict, context: ExplanationContext): string {
    const baseTemplate = EXPLANATION_TEMPLATES[verdict.action][context.audience];

    // Enhance with specific reason if available
    if (verdict.reasons.length > 0 && verdict.action !== 'ALLOW') {
      const primaryReason = this.humanizeReason(verdict.reasons[0], context.tone);
      return `${baseTemplate} ${primaryReason}`;
    }

    return baseTemplate;
  }

  private async generateDetailedExplanation(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): Promise<{ text: string; usedLLM: boolean }> {
    // Try LLM-based generation first (if not mock provider)
    if (this.config.llmSettings?.provider !== 'mock') {
      try {
        const llmResponse = await this.llmClient.executeWithRetry({
          taskType: 'verdict_explanation',
          prompt: this.buildLLMPrompt(verdict, context),
          context: {
            userRole: context.audience,
            sensitivityLevel: this.getSensitivityLevel(verdict),
          },
          tenantId: context.tenantId || 'system',
          userId: context.userId,
          temperature: 0.4, // Slightly creative for explanations
        });

        this.statistics.llmUsed++;
        return { text: llmResponse.text, usedLLM: true };
      } catch (error: any) {
        logger.warn({ error }, 'LLM explanation failed, falling back to template');
        // Fall through to template-based generation
      }
    }

    // Template-based generation (fallback)
    this.statistics.templateFallbacks++;
    const text = this.generateTemplateExplanation(verdict, context);
    return { text, usedLLM: false };
  }

  private buildLLMPrompt(verdict: GovernanceVerdict, context: ExplanationContext): string {
    const audienceDescriptions: Record<ExplanationAudience, string> = {
      end_user: 'a non-technical end user who needs a simple, clear explanation',
      developer: 'a software developer who understands technical concepts',
      compliance_officer: 'a compliance officer who needs policy and regulatory context',
      executive: 'a business executive who needs a high-level summary with business impact',
    };

    return `
Generate a ${context.tone} explanation for the following governance verdict.

Target Audience: ${audienceDescriptions[context.audience]}

Verdict Details:
- Action: ${verdict.action}
- Reasons: ${verdict.reasons.join('; ')}
- Policies Applied: ${verdict.policyIds.join(', ')}
- Confidence: ${(verdict.provenance?.confidence || 0.9) * 100}%

Requirements:
1. Start with a clear summary of what happened
2. Explain WHY this decision was made in terms the audience will understand
3. If the action is DENY or ESCALATE, provide clear next steps
4. Keep the explanation concise but complete
5. Use ${context.tone === 'formal' ? 'professional, formal language' : 'friendly, approachable language'}
${context.locale && context.locale !== 'en' ? `6. Write the explanation in ${context.locale}` : ''}

Generate the explanation now:
`.trim();
  }

  private getSensitivityLevel(verdict: GovernanceVerdict): 'low' | 'medium' | 'high' {
    if (verdict.action === 'DENY' || verdict.action === 'ESCALATE') {
      return 'high';
    }
    if (verdict.action === 'WARN') {
      return 'medium';
    }
    return 'low';
  }

  private generateTemplateExplanation(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): string {
    const sections: string[] = [];

    // Opening
    sections.push(this.getOpeningParagraph(verdict, context));

    // Reason breakdown
    if (verdict.reasons.length > 0) {
      sections.push('\n\n**What triggered this decision:**\n');
      verdict.reasons.forEach((reason, index) => {
        sections.push(`${index + 1}. ${this.humanizeReason(reason, context.tone)}`);
      });
    }

    // Policy context
    if (verdict.policyIds.length > 0) {
      sections.push('\n\n**Applicable policies:**\n');
      sections.push(
        `This decision was made based on ${verdict.policyIds.length} governance ${
          verdict.policyIds.length === 1 ? 'policy' : 'policies'
        }: ${verdict.policyIds.join(', ')}.`
      );
    }

    // Confidence note for AI-assisted decisions
    if (verdict.provenance?.confidence && verdict.provenance.confidence < 0.9) {
      sections.push('\n\n**Note:** This decision was made with ');
      sections.push(
        `${(verdict.provenance.confidence * 100).toFixed(0)}% confidence. `
      );
      sections.push('You may request a manual review if you believe this is incorrect.');
    }

    return sections.join('');
  }

  private getOpeningParagraph(verdict: GovernanceVerdict, context: ExplanationContext): string {
    const formal = context.tone === 'formal';

    switch (verdict.action) {
      case 'DENY':
        return formal
          ? 'The requested operation has been denied by the governance system. This decision was made to protect organizational data and maintain compliance with applicable regulations.'
          : 'We couldn\'t complete your request this time. Here\'s why, and what you can do about it:';

      case 'ESCALATE':
        return formal
          ? 'The requested operation requires additional authorization before it can proceed. This escalation is mandated by governance policies for operations of this nature.'
          : 'Your request needs a quick review from someone with additional permissions. This is a normal part of our security process.';

      case 'WARN':
        return formal
          ? 'The requested operation has been permitted with advisory warnings. Please review the following items and take appropriate action.'
          : 'Good news - your request went through! However, we noticed a few things you might want to look at:';

      case 'ALLOW':
      default:
        return formal
          ? 'The requested operation has been approved in accordance with governance policies.'
          : 'All good! Your request was approved and processed.';
    }
  }

  private humanizeReason(reason: string, tone: ExplanationTone): string {
    // Map common technical reasons to human-readable text
    const humanizations: Record<string, Record<ExplanationTone, string>> = {
      'classification_mismatch': {
        formal: 'The data classification level does not meet the required threshold for this operation.',
        friendly: 'The data you\'re trying to access has a higher security level than your current permissions allow.',
        technical: 'Data classification mismatch: requested classification exceeds authorized level.',
      },
      'region_restriction': {
        formal: 'The destination region is not authorized for data transfers under current policies.',
        friendly: 'We can\'t send data to that region due to data residency rules.',
        technical: 'Region restriction violation: destination region not in allowed list.',
      },
      'rate_limit_exceeded': {
        formal: 'The request volume has exceeded the permitted threshold.',
        friendly: 'You\'ve made too many requests in a short time. Please wait a moment and try again.',
        technical: 'Rate limit exceeded: request count > threshold within time window.',
      },
      'missing_consent': {
        formal: 'Required data subject consent has not been recorded for this operation.',
        friendly: 'We need consent from the data subject before we can proceed with this.',
        technical: 'Consent check failed: no valid consent record found.',
      },
      'audit_required': {
        formal: 'This operation requires documented audit justification before proceeding.',
        friendly: 'We need you to provide a reason for this access that we can log for compliance.',
        technical: 'Audit requirement not satisfied: justification field empty or invalid.',
      },
    };

    // Check if we have a humanization for this reason
    const normalized = reason.toLowerCase().replace(/[^a-z_]/g, '_');
    for (const [key, humanized] of Object.entries(humanizations)) {
      if (normalized.includes(key)) {
        return humanized[tone];
      }
    }

    // Fallback: clean up the technical reason
    return reason
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  }

  private extractTechnicalDetails(verdict: GovernanceVerdict): TechnicalDetail[] {
    const details: TechnicalDetail[] = [];

    // Extract details from metadata
    if (verdict.metadata) {
      details.push({
        category: 'Evaluation',
        field: 'evaluator',
        expected: 'governance-engine',
        actual: verdict.metadata.evaluator,
        explanation: 'The system component that evaluated this request',
      });

      details.push({
        category: 'Evaluation',
        field: 'latency',
        expected: '< 100ms',
        actual: `${verdict.metadata.latencyMs}ms`,
        explanation: 'Time taken to evaluate governance policies',
      });

      if (verdict.metadata.simulation) {
        details.push({
          category: 'Context',
          field: 'mode',
          expected: 'production',
          actual: 'simulation',
          explanation: 'This was a simulation/dry-run evaluation',
        });
      }
    }

    // Extract details from provenance
    if (verdict.provenance) {
      details.push({
        category: 'Provenance',
        field: 'confidence',
        expected: '> 0.9',
        actual: verdict.provenance.confidence?.toString() || 'N/A',
        explanation: 'Confidence level in the evaluation accuracy',
      });
    }

    return details;
  }

  private generateRemediationSteps(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): RemediationStep[] {
    if (verdict.action === 'ALLOW') {
      return [];
    }

    const steps: RemediationStep[] = [];

    // Generate remediation based on action type
    switch (verdict.action) {
      case 'DENY':
        steps.push({
          order: 1,
          action: 'Review requirements',
          description: 'Check the policy requirements that were not met',
          automated: false,
          estimatedEffort: 'trivial',
        });
        steps.push({
          order: 2,
          action: 'Modify request',
          description: 'Adjust your request to comply with the identified requirements',
          automated: false,
          estimatedEffort: 'low',
        });
        steps.push({
          order: 3,
          action: 'Request exception',
          description: 'If you believe this denial is incorrect, submit an exception request',
          automated: true,
          automationAction: 'create_exception_request',
          estimatedEffort: 'medium',
        });
        break;

      case 'ESCALATE':
        steps.push({
          order: 1,
          action: 'Wait for approval',
          description: 'Your request has been sent to the appropriate approver',
          automated: true,
          automationAction: 'track_approval_status',
          estimatedEffort: 'trivial',
        });
        steps.push({
          order: 2,
          action: 'Provide justification',
          description: 'Add additional context to help approvers make a decision',
          automated: false,
          estimatedEffort: 'low',
        });
        break;

      case 'WARN':
        steps.push({
          order: 1,
          action: 'Review warnings',
          description: 'Understand the flagged items and their implications',
          automated: false,
          estimatedEffort: 'trivial',
        });
        steps.push({
          order: 2,
          action: 'Acknowledge',
          description: 'Confirm you have reviewed and understand the warnings',
          automated: true,
          automationAction: 'acknowledge_warning',
          estimatedEffort: 'trivial',
        });
        break;
    }

    return steps;
  }

  private async getPolicyReferences(policyIds: string[]): Promise<PolicyReference[]> {
    // In production, this would fetch actual policy details
    return policyIds.map((id) => ({
      policyId: id,
      policyName: `Policy ${id}`,
      excerpt: 'This policy governs access to sensitive resources...',
      documentationUrl: `/docs/policies/${id}`,
    }));
  }

  private generateRelatedExamples(verdict: GovernanceVerdict): RelatedExample[] {
    // Generate contextually relevant examples
    const examples: RelatedExample[] = [];

    if (verdict.action === 'DENY') {
      examples.push({
        scenario: 'Requesting the same data with proper authorization',
        outcome: 'allowed',
        explanation: 'Ensure you have the required role or permission before making the request.',
      });
      examples.push({
        scenario: 'Accessing similar data in a permitted region',
        outcome: 'allowed',
        explanation: 'Data access from approved regions typically succeeds.',
      });
    }

    return examples;
  }

  private calculateExplanationConfidence(
    verdict: GovernanceVerdict,
    explanation: string
  ): number {
    // Base confidence from verdict
    let confidence = verdict.provenance?.confidence || 0.8;

    // Adjust based on explanation quality
    if (explanation.length > 200) confidence += 0.05;
    if (verdict.reasons.length > 0) confidence += 0.05;
    if (verdict.policyIds.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private createMetaGovernanceVerdict(): GovernanceVerdict {
    return {
      action: 'ALLOW',
      reasons: ['Explanation generation approved'],
      policyIds: ['ai-explanation-policy'],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'VerdictExplainerService',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'ai-governance-system',
        confidence: 0.95,
      },
    };
  }

  private createProvenance(id: string, verdict: GovernanceVerdict, usedLLM: boolean): ProvenanceMetadata {
    const inputHash = createHash('sha256').update(JSON.stringify(verdict)).digest('hex');
    const method = usedLLM ? 'llm_generation' : 'template_generation';

    const custodyEntry: ChainOfCustodyEntry = {
      timestamp: new Date().toISOString(),
      actor: usedLLM ? `llm:${this.config.llmSettings?.provider || 'mock'}` : 'template-engine',
      action: 'generate_explanation',
      hash: inputHash,
    };

    return {
      id: `prov-explanation-${id}`,
      sourceId: 'verdict-explainer-service',
      sourceType: usedLLM ? 'ai_model' : 'template_engine',
      modelVersion: this.config.llmSettings?.model || 'template-v1',
      modelProvider: usedLLM ? (this.config.llmSettings?.provider || 'mock') : 'internal',
      inputHash,
      outputHash: createHash('sha256').update(id).digest('hex'),
      timestamp: new Date().toISOString(),
      confidence: usedLLM ? 0.85 : 0.75,
      method,
      chainOfCustody: [custodyEntry],
    } as unknown as ProvenanceMetadata;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createVerdictExplainerService(
  config: Partial<AIGovernanceConfig> = {}
): VerdictExplainerService {
  const defaultConfig: AIGovernanceConfig = {
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

  return new VerdictExplainerService({ ...defaultConfig, ...config });
}

export default VerdictExplainerService;
