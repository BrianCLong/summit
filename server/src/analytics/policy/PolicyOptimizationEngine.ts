/**
 * Policy Optimization Engine
 *
 * ML-based policy analysis and optimization suggestions.
 * Identifies policy conflicts, redundancies, and improvement opportunities.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC5.3 (Policy Review)
 *
 * @module analytics/policy/PolicyOptimizationEngine
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.ts';
import logger from '../../utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

export type OptimizationType =
  | 'conflict_resolution'
  | 'redundancy_elimination'
  | 'coverage_improvement'
  | 'performance_optimization'
  | 'simplification'
  | 'security_hardening';

export type OptimizationPriority = 'critical' | 'high' | 'medium' | 'low';
export type OptimizationStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'flag' | 'review';
  priority: number;
  resource: string;
  subjects: string[];
  createdAt: Date;
  usageCount: number;
  lastMatchedAt: Date | null;
}

export interface Policy {
  id: string;
  name: string;
  version: string;
  tenantId: string;
  rules: PolicyRule[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationSuggestion {
  id: string;
  tenantId: string;
  type: OptimizationType;
  priority: OptimizationPriority;
  status: OptimizationStatus;
  title: string;
  description: string;
  affectedPolicies: string[];
  affectedRules: string[];
  currentState: string;
  suggestedState: string;
  estimatedImpact: ImpactEstimate;
  confidence: number;
  reasoning: string[];
  createdAt: string;
  governanceVerdict: GovernanceVerdict;
}

export interface ImpactEstimate {
  evaluationSpeedChange: number; // percentage change
  coverageChange: number; // percentage change
  securityScoreChange: number; // -100 to +100
  conflictsResolved: number;
  redundanciesRemoved: number;
  rulesAffected: number;
}

export interface PolicyConflict {
  id: string;
  type: 'direct' | 'indirect' | 'conditional';
  rule1: PolicyRule;
  rule2: PolicyRule;
  conflictDescription: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolution: string;
}

export interface PolicyCoverageGap {
  id: string;
  resource: string;
  action: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  suggestedRule: Partial<PolicyRule>;
}

export interface OptimizationEngineConfig {
  /** Minimum confidence for suggestions */
  minConfidence: number;
  /** Enable conflict detection */
  detectConflicts: boolean;
  /** Enable redundancy detection */
  detectRedundancy: boolean;
  /** Enable coverage analysis */
  analyzeCoverage: boolean;
  /** Enable performance suggestions */
  optimizePerformance: boolean;
  /** Days of usage data to consider */
  usageWindowDays: number;
}

export interface OptimizationStats {
  totalPoliciesAnalyzed: number;
  totalRulesAnalyzed: number;
  suggestionsGenerated: number;
  suggestionsApplied: number;
  conflictsDetected: number;
  redundanciesFound: number;
  averageConfidence: number;
  lastAnalysisAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'policy-optimization-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PolicyOptimizationEngine',
  };
}

function calculatePriority(
  type: OptimizationType,
  impact: ImpactEstimate,
  confidence: number
): OptimizationPriority {
  // Critical: Security issues or major conflicts
  if (type === 'conflict_resolution' && impact.conflictsResolved > 0) {
    return 'critical';
  }
  if (type === 'security_hardening' && impact.securityScoreChange < -20) {
    return 'critical';
  }

  // High: Significant improvements with high confidence
  if (confidence >= 0.85 && (
    impact.evaluationSpeedChange > 30 ||
    Math.abs(impact.securityScoreChange) > 15
  )) {
    return 'high';
  }

  // Medium: Moderate improvements
  if (confidence >= 0.7 && (
    impact.redundanciesRemoved > 2 ||
    impact.evaluationSpeedChange > 15
  )) {
    return 'medium';
  }

  return 'low';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: OptimizationEngineConfig = {
  minConfidence: 0.6,
  detectConflicts: true,
  detectRedundancy: true,
  analyzeCoverage: true,
  optimizePerformance: true,
  usageWindowDays: 30,
};

// ============================================================================
// Conflict Detector
// ============================================================================

class ConflictDetector {
  /**
   * Detect conflicts between policy rules
   */
  detectConflicts(rules: PolicyRule[]): PolicyConflict[] {
    const conflicts: PolicyConflict[] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const conflict = this.checkConflict(rules[i], rules[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private checkConflict(rule1: PolicyRule, rule2: PolicyRule): PolicyConflict | null {
    // Check if rules apply to same resource
    if (!this.resourcesOverlap(rule1.resource, rule2.resource)) {
      return null;
    }

    // Check if subjects overlap
    if (!this.subjectsOverlap(rule1.subjects, rule2.subjects)) {
      return null;
    }

    // Check if actions conflict
    if (!this.actionsConflict(rule1.action, rule2.action)) {
      return null;
    }

    // Determine conflict type and severity
    const type = this.determineConflictType(rule1, rule2);
    const severity = this.determineSeverity(rule1, rule2);

    return {
      id: `conflict-${uuidv4()}`,
      type,
      rule1,
      rule2,
      conflictDescription: this.describeConflict(rule1, rule2),
      severity,
      resolution: this.suggestResolution(rule1, rule2),
    };
  }

  private resourcesOverlap(res1: string, res2: string): boolean {
    // Simple pattern matching (in production, use proper glob matching)
    if (res1 === res2) return true;
    if (res1.includes('*') && res2.startsWith(res1.replace('*', ''))) return true;
    if (res2.includes('*') && res1.startsWith(res2.replace('*', ''))) return true;
    return false;
  }

  private subjectsOverlap(subjects1: string[], subjects2: string[]): boolean {
    if (subjects1.includes('*') || subjects2.includes('*')) return true;
    return subjects1.some(s => subjects2.includes(s));
  }

  private actionsConflict(action1: string, action2: string): boolean {
    const conflictPairs = [
      ['allow', 'deny'],
      ['allow', 'review'],
    ];
    return conflictPairs.some(pair =>
      (pair[0] === action1 && pair[1] === action2) ||
      (pair[1] === action1 && pair[0] === action2)
    );
  }

  private determineConflictType(
    rule1: PolicyRule,
    rule2: PolicyRule
  ): 'direct' | 'indirect' | 'conditional' {
    if (rule1.resource === rule2.resource) return 'direct';
    if (rule1.condition || rule2.condition) return 'conditional';
    return 'indirect';
  }

  private determineSeverity(
    rule1: PolicyRule,
    rule2: PolicyRule
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Deny/allow conflicts are critical
    if (
      (rule1.action === 'deny' && rule2.action === 'allow') ||
      (rule1.action === 'allow' && rule2.action === 'deny')
    ) {
      return 'critical';
    }

    // High priority rules in conflict are high severity
    if (rule1.priority <= 10 || rule2.priority <= 10) {
      return 'high';
    }

    return 'medium';
  }

  private describeConflict(rule1: PolicyRule, rule2: PolicyRule): string {
    return `Rule "${rule1.name}" (${rule1.action}) conflicts with "${rule2.name}" (${rule2.action}) on resource "${rule1.resource}"`;
  }

  private suggestResolution(rule1: PolicyRule, rule2: PolicyRule): string {
    if (rule1.usageCount > rule2.usageCount * 2) {
      return `Consider removing or modifying "${rule2.name}" as "${rule1.name}" is more frequently used`;
    }
    if (rule1.priority < rule2.priority) {
      return `"${rule1.name}" has higher priority and will take precedence - consider if "${rule2.name}" is still needed`;
    }
    return `Review both rules and consolidate into a single clear policy`;
  }
}

// ============================================================================
// Redundancy Analyzer
// ============================================================================

class RedundancyAnalyzer {
  /**
   * Find redundant rules that can be consolidated
   */
  findRedundancies(rules: PolicyRule[]): Array<{ rules: PolicyRule[]; suggestion: string }> {
    const redundancies: Array<{ rules: PolicyRule[]; suggestion: string }> = [];

    // Group by action and similar resources
    const groups = this.groupSimilarRules(rules);

    for (const [, group] of groups) {
      if (group.length > 1) {
        const suggestion = this.suggestConsolidation(group);
        if (suggestion) {
          redundancies.push({ rules: group, suggestion });
        }
      }
    }

    return redundancies;
  }

  private groupSimilarRules(rules: PolicyRule[]): Map<string, PolicyRule[]> {
    const groups = new Map<string, PolicyRule[]>();

    for (const rule of rules) {
      // Create key based on action and resource pattern
      const baseResource = rule.resource.split('/').slice(0, 3).join('/');
      const key = `${rule.action}:${baseResource}`;

      const group = groups.get(key) || [];
      group.push(rule);
      groups.set(key, group);
    }

    return groups;
  }

  private suggestConsolidation(rules: PolicyRule[]): string | null {
    // Check if rules have same action and can be merged
    if (rules.length < 2) return null;

    const action = rules[0].action;
    if (!rules.every(r => r.action === action)) return null;

    // Check for similar conditions
    const allSubjects = new Set<string>();
    rules.forEach(r => r.subjects.forEach(s => allSubjects.add(s)));

    return `Consolidate ${rules.length} rules with "${action}" action into a single rule with subjects: [${Array.from(allSubjects).join(', ')}]`;
  }
}

// ============================================================================
// Coverage Analyzer
// ============================================================================

class CoverageAnalyzer {
  private commonResources = [
    '/api/v1/entities/*',
    '/api/v1/relationships/*',
    '/api/v1/policies/*',
    '/api/v1/compliance/*',
    '/api/v1/audit/*',
    '/api/v1/users/*',
    '/api/v1/plugins/*',
  ];

  private commonActions = ['read', 'write', 'delete', 'admin'];

  /**
   * Identify gaps in policy coverage
   */
  findCoverageGaps(rules: PolicyRule[]): PolicyCoverageGap[] {
    const gaps: PolicyCoverageGap[] = [];
    const coveredResources = new Set(rules.map(r => r.resource));

    for (const resource of this.commonResources) {
      // Check if resource is covered
      const isCovered = Array.from(coveredResources).some(r =>
        this.resourceMatches(r, resource)
      );

      if (!isCovered) {
        gaps.push({
          id: `gap-${uuidv4()}`,
          resource,
          action: 'all',
          description: `No policy rules cover resource: ${resource}`,
          riskLevel: this.assessRisk(resource),
          suggestedRule: {
            name: `Default policy for ${resource}`,
            resource,
            action: 'deny',
            subjects: ['*'],
            priority: 100,
          },
        });
      }
    }

    return gaps;
  }

  private resourceMatches(pattern: string, resource: string): boolean {
    if (pattern === resource) return true;
    if (pattern.endsWith('*')) {
      return resource.startsWith(pattern.slice(0, -1));
    }
    return false;
  }

  private assessRisk(resource: string): 'high' | 'medium' | 'low' {
    if (resource.includes('audit') || resource.includes('policies')) {
      return 'high';
    }
    if (resource.includes('users') || resource.includes('compliance')) {
      return 'medium';
    }
    return 'low';
  }
}

// ============================================================================
// Performance Optimizer
// ============================================================================

class PerformanceOptimizer {
  /**
   * Suggest performance optimizations
   */
  analyzePerformance(rules: PolicyRule[]): Array<{ rule: PolicyRule; suggestion: string; impact: number }> {
    const suggestions: Array<{ rule: PolicyRule; suggestion: string; impact: number }> = [];

    for (const rule of rules) {
      // Check for inefficient patterns
      if (this.hasIneffientPattern(rule)) {
        suggestions.push({
          rule,
          suggestion: `Optimize condition in rule "${rule.name}" - complex patterns slow evaluation`,
          impact: 15, // 15% improvement estimate
        });
      }

      // Check for unused rules
      if (this.isLikelyUnused(rule)) {
        suggestions.push({
          rule,
          suggestion: `Rule "${rule.name}" hasn't matched in 30+ days - consider removal`,
          impact: 5,
        });
      }

      // Check for overly broad wildcards
      if (this.hasBroadWildcard(rule)) {
        suggestions.push({
          rule,
          suggestion: `Rule "${rule.name}" uses broad wildcards - consider more specific patterns`,
          impact: 10,
        });
      }
    }

    return suggestions;
  }

  private hasIneffientPattern(rule: PolicyRule): boolean {
    // Check for nested wildcards or regex-like patterns
    return rule.condition.includes('**') ||
           rule.condition.includes('(?:') ||
           rule.condition.length > 200;
  }

  private isLikelyUnused(rule: PolicyRule): boolean {
    if (!rule.lastMatchedAt) return true;
    const daysSinceMatch = (Date.now() - rule.lastMatchedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceMatch > 30 && rule.usageCount < 10;
  }

  private hasBroadWildcard(rule: PolicyRule): boolean {
    return rule.resource === '*' || rule.subjects.includes('*');
  }
}

// ============================================================================
// Policy Optimization Engine
// ============================================================================

export class PolicyOptimizationEngine extends EventEmitter {
  private config: OptimizationEngineConfig;
  private conflictDetector: ConflictDetector;
  private redundancyAnalyzer: RedundancyAnalyzer;
  private coverageAnalyzer: CoverageAnalyzer;
  private performanceOptimizer: PerformanceOptimizer;
  private stats: OptimizationStats;
  private suggestions: Map<string, OptimizationSuggestion[]> = new Map();

  constructor(config?: Partial<OptimizationEngineConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conflictDetector = new ConflictDetector();
    this.redundancyAnalyzer = new RedundancyAnalyzer();
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.stats = {
      totalPoliciesAnalyzed: 0,
      totalRulesAnalyzed: 0,
      suggestionsGenerated: 0,
      suggestionsApplied: 0,
      conflictsDetected: 0,
      redundanciesFound: 0,
      averageConfidence: 0,
      lastAnalysisAt: null,
    };

    logger.info({ config: this.config }, 'PolicyOptimizationEngine initialized');
  }

  /**
   * Analyze a policy and generate optimization suggestions
   */
  async analyzePolicy(policy: Policy): Promise<DataEnvelope<OptimizationSuggestion[]>> {
    this.stats.totalPoliciesAnalyzed++;
    this.stats.totalRulesAnalyzed += policy.rules.length;
    this.stats.lastAnalysisAt = new Date().toISOString();

    const suggestions: OptimizationSuggestion[] = [];

    // Conflict detection
    if (this.config.detectConflicts) {
      const conflicts = this.conflictDetector.detectConflicts(policy.rules);
      this.stats.conflictsDetected += conflicts.length;

      for (const conflict of conflicts) {
        suggestions.push(this.createConflictSuggestion(policy, conflict));
      }
    }

    // Redundancy detection
    if (this.config.detectRedundancy) {
      const redundancies = this.redundancyAnalyzer.findRedundancies(policy.rules);
      this.stats.redundanciesFound += redundancies.length;

      for (const redundancy of redundancies) {
        suggestions.push(this.createRedundancySuggestion(policy, redundancy));
      }
    }

    // Coverage analysis
    if (this.config.analyzeCoverage) {
      const gaps = this.coverageAnalyzer.findCoverageGaps(policy.rules);

      for (const gap of gaps) {
        suggestions.push(this.createCoverageSuggestion(policy, gap));
      }
    }

    // Performance optimization
    if (this.config.optimizePerformance) {
      const perfSuggestions = this.performanceOptimizer.analyzePerformance(policy.rules);

      for (const perf of perfSuggestions) {
        suggestions.push(this.createPerformanceSuggestion(policy, perf));
      }
    }

    // Filter by minimum confidence
    const filteredSuggestions = suggestions.filter(
      s => s.confidence >= this.config.minConfidence
    );

    // Store suggestions
    this.suggestions.set(policy.tenantId, [
      ...(this.suggestions.get(policy.tenantId) || []),
      ...filteredSuggestions,
    ]);

    this.stats.suggestionsGenerated += filteredSuggestions.length;
    this.updateAverageConfidence(filteredSuggestions);

    // Emit event for high-priority suggestions
    for (const suggestion of filteredSuggestions) {
      if (suggestion.priority === 'critical' || suggestion.priority === 'high') {
        this.emit('optimization:suggested', suggestion);
      }
    }

    logger.info(
      {
        policyId: policy.id,
        tenantId: policy.tenantId,
        rulesAnalyzed: policy.rules.length,
        suggestionsGenerated: filteredSuggestions.length,
      },
      'Policy analysis complete'
    );

    return createDataEnvelope(filteredSuggestions, {
      source: 'PolicyOptimizationEngine',
      governanceVerdict: createVerdict(
        filteredSuggestions.some(s => s.priority === 'critical')
          ? GovernanceResult.FLAG
          : GovernanceResult.ALLOW,
        `Generated ${filteredSuggestions.length} optimization suggestions`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Analyze multiple policies for cross-policy optimizations
   */
  async analyzePolicies(policies: Policy[]): Promise<DataEnvelope<OptimizationSuggestion[]>> {
    const allSuggestions: OptimizationSuggestion[] = [];

    // Analyze individual policies
    for (const policy of policies) {
      const result = await this.analyzePolicy(policy);
      if (result.data) {
        allSuggestions.push(...result.data);
      }
    }

    // Cross-policy analysis
    const crossPolicySuggestions = this.analyzeCrossPolicy(policies);
    allSuggestions.push(...crossPolicySuggestions);

    return createDataEnvelope(allSuggestions, {
      source: 'PolicyOptimizationEngine',
      governanceVerdict: createVerdict(
        GovernanceResult.ALLOW,
        `Analyzed ${policies.length} policies, generated ${allSuggestions.length} suggestions`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get suggestions for a tenant
   */
  getSuggestions(tenantId: string): DataEnvelope<OptimizationSuggestion[]> {
    const suggestions = this.suggestions.get(tenantId) || [];

    return createDataEnvelope(suggestions, {
      source: 'PolicyOptimizationEngine',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Suggestions retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Update suggestion status
   */
  updateSuggestionStatus(
    tenantId: string,
    suggestionId: string,
    status: OptimizationStatus
  ): DataEnvelope<OptimizationSuggestion | null> {
    const suggestions = this.suggestions.get(tenantId) || [];
    const suggestion = suggestions.find(s => s.id === suggestionId);

    if (!suggestion) {
      return createDataEnvelope(null, {
        source: 'PolicyOptimizationEngine',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Suggestion not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    suggestion.status = status;
    if (status === 'applied') {
      this.stats.suggestionsApplied++;
    }

    logger.info(
      { suggestionId, tenantId, status },
      'Suggestion status updated'
    );

    return createDataEnvelope(suggestion, {
      source: 'PolicyOptimizationEngine',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Status updated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get optimization statistics
   */
  getStats(): DataEnvelope<OptimizationStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'PolicyOptimizationEngine',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clear tenant data
   */
  clearTenant(tenantId: string): void {
    this.suggestions.delete(tenantId);
    logger.info({ tenantId }, 'Tenant data cleared from optimization engine');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private createConflictSuggestion(
    policy: Policy,
    conflict: PolicyConflict
  ): OptimizationSuggestion {
    const impact: ImpactEstimate = {
      evaluationSpeedChange: 5,
      coverageChange: 0,
      securityScoreChange: conflict.severity === 'critical' ? 30 : 15,
      conflictsResolved: 1,
      redundanciesRemoved: 0,
      rulesAffected: 2,
    };

    const confidence = conflict.severity === 'critical' ? 0.95 : 0.85;

    return {
      id: `opt-${uuidv4()}`,
      tenantId: policy.tenantId,
      type: 'conflict_resolution',
      priority: calculatePriority('conflict_resolution', impact, confidence),
      status: 'pending',
      title: `Resolve ${conflict.severity} policy conflict`,
      description: conflict.conflictDescription,
      affectedPolicies: [policy.id],
      affectedRules: [conflict.rule1.id, conflict.rule2.id],
      currentState: `Rules "${conflict.rule1.name}" and "${conflict.rule2.name}" have conflicting actions`,
      suggestedState: conflict.resolution,
      estimatedImpact: impact,
      confidence,
      reasoning: [
        `${conflict.type} conflict detected`,
        `${conflict.rule1.action} vs ${conflict.rule2.action} on overlapping resources`,
        conflict.resolution,
      ],
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.FLAG,
        `Policy conflict requires resolution: ${conflict.severity}`
      ),
    };
  }

  private createRedundancySuggestion(
    policy: Policy,
    redundancy: { rules: PolicyRule[]; suggestion: string }
  ): OptimizationSuggestion {
    const impact: ImpactEstimate = {
      evaluationSpeedChange: 10 * redundancy.rules.length,
      coverageChange: 0,
      securityScoreChange: 0,
      conflictsResolved: 0,
      redundanciesRemoved: redundancy.rules.length - 1,
      rulesAffected: redundancy.rules.length,
    };

    return {
      id: `opt-${uuidv4()}`,
      tenantId: policy.tenantId,
      type: 'redundancy_elimination',
      priority: calculatePriority('redundancy_elimination', impact, 0.8),
      status: 'pending',
      title: `Consolidate ${redundancy.rules.length} redundant rules`,
      description: redundancy.suggestion,
      affectedPolicies: [policy.id],
      affectedRules: redundancy.rules.map(r => r.id),
      currentState: `${redundancy.rules.length} rules with similar patterns`,
      suggestedState: 'Single consolidated rule',
      estimatedImpact: impact,
      confidence: 0.8,
      reasoning: [
        `Found ${redundancy.rules.length} rules with same action`,
        'Rules cover similar or overlapping resources',
        'Consolidation will improve evaluation performance',
      ],
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.ALLOW,
        'Redundancy detected - consolidation recommended'
      ),
    };
  }

  private createCoverageSuggestion(
    policy: Policy,
    gap: PolicyCoverageGap
  ): OptimizationSuggestion {
    const impact: ImpactEstimate = {
      evaluationSpeedChange: 0,
      coverageChange: 5,
      securityScoreChange: gap.riskLevel === 'high' ? 20 : 10,
      conflictsResolved: 0,
      redundanciesRemoved: 0,
      rulesAffected: 1,
    };

    const confidence = gap.riskLevel === 'high' ? 0.9 : 0.75;

    return {
      id: `opt-${uuidv4()}`,
      tenantId: policy.tenantId,
      type: 'coverage_improvement',
      priority: calculatePriority('coverage_improvement', impact, confidence),
      status: 'pending',
      title: `Add policy coverage for ${gap.resource}`,
      description: gap.description,
      affectedPolicies: [policy.id],
      affectedRules: [],
      currentState: 'No policy rules cover this resource',
      suggestedState: `Add rule: ${JSON.stringify(gap.suggestedRule)}`,
      estimatedImpact: impact,
      confidence,
      reasoning: [
        `Resource ${gap.resource} is not covered by any policy`,
        `Risk level: ${gap.riskLevel}`,
        'Recommend adding explicit policy rule',
      ],
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        gap.riskLevel === 'high' ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        `Coverage gap detected: ${gap.riskLevel} risk`
      ),
    };
  }

  private createPerformanceSuggestion(
    policy: Policy,
    perf: { rule: PolicyRule; suggestion: string; impact: number }
  ): OptimizationSuggestion {
    const impact: ImpactEstimate = {
      evaluationSpeedChange: perf.impact,
      coverageChange: 0,
      securityScoreChange: 0,
      conflictsResolved: 0,
      redundanciesRemoved: 0,
      rulesAffected: 1,
    };

    return {
      id: `opt-${uuidv4()}`,
      tenantId: policy.tenantId,
      type: 'performance_optimization',
      priority: calculatePriority('performance_optimization', impact, 0.7),
      status: 'pending',
      title: `Optimize rule "${perf.rule.name}"`,
      description: perf.suggestion,
      affectedPolicies: [policy.id],
      affectedRules: [perf.rule.id],
      currentState: `Current rule evaluation pattern`,
      suggestedState: 'Optimized evaluation pattern',
      estimatedImpact: impact,
      confidence: 0.7,
      reasoning: [
        perf.suggestion,
        `Estimated ${perf.impact}% performance improvement`,
      ],
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.ALLOW,
        'Performance optimization available'
      ),
    };
  }

  private analyzeCrossPolicy(policies: Policy[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Collect all rules across policies
    const allRules: Array<{ policy: Policy; rule: PolicyRule }> = [];
    for (const policy of policies) {
      for (const rule of policy.rules) {
        allRules.push({ policy, rule });
      }
    }

    // Look for duplicate rules across policies
    const ruleSignatures = new Map<string, Array<{ policy: Policy; rule: PolicyRule }>>();
    for (const { policy, rule } of allRules) {
      const signature = `${rule.action}:${rule.resource}:${rule.subjects.sort().join(',')}`;
      const existing = ruleSignatures.get(signature) || [];
      existing.push({ policy, rule });
      ruleSignatures.set(signature, existing);
    }

    for (const [, duplicates] of ruleSignatures) {
      if (duplicates.length > 1) {
        const impact: ImpactEstimate = {
          evaluationSpeedChange: 5 * duplicates.length,
          coverageChange: 0,
          securityScoreChange: 0,
          conflictsResolved: 0,
          redundanciesRemoved: duplicates.length - 1,
          rulesAffected: duplicates.length,
        };

        suggestions.push({
          id: `opt-${uuidv4()}`,
          tenantId: duplicates[0].policy.tenantId,
          type: 'redundancy_elimination',
          priority: 'medium',
          status: 'pending',
          title: `Cross-policy duplicate rules detected`,
          description: `Same rule exists in ${duplicates.length} policies`,
          affectedPolicies: duplicates.map(d => d.policy.id),
          affectedRules: duplicates.map(d => d.rule.id),
          currentState: `Rule duplicated across ${duplicates.length} policies`,
          suggestedState: 'Consolidate into shared policy or single location',
          estimatedImpact: impact,
          confidence: 0.85,
          reasoning: [
            'Identical rules found in multiple policies',
            'Consider extracting to a shared base policy',
            'Reduces maintenance overhead and evaluation time',
          ],
          createdAt: new Date().toISOString(),
          governanceVerdict: createVerdict(
            GovernanceResult.ALLOW,
            'Cross-policy redundancy detected'
          ),
        });
      }
    }

    return suggestions;
  }

  private updateAverageConfidence(suggestions: OptimizationSuggestion[]): void {
    if (suggestions.length === 0) return;

    const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
    const n = this.stats.suggestionsGenerated;
    const newAvg = (totalConfidence + (this.stats.averageConfidence * (n - suggestions.length))) / n;
    this.stats.averageConfidence = newAvg;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: PolicyOptimizationEngine | null = null;

export function getPolicyOptimizationEngine(
  config?: Partial<OptimizationEngineConfig>
): PolicyOptimizationEngine {
  if (!instance) {
    instance = new PolicyOptimizationEngine(config);
  }
  return instance;
}

export default PolicyOptimizationEngine;
