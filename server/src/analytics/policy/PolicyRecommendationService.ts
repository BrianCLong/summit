/**
 * Policy Recommendation Service
 *
 * ML-powered policy recommendations based on usage patterns,
 * best practices, and security requirements.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC5.3 (Policy Review)
 *
 * @module analytics/policy/PolicyRecommendationService
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type RecommendationType =
  | 'security_enhancement'
  | 'least_privilege'
  | 'separation_of_duties'
  | 'access_review'
  | 'policy_standardization'
  | 'compliance_alignment'
  | 'performance_improvement';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationStatus = 'new' | 'acknowledged' | 'implemented' | 'dismissed';

export interface PolicyRecommendation {
  id: string;
  tenantId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  description: string;
  rationale: string[];
  suggestedActions: SuggestedAction[];
  relatedPolicies: string[];
  relatedResources: string[];
  estimatedEffort: 'minimal' | 'moderate' | 'significant';
  securityImpact: 'high' | 'medium' | 'low';
  complianceFrameworks: string[];
  confidence: number;
  expiresAt?: string;
  createdAt: string;
  acknowledgedAt?: string;
  implementedAt?: string;
  governanceVerdict: GovernanceVerdict;
}

export interface SuggestedAction {
  order: number;
  action: string;
  details: string;
  automated: boolean;
  ruleTemplate?: PolicyRuleTemplate;
}

export interface PolicyRuleTemplate {
  name: string;
  action: 'allow' | 'deny' | 'flag' | 'review';
  resource: string;
  subjects: string[];
  condition?: string;
  priority: number;
}

export interface AccessPattern {
  subject: string;
  resource: string;
  action: string;
  frequency: number;
  lastAccess: Date;
  currentDecision: 'allow' | 'deny' | 'flag' | 'review';
  isActive: boolean;
}

export interface UsageAnalysis {
  tenantId: string;
  analysisDate: Date;
  activeUsers: number;
  totalRequests: number;
  uniqueResources: number;
  accessPatterns: AccessPattern[];
  unusedPermissions: UnusedPermission[];
  highRiskAccess: HighRiskAccess[];
}

export interface UnusedPermission {
  subject: string;
  resource: string;
  permission: string;
  lastUsed: Date | null;
  daysSinceUsed: number;
  riskIfRemoved: 'high' | 'medium' | 'low';
}

export interface HighRiskAccess {
  subject: string;
  resource: string;
  riskLevel: 'critical' | 'high' | 'medium';
  riskFactors: string[];
  mitigationSuggestion: string;
}

export interface RecommendationConfig {
  /** Enable least privilege recommendations */
  enableLeastPrivilege: boolean;
  /** Days before marking permission as unused */
  unusedPermissionDays: number;
  /** Enable separation of duties checks */
  enableSoD: boolean;
  /** Enable compliance alignment */
  enableCompliance: boolean;
  /** Minimum confidence for recommendations */
  minConfidence: number;
  /** Recommendation expiration days */
  expirationDays: number;
}

export interface RecommendationStats {
  totalGenerated: number;
  byType: Record<RecommendationType, number>;
  byPriority: Record<RecommendationPriority, number>;
  implemented: number;
  dismissed: number;
  averageTimeToImplement: number;
  lastGeneratedAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'policy-recommendation-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PolicyRecommendationService',
  };
}

function calculatePriority(
  type: RecommendationType,
  securityImpact: 'high' | 'medium' | 'low',
  confidence: number
): RecommendationPriority {
  if (securityImpact === 'high' && confidence >= 0.8) {
    return 'critical';
  }
  if (securityImpact === 'high' || (securityImpact === 'medium' && confidence >= 0.85)) {
    return 'high';
  }
  if (securityImpact === 'medium' || confidence >= 0.7) {
    return 'medium';
  }
  return 'low';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RecommendationConfig = {
  enableLeastPrivilege: true,
  unusedPermissionDays: 90,
  enableSoD: true,
  enableCompliance: true,
  minConfidence: 0.6,
  expirationDays: 30,
};

// ============================================================================
// Least Privilege Analyzer
// ============================================================================

class LeastPrivilegeAnalyzer {
  private unusedThresholdDays: number;

  constructor(thresholdDays: number) {
    this.unusedThresholdDays = thresholdDays;
  }

  /**
   * Analyze for unused permissions
   */
  analyzeUnusedPermissions(patterns: AccessPattern[]): UnusedPermission[] {
    const unused: UnusedPermission[] = [];
    const now = Date.now();

    // Group by subject
    const bySubject = new Map<string, AccessPattern[]>();
    for (const pattern of patterns) {
      const existing = bySubject.get(pattern.subject) || [];
      existing.push(pattern);
      bySubject.set(pattern.subject, existing);
    }

    for (const [subject, subjectPatterns] of bySubject) {
      // Find patterns that haven't been used recently
      for (const pattern of subjectPatterns) {
        if (!pattern.isActive) continue;

        const daysSinceUsed = pattern.lastAccess
          ? Math.floor((now - pattern.lastAccess.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        if (daysSinceUsed > this.unusedThresholdDays) {
          unused.push({
            subject,
            resource: pattern.resource,
            permission: pattern.action,
            lastUsed: pattern.lastAccess || null,
            daysSinceUsed,
            riskIfRemoved: this.assessRemovalRisk(pattern, subjectPatterns),
          });
        }
      }
    }

    return unused;
  }

  /**
   * Generate recommendations for unused permissions
   */
  generateRecommendations(
    tenantId: string,
    unused: UnusedPermission[]
  ): PolicyRecommendation[] {
    const recommendations: PolicyRecommendation[] = [];

    // Group by subject for consolidated recommendations
    const bySubject = new Map<string, UnusedPermission[]>();
    for (const perm of unused) {
      const existing = bySubject.get(perm.subject) || [];
      existing.push(perm);
      bySubject.set(perm.subject, existing);
    }

    for (const [subject, permissions] of bySubject) {
      const lowRisk = permissions.filter(p => p.riskIfRemoved === 'low');
      const mediumRisk = permissions.filter(p => p.riskIfRemoved === 'medium');

      if (lowRisk.length > 0) {
        recommendations.push(this.createRecommendation(
          tenantId,
          subject,
          lowRisk,
          0.9,
          'low'
        ));
      }

      if (mediumRisk.length > 0) {
        recommendations.push(this.createRecommendation(
          tenantId,
          subject,
          mediumRisk,
          0.75,
          'medium'
        ));
      }
    }

    return recommendations;
  }

  private assessRemovalRisk(
    pattern: AccessPattern,
    allPatterns: AccessPattern[]
  ): 'high' | 'medium' | 'low' {
    // High frequency usage suggests higher risk
    const avgFrequency = allPatterns.reduce((sum, p) => sum + p.frequency, 0) / allPatterns.length;

    if (pattern.frequency > avgFrequency * 2) {
      return 'high';
    }
    if (pattern.frequency > avgFrequency) {
      return 'medium';
    }
    return 'low';
  }

  private createRecommendation(
    tenantId: string,
    subject: string,
    permissions: UnusedPermission[],
    confidence: number,
    riskLevel: 'high' | 'medium' | 'low'
  ): PolicyRecommendation {
    const securityImpact = riskLevel === 'low' ? 'high' : 'medium'; // Removing unused = security improvement

    return {
      id: `rec-${uuidv4()}`,
      tenantId,
      type: 'least_privilege',
      priority: calculatePriority('least_privilege', securityImpact, confidence),
      status: 'new',
      title: `Remove ${permissions.length} unused permission(s) for ${subject}`,
      description: `Subject "${subject}" has ${permissions.length} permission(s) that haven't been used in ${this.unusedThresholdDays}+ days`,
      rationale: [
        'Principle of least privilege recommends removing unused access',
        `${permissions.length} permission(s) not accessed in over ${this.unusedThresholdDays} days`,
        'Reduces attack surface and compliance risk',
      ],
      suggestedActions: permissions.map((perm, idx) => ({
        order: idx + 1,
        action: 'Remove permission',
        details: `Remove access to ${perm.resource} (${perm.permission})`,
        automated: riskLevel === 'low',
        ruleTemplate: {
          name: `Revoke ${perm.permission} on ${perm.resource}`,
          action: 'deny',
          resource: perm.resource,
          subjects: [subject],
          priority: 10,
        },
      })),
      relatedPolicies: [],
      relatedResources: permissions.map(p => p.resource),
      estimatedEffort: permissions.length > 5 ? 'moderate' : 'minimal',
      securityImpact,
      complianceFrameworks: ['SOC2', 'ISO27001', 'NIST'],
      confidence,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.FLAG,
        'Least privilege recommendation generated'
      ),
    };
  }
}

// ============================================================================
// Separation of Duties Analyzer
// ============================================================================

class SoDAnalyzer {
  private conflictingRoles: Array<[string, string]> = [
    ['admin', 'auditor'],
    ['developer', 'deployer'],
    ['requestor', 'approver'],
    ['data_owner', 'data_auditor'],
  ];

  /**
   * Check for separation of duties violations
   */
  analyzeViolations(patterns: AccessPattern[]): Array<{
    subject: string;
    conflictingRoles: [string, string];
    resources: string[];
    severity: 'critical' | 'high' | 'medium';
  }> {
    const violations: Array<{
      subject: string;
      conflictingRoles: [string, string];
      resources: string[];
      severity: 'critical' | 'high' | 'medium';
    }> = [];

    // Group by subject
    const bySubject = new Map<string, AccessPattern[]>();
    for (const pattern of patterns) {
      const existing = bySubject.get(pattern.subject) || [];
      existing.push(pattern);
      bySubject.set(pattern.subject, existing);
    }

    for (const [subject, subjectPatterns] of bySubject) {
      const resources = subjectPatterns.map(p => p.resource);

      for (const [role1, role2] of this.conflictingRoles) {
        const hasRole1 = resources.some(r => r.toLowerCase().includes(role1));
        const hasRole2 = resources.some(r => r.toLowerCase().includes(role2));

        if (hasRole1 && hasRole2) {
          violations.push({
            subject,
            conflictingRoles: [role1, role2],
            resources: resources.filter(r =>
              r.toLowerCase().includes(role1) || r.toLowerCase().includes(role2)
            ),
            severity: this.assessSeverity(role1, role2),
          });
        }
      }
    }

    return violations;
  }

  /**
   * Generate recommendations for SoD violations
   */
  generateRecommendations(
    tenantId: string,
    violations: Array<{
      subject: string;
      conflictingRoles: [string, string];
      resources: string[];
      severity: 'critical' | 'high' | 'medium';
    }>
  ): PolicyRecommendation[] {
    return violations.map(violation => ({
      id: `rec-${uuidv4()}`,
      tenantId,
      type: 'separation_of_duties' as RecommendationType,
      priority: violation.severity === 'critical' ? 'critical' : 'high',
      status: 'new' as RecommendationStatus,
      title: `Separation of Duties violation: ${violation.subject}`,
      description: `Subject "${violation.subject}" has conflicting roles: ${violation.conflictingRoles.join(' and ')}`,
      rationale: [
        'Separation of duties is a key internal control',
        `Conflicting roles detected: ${violation.conflictingRoles.join(' vs ')}`,
        'Single user should not have both roles',
        'Required by SOC 2 CC5.1 and ISO 27001',
      ],
      suggestedActions: [
        {
          order: 1,
          action: 'Review access necessity',
          details: 'Determine if both roles are required for this user',
          automated: false,
        },
        {
          order: 2,
          action: 'Remove conflicting access',
          details: `Remove either ${violation.conflictingRoles[0]} or ${violation.conflictingRoles[1]} access`,
          automated: false,
        },
        {
          order: 3,
          action: 'Implement compensating control',
          details: 'If both roles are required, implement additional approval workflow',
          automated: false,
        },
      ],
      relatedPolicies: [],
      relatedResources: violation.resources,
      estimatedEffort: 'moderate',
      securityImpact: 'high',
      complianceFrameworks: ['SOC2', 'ISO27001', 'PCI-DSS'],
      confidence: 0.95,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.FLAG,
        `SoD violation detected: ${violation.severity}`
      ),
    }));
  }

  private assessSeverity(role1: string, role2: string): 'critical' | 'high' | 'medium' {
    const criticalPairs = [['admin', 'auditor'], ['requestor', 'approver']];

    for (const [r1, r2] of criticalPairs) {
      if ((role1 === r1 && role2 === r2) || (role1 === r2 && role2 === r1)) {
        return 'critical';
      }
    }
    return 'high';
  }
}

// ============================================================================
// Security Best Practices Analyzer
// ============================================================================

class SecurityBestPracticesAnalyzer {
  /**
   * Identify high-risk access patterns
   */
  identifyHighRiskAccess(patterns: AccessPattern[]): HighRiskAccess[] {
    const highRisk: HighRiskAccess[] = [];

    for (const pattern of patterns) {
      const riskFactors: string[] = [];

      // Check for wildcard access
      if (pattern.resource === '*' || pattern.subject === '*') {
        riskFactors.push('Wildcard access pattern');
      }

      // Check for sensitive resources
      if (this.isSensitiveResource(pattern.resource)) {
        riskFactors.push('Access to sensitive resource');
      }

      // Check for admin/write access
      if (pattern.action === 'admin' || pattern.action === 'write' || pattern.action === 'delete') {
        riskFactors.push(`${pattern.action} permission on resource`);
      }

      // Check for high frequency access
      if (pattern.frequency > 1000) {
        riskFactors.push('High frequency access pattern');
      }

      if (riskFactors.length >= 2) {
        highRisk.push({
          subject: pattern.subject,
          resource: pattern.resource,
          riskLevel: riskFactors.length >= 3 ? 'critical' : 'high',
          riskFactors,
          mitigationSuggestion: this.suggestMitigation(riskFactors),
        });
      }
    }

    return highRisk;
  }

  /**
   * Generate security enhancement recommendations
   */
  generateRecommendations(
    tenantId: string,
    highRisk: HighRiskAccess[]
  ): PolicyRecommendation[] {
    return highRisk.map(risk => ({
      id: `rec-${uuidv4()}`,
      tenantId,
      type: 'security_enhancement' as RecommendationType,
      priority: risk.riskLevel === 'critical' ? 'critical' : 'high',
      status: 'new' as RecommendationStatus,
      title: `High-risk access pattern: ${risk.subject} → ${risk.resource}`,
      description: `Detected ${risk.riskFactors.length} risk factor(s) for this access pattern`,
      rationale: risk.riskFactors,
      suggestedActions: [
        {
          order: 1,
          action: 'Review access necessity',
          details: 'Confirm this access pattern is required for business operations',
          automated: false,
        },
        {
          order: 2,
          action: risk.mitigationSuggestion,
          details: 'Implement recommended security control',
          automated: false,
        },
        {
          order: 3,
          action: 'Add monitoring',
          details: 'Enable enhanced logging for this access pattern',
          automated: true,
        },
      ],
      relatedPolicies: [],
      relatedResources: [risk.resource],
      estimatedEffort: 'moderate',
      securityImpact: 'high',
      complianceFrameworks: ['SOC2', 'ISO27001', 'NIST'],
      confidence: 0.85,
      createdAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        GovernanceResult.FLAG,
        `High-risk access pattern: ${risk.riskLevel}`
      ),
    }));
  }

  private isSensitiveResource(resource: string): boolean {
    const sensitivePatterns = [
      'admin', 'audit', 'security', 'compliance',
      'secret', 'credential', 'key', 'token',
      'user', 'identity', 'auth',
    ];

    return sensitivePatterns.some(pattern =>
      resource.toLowerCase().includes(pattern)
    );
  }

  private suggestMitigation(riskFactors: string[]): string {
    if (riskFactors.includes('Wildcard access pattern')) {
      return 'Replace wildcard with specific resource patterns';
    }
    if (riskFactors.includes('Access to sensitive resource')) {
      return 'Add additional approval workflow for sensitive access';
    }
    if (riskFactors.some(f => f.includes('admin') || f.includes('delete'))) {
      return 'Implement time-limited privileged access';
    }
    return 'Add monitoring and alerting for this access pattern';
  }
}

// ============================================================================
// Policy Recommendation Service
// ============================================================================

export class PolicyRecommendationService extends EventEmitter {
  private config: RecommendationConfig;
  private leastPrivilegeAnalyzer: LeastPrivilegeAnalyzer;
  private sodAnalyzer: SoDAnalyzer;
  private securityAnalyzer: SecurityBestPracticesAnalyzer;
  private recommendations: Map<string, PolicyRecommendation[]> = new Map();
  private stats: RecommendationStats;

  constructor(config?: Partial<RecommendationConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.leastPrivilegeAnalyzer = new LeastPrivilegeAnalyzer(this.config.unusedPermissionDays);
    this.sodAnalyzer = new SoDAnalyzer();
    this.securityAnalyzer = new SecurityBestPracticesAnalyzer();
    this.stats = {
      totalGenerated: 0,
      byType: {
        security_enhancement: 0,
        least_privilege: 0,
        separation_of_duties: 0,
        access_review: 0,
        policy_standardization: 0,
        compliance_alignment: 0,
        performance_improvement: 0,
      },
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      implemented: 0,
      dismissed: 0,
      averageTimeToImplement: 0,
      lastGeneratedAt: null,
    };

    logger.info({ config: this.config }, 'PolicyRecommendationService initialized');
  }

  /**
   * Generate recommendations based on usage analysis
   */
  async generateRecommendations(
    analysis: UsageAnalysis
  ): Promise<DataEnvelope<PolicyRecommendation[]>> {
    const allRecommendations: PolicyRecommendation[] = [];

    // Least privilege analysis
    if (this.config.enableLeastPrivilege) {
      const unusedPerms = this.leastPrivilegeAnalyzer.analyzeUnusedPermissions(
        analysis.accessPatterns
      );
      const lpRecs = this.leastPrivilegeAnalyzer.generateRecommendations(
        analysis.tenantId,
        unusedPerms
      );
      allRecommendations.push(...lpRecs);
    }

    // Separation of duties analysis
    if (this.config.enableSoD) {
      const violations = this.sodAnalyzer.analyzeViolations(analysis.accessPatterns);
      const sodRecs = this.sodAnalyzer.generateRecommendations(analysis.tenantId, violations);
      allRecommendations.push(...sodRecs);
    }

    // Security best practices
    const highRisk = this.securityAnalyzer.identifyHighRiskAccess(analysis.accessPatterns);
    const secRecs = this.securityAnalyzer.generateRecommendations(analysis.tenantId, highRisk);
    allRecommendations.push(...secRecs);

    // Filter by minimum confidence
    const filteredRecs = allRecommendations.filter(
      r => r.confidence >= this.config.minConfidence
    );

    // Store recommendations
    const existing = this.recommendations.get(analysis.tenantId) || [];
    this.recommendations.set(analysis.tenantId, [...existing, ...filteredRecs]);

    // Update stats
    this.updateStats(filteredRecs);

    // Emit events for critical recommendations
    for (const rec of filteredRecs) {
      if (rec.priority === 'critical') {
        this.emit('recommendation:critical', rec);
      }
    }

    logger.info(
      {
        tenantId: analysis.tenantId,
        recommendationsGenerated: filteredRecs.length,
        byType: this.groupByType(filteredRecs),
      },
      'Recommendations generated'
    );

    return createDataEnvelope(filteredRecs, {
      source: 'PolicyRecommendationService',
      governanceVerdict: createVerdict(
        filteredRecs.some(r => r.priority === 'critical')
          ? GovernanceResult.FLAG
          : GovernanceResult.ALLOW,
        `Generated ${filteredRecs.length} recommendations`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get recommendations for a tenant
   */
  getRecommendations(
    tenantId: string,
    filters?: {
      type?: RecommendationType;
      priority?: RecommendationPriority;
      status?: RecommendationStatus;
    }
  ): DataEnvelope<PolicyRecommendation[]> {
    let recommendations = this.recommendations.get(tenantId) || [];

    if (filters?.type) {
      recommendations = recommendations.filter(r => r.type === filters.type);
    }
    if (filters?.priority) {
      recommendations = recommendations.filter(r => r.priority === filters.priority);
    }
    if (filters?.status) {
      recommendations = recommendations.filter(r => r.status === filters.status);
    }

    return createDataEnvelope(recommendations, {
      source: 'PolicyRecommendationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Recommendations retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Update recommendation status
   */
  updateStatus(
    tenantId: string,
    recommendationId: string,
    status: RecommendationStatus
  ): DataEnvelope<PolicyRecommendation | null> {
    const recommendations = this.recommendations.get(tenantId) || [];
    const recommendation = recommendations.find(r => r.id === recommendationId);

    if (!recommendation) {
      return createDataEnvelope(null, {
        source: 'PolicyRecommendationService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Recommendation not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    recommendation.status = status;

    if (status === 'acknowledged') {
      recommendation.acknowledgedAt = new Date().toISOString();
    } else if (status === 'implemented') {
      recommendation.implementedAt = new Date().toISOString();
      this.stats.implemented++;

      // Calculate time to implement
      if (recommendation.acknowledgedAt) {
        const acknowledgedTime = new Date(recommendation.acknowledgedAt).getTime();
        const implementedTime = new Date(recommendation.implementedAt).getTime();
        const timeToImplement = (implementedTime - acknowledgedTime) / (1000 * 60 * 60); // hours
        this.updateAverageTimeToImplement(timeToImplement);
      }
    } else if (status === 'dismissed') {
      this.stats.dismissed++;
    }

    logger.info(
      { recommendationId, tenantId, status },
      'Recommendation status updated'
    );

    return createDataEnvelope(recommendation, {
      source: 'PolicyRecommendationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Status updated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get recommendation statistics
   */
  getStats(): DataEnvelope<RecommendationStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'PolicyRecommendationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clean up expired recommendations
   */
  cleanupExpired(): number {
    let removed = 0;

    for (const [tenantId, recs] of this.recommendations) {
      const now = Date.now();
      const valid = recs.filter(r => {
        if (!r.expiresAt) return true;
        if (r.status === 'implemented' || r.status === 'dismissed') return false;
        return new Date(r.expiresAt).getTime() > now;
      });

      removed += recs.length - valid.length;
      this.recommendations.set(tenantId, valid);
    }

    if (removed > 0) {
      logger.info({ removedCount: removed }, 'Expired recommendations cleaned up');
    }

    return removed;
  }

  /**
   * Clear tenant data
   */
  clearTenant(tenantId: string): void {
    this.recommendations.delete(tenantId);
    logger.info({ tenantId }, 'Tenant data cleared from recommendation service');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private updateStats(recommendations: PolicyRecommendation[]): void {
    this.stats.totalGenerated += recommendations.length;
    this.stats.lastGeneratedAt = new Date().toISOString();

    for (const rec of recommendations) {
      this.stats.byType[rec.type]++;
      this.stats.byPriority[rec.priority]++;
    }
  }

  private groupByType(recommendations: PolicyRecommendation[]): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const rec of recommendations) {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
    }
    return byType;
  }

  private updateAverageTimeToImplement(newTime: number): void {
    const n = this.stats.implemented;
    this.stats.averageTimeToImplement =
      ((this.stats.averageTimeToImplement * (n - 1)) + newTime) / n;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: PolicyRecommendationService | null = null;

export function getPolicyRecommendationService(
  config?: Partial<RecommendationConfig>
): PolicyRecommendationService {
  if (!instance) {
    instance = new PolicyRecommendationService(config);
  }
  return instance;
}

export default PolicyRecommendationService;
