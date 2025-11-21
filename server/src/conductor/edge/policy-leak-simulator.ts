// Policy Leak Simulator: Verify no data leakage during offline sync
// Simulates policy enforcement to detect potential information disclosure

import Redis from 'ioredis';
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';
import type { CRDTOperation } from './crdt-sync.js';
import type { DataClaim } from './claim-sync.js';

// Policy rule definition
export interface PolicyRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'abac' | 'rbac' | 'clearance' | 'need_to_know' | 'data_residency';
  condition: string; // OPA Rego or JSON logic
  action: 'allow' | 'deny' | 'redact' | 'audit';
  scope: {
    entityTypes?: string[];
    operations?: string[];
    fields?: string[];
  };
  priority: number;
}

// Simulation context
export interface SimulationContext {
  sourceNode: {
    nodeId: string;
    clearanceLevel?: string;
    tenantId: string;
    location: string;
    roles: string[];
  };
  targetNode: {
    nodeId: string;
    clearanceLevel?: string;
    tenantId: string;
    location: string;
    roles: string[];
  };
  syncType: 'full' | 'claims_only' | 'hybrid';
}

// Simulation result
export interface SimulationResult {
  simulationId: string;
  timestamp: Date;
  sourceNodeId: string;
  targetNodeId: string;
  operationsAnalyzed: number;
  violations: PolicyViolation[];
  leakageDetected: boolean;
  riskScore: number; // 0-100
  recommendations: string[];
  summary: {
    totalOperations: number;
    allowedOperations: number;
    deniedOperations: number;
    redactedOperations: number;
    leakedFields: string[];
    violatedRules: string[];
  };
}

// Policy violation
export interface PolicyViolation {
  violationId: string;
  operationId: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  violationType:
    | 'unauthorized_access'
    | 'clearance_violation'
    | 'residency_violation'
    | 'need_to_know_violation'
    | 'information_disclosure';
  description: string;
  affectedFields: string[];
  leakedData?: {
    fieldName: string;
    classification: string;
    estimatedValue?: string; // Sanitized sample
  }[];
  remediation: string;
}

// Leak detection result
export interface LeakDetectionResult {
  field: string;
  sourceClassification: string;
  targetClearance: string;
  leaked: boolean;
  reason: string;
  redactionRequired: boolean;
}

/**
 * Policy Leak Simulator - Detect data leakage before sync
 */
export class PolicyLeakSimulator {
  private redis: Redis;
  private pool: Pool;
  private policyRules: Map<string, PolicyRule>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.policyRules = new Map();

    // Initialize with default policies
    this.loadDefaultPolicies();
  }

  /**
   * Load default policy rules
   */
  private loadDefaultPolicies(): void {
    const defaultRules: PolicyRule[] = [
      {
        ruleId: 'clearance-check',
        ruleName: 'Clearance Level Check',
        ruleType: 'clearance',
        condition:
          'data.classification <= subject.clearance_level', // Simplified
        action: 'deny',
        scope: {
          entityTypes: ['investigation', 'intelligence_report'],
        },
        priority: 100,
      },
      {
        ruleId: 'tenant-isolation',
        ruleName: 'Tenant Isolation',
        ruleType: 'abac',
        condition: 'data.tenant_id == subject.tenant_id',
        action: 'deny',
        scope: {},
        priority: 90,
      },
      {
        ruleId: 'data-residency',
        ruleName: 'Data Residency Requirements',
        ruleType: 'data_residency',
        condition: 'data.residency_requirements contains subject.location',
        action: 'deny',
        scope: {},
        priority: 85,
      },
      {
        ruleId: 'pii-redaction',
        ruleName: 'PII Field Redaction',
        ruleType: 'abac',
        condition: 'field matches "pii_*"',
        action: 'redact',
        scope: {
          fields: ['ssn', 'credit_card', 'email', 'phone'],
        },
        priority: 80,
      },
    ];

    defaultRules.forEach((rule) => this.policyRules.set(rule.ruleId, rule));

    logger.info('Default policy rules loaded', {
      ruleCount: defaultRules.length,
    });
  }

  /**
   * Simulate sync operation to detect leakage
   */
  async simulateSync(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<SimulationResult> {
    try {
      const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const timestamp = new Date();

      logger.info('Starting policy leak simulation', {
        simulationId,
        sourceNodeId,
        targetNodeId,
      });

      // Get node contexts
      const context = await this.buildSimulationContext(
        sourceNodeId,
        targetNodeId,
      );

      // Get pending operations
      const operations = await this.getPendingOperations(sourceNodeId);

      logger.info(`Analyzing ${operations.length} operations for leakage`);

      const violations: PolicyViolation[] = [];
      const leakedFields = new Set<string>();
      const violatedRules = new Set<string>();
      let allowedOperations = 0;
      let deniedOperations = 0;
      let redactedOperations = 0;

      // Simulate each operation
      for (const operation of operations) {
        const operationResult = await this.simulateOperation(
          operation,
          context,
        );

        if (operationResult.violations.length > 0) {
          violations.push(...operationResult.violations);

          // Track leaked fields and rules
          operationResult.violations.forEach((v) => {
            v.affectedFields.forEach((f) => leakedFields.add(f));
            violatedRules.add(v.ruleId);

            if (v.violationType === 'information_disclosure') {
              deniedOperations++;
            }
          });
        }

        if (operationResult.action === 'allow') {
          allowedOperations++;
        } else if (operationResult.action === 'deny') {
          deniedOperations++;
        } else if (operationResult.action === 'redact') {
          redactedOperations++;
        }
      }

      // Compute risk score
      const riskScore = this.computeRiskScore(violations, operations.length);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        violations,
        context,
      );

      const result: SimulationResult = {
        simulationId,
        timestamp,
        sourceNodeId,
        targetNodeId,
        operationsAnalyzed: operations.length,
        violations,
        leakageDetected: violations.some(
          (v) => v.violationType === 'information_disclosure',
        ),
        riskScore,
        recommendations,
        summary: {
          totalOperations: operations.length,
          allowedOperations,
          deniedOperations,
          redactedOperations,
          leakedFields: Array.from(leakedFields),
          violatedRules: Array.from(violatedRules),
        },
      };

      // Store simulation results
      await this.storeSimulationResult(result);

      // Record metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'policy_simulation_violations',
        violations.length,
        { source: sourceNodeId, target: targetNodeId },
      );

      prometheusConductorMetrics.recordOperationalMetric(
        'policy_simulation_risk_score',
        riskScore,
        { source: sourceNodeId, target: targetNodeId },
      );

      logger.info('Policy leak simulation completed', {
        simulationId,
        violations: violations.length,
        leakageDetected: result.leakageDetected,
        riskScore,
      });

      return result;
    } catch (error) {
      logger.error('Policy leak simulation failed', { error });
      throw error;
    }
  }

  /**
   * Simulate a single operation
   */
  private async simulateOperation(
    operation: CRDTOperation,
    context: SimulationContext,
  ): Promise<{
    operationId: string;
    action: 'allow' | 'deny' | 'redact';
    violations: PolicyViolation[];
  }> {
    const violations: PolicyViolation[] = [];
    let action: 'allow' | 'deny' | 'redact' = 'allow';

    // Apply each policy rule
    for (const rule of this.policyRules.values()) {
      const ruleResult = await this.applyRule(rule, operation, context);

      if (!ruleResult.compliant) {
        violations.push(...ruleResult.violations);

        // Determine action based on rule priority
        if (rule.action === 'deny' && action !== 'deny') {
          action = 'deny';
        } else if (rule.action === 'redact' && action === 'allow') {
          action = 'redact';
        }
      }
    }

    return {
      operationId: operation.id,
      action,
      violations,
    };
  }

  /**
   * Apply a policy rule to an operation
   */
  private async applyRule(
    rule: PolicyRule,
    operation: CRDTOperation,
    context: SimulationContext,
  ): Promise<{
    compliant: boolean;
    violations: PolicyViolation[];
  }> {
    const violations: PolicyViolation[] = [];

    // Check if rule applies to this operation
    if (rule.scope.entityTypes && rule.scope.entityTypes.length > 0) {
      if (!rule.scope.entityTypes.includes(operation.entityType)) {
        return { compliant: true, violations: [] };
      }
    }

    // Apply rule based on type
    switch (rule.ruleType) {
      case 'clearance':
        const clearanceResult = this.checkClearanceViolation(
          rule,
          operation,
          context,
        );
        if (clearanceResult) {
          violations.push(clearanceResult);
        }
        break;

      case 'abac':
        const abacResult = await this.checkABACViolation(
          rule,
          operation,
          context,
        );
        if (abacResult) {
          violations.push(abacResult);
        }
        break;

      case 'data_residency':
        const residencyResult = this.checkResidencyViolation(
          rule,
          operation,
          context,
        );
        if (residencyResult) {
          violations.push(residencyResult);
        }
        break;

      case 'need_to_know':
        const ntkResult = this.checkNeedToKnowViolation(
          rule,
          operation,
          context,
        );
        if (ntkResult) {
          violations.push(ntkResult);
        }
        break;
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Check clearance level violations
   */
  private checkClearanceViolation(
    rule: PolicyRule,
    operation: CRDTOperation,
    context: SimulationContext,
  ): PolicyViolation | null {
    const dataClassification = operation.data?.classification || 'unclassified';
    const targetClearance =
      context.targetNode.clearanceLevel || 'unclassified';

    // Clearance hierarchy: unclassified < confidential < secret < top_secret
    const clearanceLevels: Record<string, number> = {
      unclassified: 0,
      confidential: 1,
      secret: 2,
      top_secret: 3,
    };

    const dataLevel = clearanceLevels[dataClassification.toLowerCase()] || 0;
    const targetLevel = clearanceLevels[targetClearance.toLowerCase()] || 0;

    if (dataLevel > targetLevel) {
      // Violation detected
      const affectedFields = Object.keys(operation.data || {});

      return {
        violationId: `viol_${operation.id}_clearance`,
        operationId: operation.id,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        severity: dataLevel >= 3 ? 'critical' : dataLevel >= 2 ? 'high' : 'medium',
        violationType: 'clearance_violation',
        description: `Data with classification "${dataClassification}" cannot be sent to node with clearance "${targetClearance}"`,
        affectedFields,
        leakedData: affectedFields.slice(0, 3).map((field) => ({
          fieldName: field,
          classification: dataClassification,
          estimatedValue: '[REDACTED]',
        })),
        remediation: `Increase target node clearance to "${dataClassification}" or redact sensitive fields`,
      };
    }

    return null;
  }

  /**
   * Check ABAC (Attribute-Based Access Control) violations
   */
  private async checkABACViolation(
    rule: PolicyRule,
    operation: CRDTOperation,
    context: SimulationContext,
  ): Promise<PolicyViolation | null> {
    // Check tenant isolation
    const dataTenantId = operation.data?._tenantId || operation.data?.tenantId;
    const targetTenantId = context.targetNode.tenantId;

    if (dataTenantId && targetTenantId && dataTenantId !== targetTenantId) {
      return {
        violationId: `viol_${operation.id}_tenant`,
        operationId: operation.id,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        severity: 'critical',
        violationType: 'unauthorized_access',
        description: `Data belongs to tenant "${dataTenantId}" but target node is in tenant "${targetTenantId}"`,
        affectedFields: Object.keys(operation.data || {}),
        remediation:
          'Ensure sync operations respect tenant boundaries or use multi-tenant aware sync',
      };
    }

    return null;
  }

  /**
   * Check data residency violations
   */
  private checkResidencyViolation(
    rule: PolicyRule,
    operation: CRDTOperation,
    context: SimulationContext,
  ): PolicyViolation | null {
    const residencyRequirements = operation.data?.residency || [];
    const targetLocation = context.targetNode.location;

    if (
      residencyRequirements.length > 0 &&
      !residencyRequirements.includes(targetLocation)
    ) {
      return {
        violationId: `viol_${operation.id}_residency`,
        operationId: operation.id,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        severity: 'high',
        violationType: 'residency_violation',
        description: `Data must remain in ${residencyRequirements.join(', ')} but target is in ${targetLocation}`,
        affectedFields: Object.keys(operation.data || {}),
        remediation: `Do not sync to nodes outside allowed regions: ${residencyRequirements.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * Check need-to-know violations
   */
  private checkNeedToKnowViolation(
    rule: PolicyRule,
    operation: CRDTOperation,
    context: SimulationContext,
  ): PolicyViolation | null {
    // Simplified need-to-know check
    // In production, would check against access control lists

    const requiredRoles = operation.data?.requiredRoles || [];
    const targetRoles = context.targetNode.roles;

    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role: string) =>
        targetRoles.includes(role),
      );

      if (!hasRequiredRole) {
        return {
          violationId: `viol_${operation.id}_ntk`,
          operationId: operation.id,
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          severity: 'high',
          violationType: 'need_to_know_violation',
          description: `Target node lacks required roles: ${requiredRoles.join(', ')}`,
          affectedFields: Object.keys(operation.data || {}),
          remediation: `Grant one of these roles to target node: ${requiredRoles.join(', ')}`,
        };
      }
    }

    return null;
  }

  /**
   * Compute risk score from violations
   */
  private computeRiskScore(
    violations: PolicyViolation[],
    totalOperations: number,
  ): number {
    if (violations.length === 0) return 0;

    // Weight by severity
    const severityWeights: Record<string, number> = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10,
    };

    const totalWeight = violations.reduce(
      (sum, v) => sum + severityWeights[v.severity],
      0,
    );

    // Normalize to 0-100 scale
    const maxPossibleWeight = totalOperations * 10; // If all were critical
    const rawScore = (totalWeight / maxPossibleWeight) * 100;

    return Math.min(100, Math.round(rawScore));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    violations: PolicyViolation[],
    context: SimulationContext,
  ): string[] {
    const recommendations: string[] = [];

    // Group violations by type
    const violationsByType = new Map<string, PolicyViolation[]>();
    violations.forEach((v) => {
      const existing = violationsByType.get(v.violationType) || [];
      existing.push(v);
      violationsByType.set(v.violationType, existing);
    });

    // Generate type-specific recommendations
    if (violationsByType.has('clearance_violation')) {
      recommendations.push(
        `Increase clearance level of target node or use claim-based sync to redact sensitive fields`,
      );
    }

    if (violationsByType.has('unauthorized_access')) {
      recommendations.push(
        `Ensure tenant isolation is enforced - consider separate sync channels per tenant`,
      );
    }

    if (violationsByType.has('residency_violation')) {
      recommendations.push(
        `Deploy edge nodes in compliant regions or filter sync by data residency requirements`,
      );
    }

    if (violationsByType.has('need_to_know_violation')) {
      recommendations.push(
        `Review role assignments or implement finer-grained access control`,
      );
    }

    if (context.syncType === 'full') {
      recommendations.push(
        `Consider switching to "claims_only" sync mode to minimize data exposure`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No policy violations detected - safe to sync');
    }

    return recommendations;
  }

  /**
   * Build simulation context from node data
   */
  private async buildSimulationContext(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<SimulationContext> {
    // Get node metadata (simplified - in production, query from registry)
    const getNodeInfo = async (nodeId: string) => {
      const nodeData = await this.redis.get(`crdt_node:${nodeId}`);
      if (nodeData) {
        const node = JSON.parse(nodeData);
        return {
          nodeId,
          clearanceLevel: node.clearanceLevel || 'unclassified',
          tenantId: node.tenantId || 'default',
          location: node.location || 'unknown',
          roles: node.roles || [],
        };
      }

      // Default context
      return {
        nodeId,
        clearanceLevel: 'unclassified',
        tenantId: 'default',
        location: 'unknown',
        roles: [],
      };
    };

    return {
      sourceNode: await getNodeInfo(sourceNodeId),
      targetNode: await getNodeInfo(targetNodeId),
      syncType: 'claims_only', // Default to most secure
    };
  }

  /**
   * Get pending operations
   */
  private async getPendingOperations(
    nodeId: string,
  ): Promise<CRDTOperation[]> {
    const operationsData = await this.redis.zrange(`crdt_log:${nodeId}`, 0, 99);
    return operationsData.map((data) => JSON.parse(data));
  }

  /**
   * Store simulation result
   */
  private async storeSimulationResult(result: SimulationResult): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO policy_leak_simulations (
        simulation_id, timestamp, source_node_id, target_node_id,
        operations_analyzed, violations, leakage_detected, risk_score,
        recommendations, summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        result.simulationId,
        result.timestamp,
        result.sourceNodeId,
        result.targetNodeId,
        result.operationsAnalyzed,
        JSON.stringify(result.violations),
        result.leakageDetected,
        result.riskScore,
        JSON.stringify(result.recommendations),
        JSON.stringify(result.summary),
      ],
    );

    // Cache in Redis
    await this.redis.setex(
      `sim:${result.simulationId}`,
      3600, // 1 hour
      JSON.stringify(result),
    );
  }

  /**
   * Add custom policy rule
   */
  addPolicyRule(rule: PolicyRule): void {
    this.policyRules.set(rule.ruleId, rule);
    logger.info('Policy rule added', { ruleId: rule.ruleId });
  }

  /**
   * Remove policy rule
   */
  removePolicyRule(ruleId: string): void {
    this.policyRules.delete(ruleId);
    logger.info('Policy rule removed', { ruleId });
  }

  /**
   * Get all policy rules
   */
  getPolicyRules(): PolicyRule[] {
    return Array.from(this.policyRules.values());
  }
}

// Export singleton
export const policyLeakSimulator = new PolicyLeakSimulator();
