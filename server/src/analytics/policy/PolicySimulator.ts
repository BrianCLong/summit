/**
 * Policy Simulator
 *
 * What-if analysis for policy changes. Simulates impact of proposed
 * policy modifications before deployment.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC8.1 (Change Control)
 *
 * @module analytics/policy/PolicySimulator
 */

import { v4 as uuidv4 } from 'uuid';
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

export interface PolicyChange {
  id: string;
  type: 'add' | 'modify' | 'remove';
  policyId?: string;
  ruleId?: string;
  before?: PolicyRuleSnapshot;
  after?: PolicyRuleSnapshot;
  description: string;
}

export interface PolicyRuleSnapshot {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'flag' | 'review';
  priority: number;
  resource: string;
  subjects: string[];
}

export interface SimulationRequest {
  tenantId: string;
  changes: PolicyChange[];
  testCases?: SimulationTestCase[];
  options?: SimulationOptions;
}

export interface SimulationTestCase {
  id: string;
  name: string;
  request: {
    subject: string;
    action: string;
    resource: string;
    context?: Record<string, unknown>;
  };
  expectedResult?: 'allow' | 'deny' | 'flag' | 'review';
}

export interface SimulationOptions {
  /** Include historical data analysis */
  analyzeHistorical: boolean;
  /** Number of historical requests to analyze */
  historicalSampleSize: number;
  /** Include access pattern analysis */
  analyzeAccessPatterns: boolean;
  /** Generate compliance impact report */
  assessCompliance: boolean;
}

export interface SimulationResult {
  id: string;
  tenantId: string;
  changes: PolicyChange[];
  timestamp: string;
  status: 'completed' | 'failed';
  summary: SimulationSummary;
  testResults: TestCaseResult[];
  historicalImpact?: HistoricalImpact;
  accessPatternChanges?: AccessPatternChange[];
  complianceImpact?: ComplianceImpact;
  riskAssessment: RiskAssessment;
  recommendations: string[];
  governanceVerdict: GovernanceVerdict;
}

export interface SimulationSummary {
  totalChanges: number;
  rulesAdded: number;
  rulesModified: number;
  rulesRemoved: number;
  testCasesPassed: number;
  testCasesFailed: number;
  estimatedAffectedRequests: number;
  overallRiskScore: number;
}

export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  beforeResult: 'allow' | 'deny' | 'flag' | 'review';
  afterResult: 'allow' | 'deny' | 'flag' | 'review';
  changed: boolean;
  matchedExpected: boolean;
  explanation: string;
}

export interface HistoricalImpact {
  sampleSize: number;
  periodDays: number;
  requestsAffected: number;
  percentageAffected: number;
  breakdown: {
    wouldBeAllowed: number;
    wouldBeDenied: number;
    wouldBeFlagged: number;
    wouldRequireReview: number;
  };
}

export interface AccessPatternChange {
  subject: string;
  resource: string;
  previousAccess: 'allow' | 'deny' | 'flag' | 'review';
  newAccess: 'allow' | 'deny' | 'flag' | 'review';
  frequency: 'high' | 'medium' | 'low';
  riskLevel: 'high' | 'medium' | 'low';
}

export interface ComplianceImpact {
  frameworksAffected: string[];
  controlsImpacted: Array<{
    controlId: string;
    controlName: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  overallComplianceScore: number;
  previousScore: number;
}

export interface RiskAssessment {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: RiskFactor[];
  mitigations: string[];
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'policy-simulator-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PolicySimulator',
  };
}

function calculateRiskScore(factors: RiskFactor[]): number {
  const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  const likelihoodMultipliers = { high: 1.0, medium: 0.6, low: 0.3 };

  let totalScore = 0;
  for (const factor of factors) {
    totalScore += severityScores[factor.severity] * likelihoodMultipliers[factor.likelihood];
  }

  return Math.min(100, totalScore);
}

function determineOverallRisk(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: SimulationOptions = {
  analyzeHistorical: true,
  historicalSampleSize: 1000,
  analyzeAccessPatterns: true,
  assessCompliance: true,
};

// ============================================================================
// Policy Evaluator (Simplified)
// ============================================================================

class PolicyEvaluator {
  private rules: PolicyRuleSnapshot[] = [];

  setRules(rules: PolicyRuleSnapshot[]): void {
    this.rules = rules.sort((a, b) => a.priority - b.priority);
  }

  evaluate(
    subject: string,
    action: string,
    resource: string,
    context?: Record<string, unknown>
  ): { result: 'allow' | 'deny' | 'flag' | 'review'; matchedRule?: PolicyRuleSnapshot } {
    for (const rule of this.rules) {
      if (this.matchesRule(rule, subject, action, resource, context)) {
        return { result: rule.action, matchedRule: rule };
      }
    }

    // Default deny if no rule matches
    return { result: 'deny' };
  }

  private matchesRule(
    rule: PolicyRuleSnapshot,
    subject: string,
    action: string,
    resource: string,
    context?: Record<string, unknown>
  ): boolean {
    // Check subject match
    if (!this.matchesSubject(rule.subjects, subject)) {
      return false;
    }

    // Check resource match
    if (!this.matchesResource(rule.resource, resource)) {
      return false;
    }

    // Check condition if present
    if (rule.condition && !this.evaluateCondition(rule.condition, { subject, action, resource, ...context })) {
      return false;
    }

    return true;
  }

  private matchesSubject(ruleSubjects: string[], subject: string): boolean {
    if (ruleSubjects.includes('*')) return true;
    return ruleSubjects.some(s => {
      if (s.endsWith('*')) {
        return subject.startsWith(s.slice(0, -1));
      }
      return s === subject;
    });
  }

  private matchesResource(ruleResource: string, resource: string): boolean {
    if (ruleResource === '*') return true;
    if (ruleResource.endsWith('*')) {
      return resource.startsWith(ruleResource.slice(0, -1));
    }
    return ruleResource === resource;
  }

  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    // Simplified condition evaluation
    // In production, use a proper expression evaluator
    try {
      // Simple key=value checks
      const checks = condition.split('&&').map(c => c.trim());
      for (const check of checks) {
        const [key, value] = check.split('=').map(s => s.trim());
        if (context[key] !== value && context[key] !== JSON.parse(value)) {
          return false;
        }
      }
      return true;
    } catch {
      return true; // Default to true if condition can't be parsed
    }
  }
}

// ============================================================================
// Policy Simulator
// ============================================================================

export class PolicySimulator {
  private evaluator: PolicyEvaluator;
  private historicalData: Map<string, Array<{
    subject: string;
    action: string;
    resource: string;
    result: string;
    timestamp: Date;
  }>> = new Map();

  constructor() {
    this.evaluator = new PolicyEvaluator();
    logger.info('PolicySimulator initialized');
  }

  /**
   * Run a simulation of policy changes
   */
  async simulate(request: SimulationRequest): Promise<DataEnvelope<SimulationResult>> {
    const simulationId = uuidv4();
    const options = { ...DEFAULT_OPTIONS, ...request.options };

    logger.info(
      {
        simulationId,
        tenantId: request.tenantId,
        changeCount: request.changes.length,
        testCaseCount: request.testCases?.length || 0,
      },
      'Starting policy simulation'
    );

    try {
      // Build before and after rule sets
      const { beforeRules, afterRules } = this.buildRuleSets(request.changes);

      // Run test cases
      const testResults = this.runTestCases(
        beforeRules,
        afterRules,
        request.testCases || []
      );

      // Analyze historical impact
      let historicalImpact: HistoricalImpact | undefined;
      if (options.analyzeHistorical) {
        historicalImpact = this.analyzeHistoricalImpact(
          request.tenantId,
          beforeRules,
          afterRules,
          options.historicalSampleSize
        );
      }

      // Analyze access patterns
      let accessPatternChanges: AccessPatternChange[] | undefined;
      if (options.analyzeAccessPatterns) {
        accessPatternChanges = this.analyzeAccessPatterns(
          request.tenantId,
          beforeRules,
          afterRules
        );
      }

      // Assess compliance impact
      let complianceImpact: ComplianceImpact | undefined;
      if (options.assessCompliance) {
        complianceImpact = this.assessComplianceImpact(request.changes);
      }

      // Perform risk assessment
      const riskAssessment = this.performRiskAssessment(
        request.changes,
        testResults,
        historicalImpact,
        accessPatternChanges
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        request.changes,
        testResults,
        riskAssessment
      );

      // Build summary
      const summary = this.buildSummary(
        request.changes,
        testResults,
        historicalImpact,
        riskAssessment
      );

      const result: SimulationResult = {
        id: simulationId,
        tenantId: request.tenantId,
        changes: request.changes,
        timestamp: new Date().toISOString(),
        status: 'completed',
        summary,
        testResults,
        historicalImpact,
        accessPatternChanges,
        complianceImpact,
        riskAssessment,
        recommendations,
        governanceVerdict: createVerdict(
          riskAssessment.overallRisk === 'critical' ? GovernanceResult.DENY :
          riskAssessment.overallRisk === 'high' ? GovernanceResult.FLAG :
          GovernanceResult.ALLOW,
          `Simulation complete: ${riskAssessment.overallRisk} risk`
        ),
      };

      logger.info(
        {
          simulationId,
          tenantId: request.tenantId,
          overallRisk: riskAssessment.overallRisk,
          testsPassed: summary.testCasesPassed,
          testsFailed: summary.testCasesFailed,
        },
        'Policy simulation completed'
      );

      return createDataEnvelope(result, {
        source: 'PolicySimulator',
        governanceVerdict: result.governanceVerdict,
        classification: DataClassification.CONFIDENTIAL,
      });

    } catch (error: any) {
      logger.error(
        { error, simulationId, tenantId: request.tenantId },
        'Policy simulation failed'
      );

      const failedResult: SimulationResult = {
        id: simulationId,
        tenantId: request.tenantId,
        changes: request.changes,
        timestamp: new Date().toISOString(),
        status: 'failed',
        summary: {
          totalChanges: request.changes.length,
          rulesAdded: 0,
          rulesModified: 0,
          rulesRemoved: 0,
          testCasesPassed: 0,
          testCasesFailed: 0,
          estimatedAffectedRequests: 0,
          overallRiskScore: 100,
        },
        testResults: [],
        riskAssessment: {
          overallRisk: 'critical',
          riskFactors: [{
            category: 'Simulation Error',
            description: `Simulation failed: ${error}`,
            severity: 'critical',
            likelihood: 'high',
          }],
          mitigations: ['Review and fix simulation configuration'],
        },
        recommendations: ['Unable to complete simulation - review changes manually'],
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Simulation failed'),
      };

      return createDataEnvelope(failedResult, {
        source: 'PolicySimulator',
        governanceVerdict: failedResult.governanceVerdict,
        classification: DataClassification.CONFIDENTIAL,
      });
    }
  }

  /**
   * Add historical data for analysis
   */
  addHistoricalData(
    tenantId: string,
    data: Array<{ subject: string; action: string; resource: string; result: string; timestamp: Date }>
  ): void {
    const existing = this.historicalData.get(tenantId) || [];
    this.historicalData.set(tenantId, [...existing, ...data].slice(-10000));
  }

  /**
   * Compare two policy versions
   */
  async comparePolicies(
    tenantId: string,
    beforeRules: PolicyRuleSnapshot[],
    afterRules: PolicyRuleSnapshot[],
    testCases: SimulationTestCase[]
  ): Promise<DataEnvelope<SimulationResult>> {
    const changes = this.detectChanges(beforeRules, afterRules);

    return this.simulate({
      tenantId,
      changes,
      testCases,
    });
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private buildRuleSets(changes: PolicyChange[]): {
    beforeRules: PolicyRuleSnapshot[];
    afterRules: PolicyRuleSnapshot[];
  } {
    const beforeRules: PolicyRuleSnapshot[] = [];
    const afterRules: PolicyRuleSnapshot[] = [];

    for (const change of changes) {
      if (change.before) {
        beforeRules.push(change.before);
      }
      if (change.after) {
        afterRules.push(change.after);
      }
    }

    return { beforeRules, afterRules };
  }

  private runTestCases(
    beforeRules: PolicyRuleSnapshot[],
    afterRules: PolicyRuleSnapshot[],
    testCases: SimulationTestCase[]
  ): TestCaseResult[] {
    const results: TestCaseResult[] = [];

    for (const testCase of testCases) {
      // Evaluate with before rules
      this.evaluator.setRules(beforeRules);
      const beforeEval = this.evaluator.evaluate(
        testCase.request.subject,
        testCase.request.action,
        testCase.request.resource,
        testCase.request.context
      );

      // Evaluate with after rules
      this.evaluator.setRules(afterRules);
      const afterEval = this.evaluator.evaluate(
        testCase.request.subject,
        testCase.request.action,
        testCase.request.resource,
        testCase.request.context
      );

      const changed = beforeEval.result !== afterEval.result;
      const matchedExpected = testCase.expectedResult
        ? afterEval.result === testCase.expectedResult
        : true;

      results.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        beforeResult: beforeEval.result,
        afterResult: afterEval.result,
        changed,
        matchedExpected,
        explanation: changed
          ? `Decision changed from ${beforeEval.result} to ${afterEval.result}`
          : `Decision unchanged: ${afterEval.result}`,
      });
    }

    return results;
  }

  private analyzeHistoricalImpact(
    tenantId: string,
    beforeRules: PolicyRuleSnapshot[],
    afterRules: PolicyRuleSnapshot[],
    sampleSize: number
  ): HistoricalImpact {
    const historical = this.historicalData.get(tenantId) || [];
    const sample = historical.slice(-sampleSize);

    if (sample.length === 0) {
      return {
        sampleSize: 0,
        periodDays: 0,
        requestsAffected: 0,
        percentageAffected: 0,
        breakdown: {
          wouldBeAllowed: 0,
          wouldBeDenied: 0,
          wouldBeFlagged: 0,
          wouldRequireReview: 0,
        },
      };
    }

    let affected = 0;
    const breakdown = {
      wouldBeAllowed: 0,
      wouldBeDenied: 0,
      wouldBeFlagged: 0,
      wouldRequireReview: 0,
    };

    for (const request of sample) {
      // Evaluate with before rules
      this.evaluator.setRules(beforeRules);
      const beforeResult = this.evaluator.evaluate(
        request.subject,
        request.action,
        request.resource
      );

      // Evaluate with after rules
      this.evaluator.setRules(afterRules);
      const afterResult = this.evaluator.evaluate(
        request.subject,
        request.action,
        request.resource
      );

      if (beforeResult.result !== afterResult.result) {
        affected++;
        switch (afterResult.result) {
          case 'allow': breakdown.wouldBeAllowed++; break;
          case 'deny': breakdown.wouldBeDenied++; break;
          case 'flag': breakdown.wouldBeFlagged++; break;
          case 'review': breakdown.wouldRequireReview++; break;
        }
      }
    }

    const periodDays = sample.length > 0
      ? Math.ceil((Date.now() - sample[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      sampleSize: sample.length,
      periodDays,
      requestsAffected: affected,
      percentageAffected: (affected / sample.length) * 100,
      breakdown,
    };
  }

  private analyzeAccessPatterns(
    tenantId: string,
    beforeRules: PolicyRuleSnapshot[],
    afterRules: PolicyRuleSnapshot[]
  ): AccessPatternChange[] {
    const changes: AccessPatternChange[] = [];
    const historical = this.historicalData.get(tenantId) || [];

    // Group by subject and resource
    const accessPatterns = new Map<string, { count: number; lastAccess: Date }>();
    for (const request of historical) {
      const key = `${request.subject}:${request.resource}`;
      const existing = accessPatterns.get(key) || { count: 0, lastAccess: new Date(0) };
      existing.count++;
      if (request.timestamp > existing.lastAccess) {
        existing.lastAccess = request.timestamp;
      }
      accessPatterns.set(key, existing);
    }

    // Check each pattern for changes
    for (const [key, pattern] of accessPatterns) {
      const [subject, resource] = key.split(':');

      this.evaluator.setRules(beforeRules);
      const beforeResult = this.evaluator.evaluate(subject, 'access', resource);

      this.evaluator.setRules(afterRules);
      const afterResult = this.evaluator.evaluate(subject, 'access', resource);

      if (beforeResult.result !== afterResult.result) {
        const frequency = pattern.count > 100 ? 'high' :
                         pattern.count > 10 ? 'medium' : 'low';

        const riskLevel = (beforeResult.result === 'allow' && afterResult.result === 'deny')
          ? 'high'
          : frequency === 'high' ? 'medium' : 'low';

        changes.push({
          subject,
          resource,
          previousAccess: beforeResult.result,
          newAccess: afterResult.result,
          frequency,
          riskLevel,
        });
      }
    }

    return changes.slice(0, 100); // Limit to top 100 changes
  }

  private assessComplianceImpact(changes: PolicyChange[]): ComplianceImpact {
    // Simplified compliance impact assessment
    // In production, this would integrate with the compliance engine

    const controlsImpacted: ComplianceImpact['controlsImpacted'] = [];

    for (const change of changes) {
      // Check for security-related changes
      if (change.after?.action === 'deny' && change.before?.action === 'allow') {
        controlsImpacted.push({
          controlId: 'CC6.1',
          controlName: 'Logical Access Security',
          impact: 'positive',
          description: 'Access restriction strengthens logical access controls',
        });
      }

      if (change.type === 'remove' && change.before?.action === 'deny') {
        controlsImpacted.push({
          controlId: 'CC6.1',
          controlName: 'Logical Access Security',
          impact: 'negative',
          description: 'Removing deny rules may weaken access controls',
        });
      }

      // Check for audit-related resources
      if (change.after?.resource.includes('audit') || change.before?.resource.includes('audit')) {
        controlsImpacted.push({
          controlId: 'CC7.2',
          controlName: 'System Monitoring',
          impact: change.after?.action === 'deny' ? 'positive' : 'negative',
          description: 'Changes to audit-related resources affect monitoring controls',
        });
      }
    }

    // Calculate overall score (simplified)
    const positiveImpacts = controlsImpacted.filter(c => c.impact === 'positive').length;
    const negativeImpacts = controlsImpacted.filter(c => c.impact === 'negative').length;
    const previousScore = 85; // Baseline
    const scoreChange = (positiveImpacts * 2) - (negativeImpacts * 5);

    return {
      frameworksAffected: ['SOC2', 'ISO27001'],
      controlsImpacted,
      overallComplianceScore: Math.max(0, Math.min(100, previousScore + scoreChange)),
      previousScore,
    };
  }

  private performRiskAssessment(
    changes: PolicyChange[],
    testResults: TestCaseResult[],
    historicalImpact?: HistoricalImpact,
    accessPatternChanges?: AccessPatternChange[]
  ): RiskAssessment {
    const riskFactors: RiskFactor[] = [];

    // Check for failed test cases
    const failedTests = testResults.filter(t => !t.matchedExpected);
    if (failedTests.length > 0) {
      riskFactors.push({
        category: 'Test Failures',
        description: `${failedTests.length} test case(s) did not match expected results`,
        severity: failedTests.length > 3 ? 'high' : 'medium',
        likelihood: 'high',
      });
    }

    // Check for high historical impact
    if (historicalImpact && historicalImpact.percentageAffected > 10) {
      riskFactors.push({
        category: 'Historical Impact',
        description: `${historicalImpact.percentageAffected.toFixed(1)}% of historical requests would be affected`,
        severity: historicalImpact.percentageAffected > 25 ? 'high' : 'medium',
        likelihood: 'high',
      });
    }

    // Check for removed deny rules
    const removedDenyRules = changes.filter(
      c => c.type === 'remove' && c.before?.action === 'deny'
    );
    if (removedDenyRules.length > 0) {
      riskFactors.push({
        category: 'Security Relaxation',
        description: `${removedDenyRules.length} deny rule(s) being removed`,
        severity: 'high',
        likelihood: 'high',
      });
    }

    // Check for wildcard additions
    const wildcardRules = changes.filter(
      c => c.after?.subjects.includes('*') || c.after?.resource === '*'
    );
    if (wildcardRules.length > 0) {
      riskFactors.push({
        category: 'Broad Access',
        description: `${wildcardRules.length} rule(s) with wildcard access`,
        severity: 'medium',
        likelihood: 'medium',
      });
    }

    // Check for high-frequency access pattern changes
    const highFreqChanges = accessPatternChanges?.filter(c => c.frequency === 'high') || [];
    if (highFreqChanges.length > 0) {
      riskFactors.push({
        category: 'High-Frequency Impact',
        description: `${highFreqChanges.length} high-frequency access patterns affected`,
        severity: 'medium',
        likelihood: 'high',
      });
    }

    const riskScore = calculateRiskScore(riskFactors);
    const overallRisk = determineOverallRisk(riskScore);

    // Generate mitigations
    const mitigations: string[] = [];
    if (failedTests.length > 0) {
      mitigations.push('Review and update test cases to reflect intended behavior');
    }
    if (removedDenyRules.length > 0) {
      mitigations.push('Document justification for removing deny rules');
      mitigations.push('Consider implementing compensating controls');
    }
    if (wildcardRules.length > 0) {
      mitigations.push('Consider more specific access patterns instead of wildcards');
    }
    if (historicalImpact && historicalImpact.breakdown.wouldBeDenied > 0) {
      mitigations.push('Communicate access changes to affected users');
    }

    return {
      overallRisk,
      riskFactors,
      mitigations,
    };
  }

  private generateRecommendations(
    changes: PolicyChange[],
    testResults: TestCaseResult[],
    riskAssessment: RiskAssessment
  ): string[] {
    const recommendations: string[] = [];

    // Based on risk level
    if (riskAssessment.overallRisk === 'critical') {
      recommendations.push('Do not deploy these changes without thorough review');
      recommendations.push('Schedule a security review before proceeding');
    } else if (riskAssessment.overallRisk === 'high') {
      recommendations.push('Consider a phased rollout with monitoring');
      recommendations.push('Prepare rollback plan before deployment');
    }

    // Based on test results
    const failedTests = testResults.filter(t => !t.matchedExpected);
    if (failedTests.length > 0) {
      recommendations.push(`Review ${failedTests.length} failed test case(s) before deployment`);
    }

    // Based on change types
    const hasRemovals = changes.some(c => c.type === 'remove');
    if (hasRemovals) {
      recommendations.push('Verify removed rules are no longer needed');
    }

    // Based on changes that alter access
    const accessChanges = testResults.filter(t => t.changed);
    if (accessChanges.length > 0) {
      recommendations.push(`Document access changes for ${accessChanges.length} scenario(s)`);
    }

    // Add mitigations as recommendations
    recommendations.push(...riskAssessment.mitigations);

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private buildSummary(
    changes: PolicyChange[],
    testResults: TestCaseResult[],
    historicalImpact: HistoricalImpact | undefined,
    riskAssessment: RiskAssessment
  ): SimulationSummary {
    return {
      totalChanges: changes.length,
      rulesAdded: changes.filter(c => c.type === 'add').length,
      rulesModified: changes.filter(c => c.type === 'modify').length,
      rulesRemoved: changes.filter(c => c.type === 'remove').length,
      testCasesPassed: testResults.filter(t => t.matchedExpected).length,
      testCasesFailed: testResults.filter(t => !t.matchedExpected).length,
      estimatedAffectedRequests: historicalImpact?.requestsAffected || 0,
      overallRiskScore: calculateRiskScore(riskAssessment.riskFactors),
    };
  }

  private detectChanges(
    beforeRules: PolicyRuleSnapshot[],
    afterRules: PolicyRuleSnapshot[]
  ): PolicyChange[] {
    const changes: PolicyChange[] = [];
    const beforeMap = new Map(beforeRules.map(r => [r.id, r]));
    const afterMap = new Map(afterRules.map(r => [r.id, r]));

    // Detect additions and modifications
    for (const [id, afterRule] of afterMap) {
      const beforeRule = beforeMap.get(id);
      if (!beforeRule) {
        changes.push({
          id: uuidv4(),
          type: 'add',
          ruleId: id,
          after: afterRule,
          description: `Added rule: ${afterRule.name}`,
        });
      } else if (JSON.stringify(beforeRule) !== JSON.stringify(afterRule)) {
        changes.push({
          id: uuidv4(),
          type: 'modify',
          ruleId: id,
          before: beforeRule,
          after: afterRule,
          description: `Modified rule: ${afterRule.name}`,
        });
      }
    }

    // Detect removals
    for (const [id, beforeRule] of beforeMap) {
      if (!afterMap.has(id)) {
        changes.push({
          id: uuidv4(),
          type: 'remove',
          ruleId: id,
          before: beforeRule,
          description: `Removed rule: ${beforeRule.name}`,
        });
      }
    }

    return changes;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: PolicySimulator | null = null;

export function getPolicySimulator(): PolicySimulator {
  if (!instance) {
    instance = new PolicySimulator();
  }
  return instance;
}

export default PolicySimulator;
