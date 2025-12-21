// Policy Explanation Service for Router Decisions
// Provides detailed explanations of routing decisions and policy enforcement

import { RouterQuery, RouterResponse } from './router-v2';
import { ExpertArm } from '../learn/bandit';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'allow' | 'deny' | 'route_to' | 'require_approval';
  priority: number;
  metadata?: Record<string, any>;
}

export interface DecisionTrace {
  queryId: string;
  timestamp: Date;
  rulePath: PolicyRule[];
  inputs: {
    query: RouterQuery;
    availableExperts: ExpertArm[];
    contextFactors: Record<string, any>;
  };
  decision: {
    selectedExpert: ExpertArm;
    reason: string;
    confidence: number;
    alternatives: Array<{
      expert: ExpertArm;
      score: number;
      rejectionReason?: string;
    }>;
  };
  policyEvaluations: Array<{
    rule: PolicyRule;
    matched: boolean;
    evaluation: any;
    result: 'allow' | 'deny' | 'modify';
  }>;
  costAnalysis: {
    estimatedCost: number;
    budgetRemaining: number;
    costFactors: Record<string, number>;
  };
  performanceMetrics: {
    latencyEstimate: number;
    reliabilityScore: number;
    capacityAvailable: boolean;
  };
}

export interface PolicySimulation {
  originalDecision: DecisionTrace;
  simulatedRules: PolicyRule[];
  simulatedDecision: DecisionTrace;
  impact: {
    expertChanged: boolean;
    costDelta: number;
    latencyDelta: number;
    riskDelta: number;
  };
}

export class PolicyExplainer {
  private rules: Map<string, PolicyRule> = new Map();
  private decisionHistory: Map<string, DecisionTrace> = new Map();

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    const defaultRules: PolicyRule[] = [
      {
        id: 'pii-restriction',
        name: 'PII Data Restriction',
        description: 'Restrict PII data to sovereign/local models only',
        condition: 'query.containsPII === true',
        action: 'route_to',
        priority: 100,
        metadata: { allowedExperts: ['local-llm', 'sovereign-ai'] },
      },
      {
        id: 'cost-budget',
        name: 'Cost Budget Enforcement',
        description: 'Enforce per-tenant cost budgets',
        condition: 'tenant.budgetRemaining > estimatedCost',
        action: 'allow',
        priority: 90,
      },
      {
        id: 'sensitivity-classification',
        name: 'Sensitivity Classification',
        description: 'Route based on data sensitivity level',
        condition: 'context.sensitivity === "secret"',
        action: 'route_to',
        priority: 95,
        metadata: { allowedExperts: ['local-llm'] },
      },
      {
        id: 'emergency-override',
        name: 'Emergency Override',
        description: 'Allow emergency queries to bypass normal restrictions',
        condition: 'context.urgency === "high" && user.hasEmergencyRole',
        action: 'allow',
        priority: 110,
      },
    ];

    defaultRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  async explainDecision(queryId: string): Promise<DecisionTrace | null> {
    return this.decisionHistory.get(queryId) || null;
  }

  async traceDecision(
    query: RouterQuery,
    response: RouterResponse,
    availableExperts: ExpertArm[],
    contextFactors: Record<string, any>,
  ): Promise<DecisionTrace> {
    const trace: DecisionTrace = {
      queryId: query.id,
      timestamp: new Date(),
      rulePath: [],
      inputs: {
        query,
        availableExperts,
        contextFactors,
      },
      decision: {
        selectedExpert: response.selectedExpert,
        reason: response.routingReason,
        confidence: response.confidence,
        alternatives: response.fallbackChain.map((expert, index) => ({
          expert,
          score: response.confidence * (0.8 - index * 0.1),
          rejectionReason:
            index > 0 ? 'Lower priority in fallback chain' : undefined,
        })),
      },
      policyEvaluations: await this.evaluateAllRules(query, contextFactors),
      costAnalysis: {
        estimatedCost: response.estimatedCost,
        budgetRemaining: contextFactors.budgetRemaining || 1000,
        costFactors: {
          baseModelCost: response.estimatedCost * 0.8,
          computeOverhead: response.estimatedCost * 0.15,
          infraCost: response.estimatedCost * 0.05,
        },
      },
      performanceMetrics: {
        latencyEstimate: response.estimatedLatency,
        reliabilityScore: response.selectedExpert.reliability || 0.95,
        capacityAvailable: contextFactors.capacityAvailable !== false,
      },
    };

    // Build rule path
    trace.rulePath = this.buildRulePath(trace.policyEvaluations);

    // Store decision trace
    this.decisionHistory.set(query.id, trace);

    return trace;
  }

  async simulateWhatIf(
    queryId: string,
    proposedRules: PolicyRule[],
  ): Promise<PolicySimulation | null> {
    const originalTrace = this.decisionHistory.get(queryId);
    if (!originalTrace) return null;

    // Temporarily add proposed rules
    const originalRules = new Map(this.rules);
    proposedRules.forEach((rule) => this.rules.set(rule.id, rule));

    try {
      // Re-evaluate with new rules
      const simulatedEvaluations = await this.evaluateAllRules(
        originalTrace.inputs.query,
        originalTrace.inputs.contextFactors,
      );

      // Create simulated decision trace
      const simulatedTrace: DecisionTrace = {
        ...originalTrace,
        timestamp: new Date(),
        policyEvaluations: simulatedEvaluations,
        rulePath: this.buildRulePath(simulatedEvaluations),
      };

      // Calculate impact
      const impact = {
        expertChanged:
          originalTrace.decision.selectedExpert.id !==
          simulatedTrace.decision.selectedExpert.id,
        costDelta:
          simulatedTrace.costAnalysis.estimatedCost -
          originalTrace.costAnalysis.estimatedCost,
        latencyDelta:
          simulatedTrace.performanceMetrics.latencyEstimate -
          originalTrace.performanceMetrics.latencyEstimate,
        riskDelta: this.calculateRiskDelta(originalTrace, simulatedTrace),
      };

      return {
        originalDecision: originalTrace,
        simulatedRules: proposedRules,
        simulatedDecision: simulatedTrace,
        impact,
      };
    } finally {
      // Restore original rules
      this.rules = originalRules;
    }
  }

  private async evaluateAllRules(
    query: RouterQuery,
    contextFactors: Record<string, any>,
  ): Promise<
    Array<{
      rule: PolicyRule;
      matched: boolean;
      evaluation: any;
      result: 'allow' | 'deny' | 'modify';
    }>
  > {
    const evaluations = [];
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      const evaluation = this.evaluateRule(rule, query, contextFactors);
      evaluations.push({
        rule,
        matched: evaluation.matched,
        evaluation: evaluation.context,
        result: evaluation.result,
      });
    }

    return evaluations;
  }

  private evaluateRule(
    rule: PolicyRule,
    query: RouterQuery,
    contextFactors: Record<string, any>,
  ): { matched: boolean; result: 'allow' | 'deny' | 'modify'; context: any } {
    // Simple rule evaluation logic - in production, use a proper rule engine
    const context = { query, contextFactors, rule };

    try {
      let matched = false;

      // Basic pattern matching for demo rules
      switch (rule.id) {
        case 'pii-restriction':
          matched = this.containsPII(query.query);
          break;
        case 'cost-budget':
          matched =
            (contextFactors.budgetRemaining || 1000) >
            (contextFactors.estimatedCost || 0);
          break;
        case 'sensitivity-classification':
          matched = query.context.sensitivity === 'secret';
          break;
        case 'emergency-override':
          matched =
            query.context.urgency === 'high' &&
            (contextFactors.hasEmergencyRole || false);
          break;
        default:
          matched = false;
      }

      let result: 'allow' | 'deny' | 'modify' = 'allow';
      if (matched) {
        switch (rule.action) {
          case 'deny':
            result = 'deny';
            break;
          case 'route_to':
          case 'require_approval':
            result = 'modify';
            break;
          default:
            result = 'allow';
        }
      }

      return { matched, result, context };
    } catch (error) {
      return {
        matched: false,
        result: 'allow',
        context: { error: error.message },
      };
    }
  }

  private containsPII(text: string): boolean {
    // Simple PII detection - in production, use proper PII detection
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/i, // Email
      /\b\d{16}\b/, // Credit card
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP address
    ];

    return piiPatterns.some((pattern) => pattern.test(text));
  }

  private buildRulePath(
    evaluations: Array<{
      rule: PolicyRule;
      matched: boolean;
      evaluation: any;
      result: 'allow' | 'deny' | 'modify';
    }>,
  ): PolicyRule[] {
    return evaluations
      .filter((eval) => eval.matched && eval.result !== 'allow')
      .map((eval) => eval.rule)
      .sort((a, b) => b.priority - a.priority);
  }

  private calculateRiskDelta(
    original: DecisionTrace,
    simulated: DecisionTrace,
  ): number {
    // Simple risk calculation - in production, use proper risk modeling
    const originalRisk = this.calculateRisk(original);
    const simulatedRisk = this.calculateRisk(simulated);
    return simulatedRisk - originalRisk;
  }

  private calculateRisk(trace: DecisionTrace): number {
    let risk = 0;

    // Cost risk
    if (
      trace.costAnalysis.estimatedCost >
      trace.costAnalysis.budgetRemaining * 0.8
    ) {
      risk += 0.3;
    }

    // Performance risk
    if (trace.performanceMetrics.latencyEstimate > 5000) {
      risk += 0.2;
    }

    // Reliability risk
    if (trace.performanceMetrics.reliabilityScore < 0.95) {
      risk += 0.2;
    }

    // Policy violations
    const violations = trace.policyEvaluations.filter(
      (eval) => eval.result === 'deny',
    ).length;
    risk += violations * 0.1;

    return Math.min(risk, 1.0);
  }

  // API endpoints for UI integration
  async getPolicyExplanationAPI(queryId: string) {
    const trace = await this.explainDecision(queryId);
    if (!trace) return null;

    return {
      queryId: trace.queryId,
      timestamp: trace.timestamp,
      decision: {
        selectedExpert: trace.decision.selectedExpert.name,
        reason: trace.decision.reason,
        confidence: `${(trace.decision.confidence * 100).toFixed(1)}%`,
        alternatives: trace.decision.alternatives.map((alt) => ({
          expert: alt.expert.name,
          score: `${(alt.score * 100).toFixed(1)}%`,
          rejectionReason: alt.rejectionReason,
        })),
      },
      rulePath: trace.rulePath.map((rule) => ({
        name: rule.name,
        description: rule.description,
        action: rule.action,
        priority: rule.priority,
      })),
      policyEvaluations: trace.policyEvaluations.map((eval) => ({
        ruleName: eval.rule.name,
        matched: eval.matched,
        result: eval.result,
        description: eval.rule.description,
      })),
      costBreakdown: trace.costAnalysis,
      performanceMetrics: trace.performanceMetrics,
    };
  }

  async simulateWhatIfAPI(queryId: string, proposedChanges: any) {
    const simulation = await this.simulateWhatIf(
      queryId,
      proposedChanges.rules || [],
    );
    if (!simulation) return null;

    return {
      impact: {
        expertWouldChange: simulation.impact.expertChanged,
        costDelta: `${simulation.impact.costDelta >= 0 ? '+' : ''}${simulation.impact.costDelta.toFixed(2)}`,
        latencyDelta: `${simulation.impact.latencyDelta >= 0 ? '+' : ''}${simulation.impact.latencyDelta}ms`,
        riskDelta: `${simulation.impact.riskDelta >= 0 ? '+' : ''}${(simulation.impact.riskDelta * 100).toFixed(1)}%`,
      },
      newDecision: {
        expert: simulation.simulatedDecision.decision.selectedExpert.name,
        reason: simulation.simulatedDecision.decision.reason,
        confidence: `${(simulation.simulatedDecision.decision.confidence * 100).toFixed(1)}%`,
      },
    };
  }
}

export const policyExplainer = new PolicyExplainer();
