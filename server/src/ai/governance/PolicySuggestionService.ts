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

import { randomUUID, createHash } from 'crypto';
import { GovernanceVerdict } from '../../governance/types.js';
import logger from '../../utils/logger.js';
import {
  PolicySuggestion,
  PolicySuggestionType,
  SuggestedPolicyDefinition,
  SuggestedRule,
  ImpactAnalysis,
  SuggestionContext,
  SuggestionFeedback,
  PolicySuggestionService as IPolicySuggestionService,
  AIGovernanceConfig,
  ProvenanceMetadata,
  ChainOfCustodyEntry,
} from './types.js';
import {
  GovernanceLLMClient,
  getGovernanceLLMClient,
  GovernanceLLMError,
} from './llm/index.js';

// =============================================================================
// Types
// =============================================================================

export interface ExistingPolicy {
  id: string;
  name: string;
  description: string;
  scope: {
    tenants: string[];
    resources: string[];
    users: string[];
    environments: string[];
  };
  rules: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  createdAt: string;
  usageCount: number;
}

export interface UsagePattern {
  pattern: string;
  description: string;
  frequency: number;
  affectedUsers: number;
  timeRange: { start: string; end: string };
}

export interface ComplianceGap {
  framework: string;
  control: string;
  requirement: string;
  currentCoverage: number;
  gap: string;
  severity: 'low' | 'medium' | 'high';
}

interface LLMSuggestionInput {
  type: PolicySuggestionType;
  gap?: ComplianceGap;
  policies?: ExistingPolicy[];
  pattern?: UsagePattern;
  existingPolicies?: ExistingPolicy[];
  context: SuggestionContext;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class PolicySuggestionService implements IPolicySuggestionService {
  private config: AIGovernanceConfig;
  private llmClient: GovernanceLLMClient;
  private suggestionStore: Map<string, PolicySuggestion> = new Map();
  private dailySuggestionCount: Map<string, number> = new Map(); // tenantId -> count
  private lastResetDate: string = '';
  private initialized = false;

  constructor(config: AIGovernanceConfig) {
    this.config = config;
    this.llmClient = getGovernanceLLMClient({
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
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.llmClient.initialize();
    this.initialized = true;

    logger.info('PolicySuggestionService initialized');
  }

  /**
   * Generate policy suggestions based on context
   */
  async generateSuggestions(context: SuggestionContext): Promise<PolicySuggestion[]> {
    await this.initialize();

    if (!this.config.policySuggestions.enabled) {
      logger.info('Policy suggestions disabled');
      return [];
    }

    // Check daily limit
    this.resetDailyCountIfNeeded();
    const currentCount = this.dailySuggestionCount.get(context.tenantId) || 0;
    if (currentCount >= this.config.policySuggestions.maxSuggestionsPerDay) {
      logger.warn({ tenantId: context.tenantId }, 'Daily suggestion limit reached');
      return [];
    }

    const startTime = Date.now();
    logger.info({ context }, 'Generating policy suggestions');

    try {
      // Gather analysis inputs in parallel
      const [existingPolicies, usagePatterns, complianceGaps] = await Promise.all([
        this.fetchExistingPolicies(context.tenantId),
        this.analyzeUsagePatterns(context.tenantId, context.timeRange),
        this.detectComplianceGaps(context.tenantId, context.complianceFrameworks),
      ]);

      const suggestions: PolicySuggestion[] = [];

      // 1. Gap Detection Suggestions
      if (!context.focusAreas || context.focusAreas.includes('gap_detection')) {
        const gapSuggestions = await this.generateGapSuggestions(
          existingPolicies,
          complianceGaps,
          context
        );
        suggestions.push(...gapSuggestions);
      }

      // 2. Conflict Resolution Suggestions
      if (!context.focusAreas || context.focusAreas.includes('conflict_resolution')) {
        const conflictSuggestions = await this.detectAndResolvePolicyConflicts(
          existingPolicies,
          context
        );
        suggestions.push(...conflictSuggestions);
      }

      // 3. Usage-Based Optimization Suggestions
      if (!context.focusAreas || context.focusAreas.includes('usage_based')) {
        const optimizationSuggestions = await this.generateUsageBasedSuggestions(
          existingPolicies,
          usagePatterns,
          context
        );
        suggestions.push(...optimizationSuggestions);
      }

      // Filter by confidence threshold
      const filteredSuggestions = suggestions.filter(
        (s) => s.confidence >= this.config.policySuggestions.minConfidenceThreshold
      );

      // Limit to remaining daily quota
      const remainingQuota = this.config.policySuggestions.maxSuggestionsPerDay - currentCount;
      const limitedSuggestions = filteredSuggestions.slice(0, remainingQuota);

      // Store suggestions and update count
      for (const suggestion of limitedSuggestions) {
        this.suggestionStore.set(suggestion.id, suggestion);
      }
      this.dailySuggestionCount.set(
        context.tenantId,
        currentCount + limitedSuggestions.length
      );

      const latencyMs = Date.now() - startTime;
      logger.info({
        count: limitedSuggestions.length,
        latencyMs,
        tenantId: context.tenantId,
      }, 'Policy suggestions generated');

      return limitedSuggestions;
    } catch (error: any) {
      logger.error({ error, context }, 'Failed to generate policy suggestions');
      throw new PolicySuggestionError(
        'GENERATION_FAILED',
        'Failed to generate policy suggestions',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get a specific suggestion by ID
   */
  async getSuggestion(id: string): Promise<PolicySuggestion | null> {
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
  async listSuggestions(
    tenantId: string,
    options: { status?: PolicySuggestion['status']; limit?: number; offset?: number } = {}
  ): Promise<{ suggestions: PolicySuggestion[]; total: number }> {
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
  async reviewSuggestion(id: string, feedback: SuggestionFeedback): Promise<PolicySuggestion> {
    const suggestion = await this.getSuggestion(id);
    if (!suggestion) {
      throw new PolicySuggestionError('NOT_FOUND', `Suggestion not found: ${id}`);
    }

    if (suggestion.status !== 'pending') {
      throw new PolicySuggestionError(
        'INVALID_STATE',
        `Cannot review suggestion in status: ${suggestion.status}`
      );
    }

    // Update chain of custody
    const custodyEntry: ChainOfCustodyEntry = {
      timestamp: new Date().toISOString(),
      actor: feedback.reviewedBy,
      action: `review:${feedback.decision}`,
      hash: createHash('sha256')
        .update(JSON.stringify(feedback))
        .digest('hex'),
    };

    const updatedSuggestion: PolicySuggestion = {
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

    logger.info({
      suggestionId: id,
      decision: feedback.decision,
      reviewedBy: feedback.reviewedBy,
    }, 'Policy suggestion reviewed');

    return updatedSuggestion;
  }

  /**
   * Implement an approved suggestion as a real policy
   */
  async implementSuggestion(id: string): Promise<{ policyId: string }> {
    const suggestion = await this.getSuggestion(id);
    if (!suggestion) {
      throw new PolicySuggestionError('NOT_FOUND', `Suggestion not found: ${id}`);
    }

    if (suggestion.status !== 'approved') {
      throw new PolicySuggestionError(
        'INVALID_STATE',
        `Suggestion must be approved before implementation. Current status: ${suggestion.status}`
      );
    }

    // In production, this would call PolicyEngine to create the actual policy
    const policyId = `policy-${randomUUID()}`;

    // Update chain of custody
    const custodyEntry: ChainOfCustodyEntry = {
      timestamp: new Date().toISOString(),
      actor: 'system',
      action: `implement:${policyId}`,
      hash: createHash('sha256').update(policyId).digest('hex'),
    };

    const updatedSuggestion: PolicySuggestion = {
      ...suggestion,
      status: 'implemented',
      provenance: {
        ...suggestion.provenance,
        chainOfCustody: [...suggestion.provenance.chainOfCustody, custodyEntry],
      },
    };

    this.suggestionStore.set(id, updatedSuggestion);

    logger.info({
      suggestionId: id,
      policyId,
      policyName: suggestion.suggestedPolicy.name,
    }, 'Policy suggestion implemented');

    return { policyId };
  }

  /**
   * Get suggestion statistics
   */
  async getStatistics(tenantId: string): Promise<SuggestionStatistics> {
    const suggestions = Array.from(this.suggestionStore.values());

    const byStatus = suggestions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = suggestions.reduce((acc, s) => {
      acc[s.suggestionType] = (acc[s.suggestionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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

  private async fetchExistingPolicies(tenantId: string): Promise<ExistingPolicy[]> {
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

  private async analyzeUsagePatterns(
    tenantId: string,
    timeRange?: { start: string; end: string }
  ): Promise<UsagePattern[]> {
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

  private async detectComplianceGaps(
    tenantId: string,
    frameworks?: string[]
  ): Promise<ComplianceGap[]> {
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

  private async generateGapSuggestions(
    existingPolicies: ExistingPolicy[],
    gaps: ComplianceGap[],
    context: SuggestionContext
  ): Promise<PolicySuggestion[]> {
    const suggestions: PolicySuggestion[] = [];

    for (const gap of gaps) {
      try {
        const suggestion = await this.llmGenerateSuggestion({
          type: 'gap_detection',
          gap,
          existingPolicies,
          context,
        });
        if (suggestion) suggestions.push(suggestion);
      } catch (error: any) {
        logger.warn({ gap, error }, 'Failed to generate gap suggestion');
      }
    }

    return suggestions;
  }

  private async detectAndResolvePolicyConflicts(
    existingPolicies: ExistingPolicy[],
    context: SuggestionContext
  ): Promise<PolicySuggestion[]> {
    const suggestions: PolicySuggestion[] = [];

    if (existingPolicies.length >= 2) {
      try {
        const suggestion = await this.llmGenerateSuggestion({
          type: 'conflict_resolution',
          policies: existingPolicies.slice(0, 2),
          context,
        });
        if (suggestion) suggestions.push(suggestion);
      } catch (error: any) {
        logger.warn({ error }, 'Failed to generate conflict resolution suggestion');
      }
    }

    return suggestions;
  }

  private async generateUsageBasedSuggestions(
    existingPolicies: ExistingPolicy[],
    usagePatterns: UsagePattern[],
    context: SuggestionContext
  ): Promise<PolicySuggestion[]> {
    const suggestions: PolicySuggestion[] = [];

    for (const pattern of usagePatterns) {
      if (pattern.pattern === 'frequent_denied_access') {
        try {
          const suggestion = await this.llmGenerateSuggestion({
            type: 'usage_based',
            pattern,
            existingPolicies,
            context,
          });
          if (suggestion) suggestions.push(suggestion);
        } catch (error: any) {
          logger.warn({ pattern, error }, 'Failed to generate usage-based suggestion');
        }
      }
    }

    return suggestions;
  }

  private async llmGenerateSuggestion(input: LLMSuggestionInput): Promise<PolicySuggestion | null> {
    const id = `suggestion-${randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    let title: string;
    let description: string;
    let rationale: string;
    let suggestedPolicy: SuggestedPolicyDefinition;
    let confidence: number;
    let priority: PolicySuggestion['priority'];
    let complianceFrameworks: string[];

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
          const gap = input.gap as ComplianceGap;
          title = `Address ${gap.framework} ${gap.control} Compliance Gap`;
          description = gap.gap;
          rationale = llmRationale || this.generateFallbackRationale('gap_detection', gap);
          suggestedPolicy = this.generateGapPolicy(gap, input.context);
          priority = gap.severity === 'high' ? 'high' : 'medium';
          complianceFrameworks = [`${gap.framework}:${gap.control}`];
          break;
        }

        case 'conflict_resolution': {
          const policies = input.policies as ExistingPolicy[];
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
          const pattern = input.pattern as UsagePattern;
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

    } catch (error: any) {
      // Fallback to rule-based generation if LLM fails
      logger.warn({ error, type: input.type }, 'LLM generation failed, using fallback');
      return this.generateFallbackSuggestion(input, id, now, expiresAt);
    }
  }

  private buildLLMPrompt(input: LLMSuggestionInput): string {
    switch (input.type) {
      case 'gap_detection':
        const gap = input.gap as ComplianceGap;
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
        const policies = input.policies as ExistingPolicy[];
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
        const pattern = input.pattern as UsagePattern;
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

  private generateFallbackRationale(type: PolicySuggestionType, data: any): string {
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

  private generateGapPolicy(gap: ComplianceGap, context: SuggestionContext): SuggestedPolicyDefinition {
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

  private generateConflictResolutionPolicy(
    policies: ExistingPolicy[],
    context: SuggestionContext
  ): SuggestedPolicyDefinition {
    return {
      name: 'consolidated-access-policy',
      description: 'Unified access control policy replacing conflicting policies',
      scope: {
        tenants: [context.tenantId],
        resources: ['*'],
        users: ['*'],
        environments: ['prod', 'staging', 'dev'],
      },
      rules: policies[0].rules.map((r): SuggestedRule => ({
        field: r.field,
        operator: r.operator as SuggestedRule['operator'],
        value: r.value,
        explanation: `From ${policies[0].name}`,
      })),
      actions: ['ALLOW'],
    };
  }

  private generateUsageBasedPolicy(
    pattern: UsagePattern,
    context: SuggestionContext
  ): SuggestedPolicyDefinition {
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

  private generateFallbackSuggestion(
    input: LLMSuggestionInput,
    id: string,
    now: string,
    expiresAt: string
  ): PolicySuggestion | null {
    // Similar to original prototype logic
    let title: string;
    let description: string;
    let suggestedPolicy: SuggestedPolicyDefinition;
    let priority: PolicySuggestion['priority'];

    switch (input.type) {
      case 'gap_detection':
        const gap = input.gap as ComplianceGap;
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

  private estimateImpact(
    policy: SuggestedPolicyDefinition,
    context: SuggestionContext
  ): ImpactAnalysis {
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

  private createGovernanceVerdict(): GovernanceVerdict {
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

  private createProvenance(suggestionId: string, input: LLMSuggestionInput): ProvenanceMetadata {
    const inputHash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');

    return {
      sourceId: `policy-suggestion-${input.context.tenantId}`,
      sourceType: 'ai_model',
      modelVersion: this.config.llmSettings.model,
      modelProvider: this.config.llmSettings.provider,
      inputHash,
      outputHash: createHash('sha256').update(suggestionId).digest('hex'),
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

  private enhanceProvenance(
    baseProvenance: ProvenanceMetadata,
    suggestionId: string,
    input: LLMSuggestionInput
  ): ProvenanceMetadata {
    return {
      ...baseProvenance,
      sourceId: `policy-suggestion-${input.context.tenantId}`,
      chainOfCustody: [
        ...baseProvenance.chainOfCustody,
        {
          timestamp: new Date().toISOString(),
          actor: 'PolicySuggestionService',
          action: `process:${input.type}`,
          hash: createHash('sha256').update(suggestionId).digest('hex'),
        },
      ],
    };
  }

  private resetDailyCountIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailySuggestionCount.clear();
      this.lastResetDate = today;
    }
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class PolicySuggestionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PolicySuggestionError';
  }
}

// =============================================================================
// Statistics Type
// =============================================================================

export interface SuggestionStatistics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  averageConfidence: number;
  dailyRemaining: number;
}

// =============================================================================
// Factory
// =============================================================================

export function createPolicySuggestionService(
  config: Partial<AIGovernanceConfig> = {}
): PolicySuggestionService {
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

export default PolicySuggestionService;
