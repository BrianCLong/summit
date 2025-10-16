/**
 * Policy Digital-Twin Simulator
 * Simulates policy/security/economic effects before execution
 */

import { EventEmitter } from 'events';

export interface PolicyScenario {
  plan: string;
  changes: Array<{
    path: string;
    diff: string;
  }>;
  context: {
    region: string;
    tenant: string;
    budgets: Record<string, number>;
  };
  checks: string[];
}

export interface PolicySimulationResult {
  scenario: string;
  changes: Array<{
    path: string;
    diff: string;
  }>;
  context: {
    region: string;
    tenant: string;
    budgets: Record<string, number>;
  };
  opa: {
    denies: number;
    reasons: string[];
    rules: string[];
  };
  cost: {
    usd: number;
    predicted: boolean;
    breakdown: Record<string, number>;
  };
  pass: boolean;
  riskScore: number;
  recommendations: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  rego: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface OPAEvaluationResult {
  allow: boolean;
  deny: boolean;
  reasons: string[];
  violatedRules: string[];
  metadata: Record<string, any>;
}

export class PolicySimulator extends EventEmitter {
  private policyRules: Map<string, PolicyRule> = new Map();
  private costModels: Map<string, (context: any, changes: any[]) => number> =
    new Map();
  private simulationHistory: Array<{
    scenario: string;
    result: PolicySimulationResult;
    timestamp: number;
  }> = [];

  constructor() {
    super();
    this.initializePolicyRules();
    this.initializeCostModels();
  }

  private initializePolicyRules(): void {
    // IAM policy rules
    this.policyRules.set('iam-write-access', {
      id: 'iam-write-access',
      name: 'IAM Write Access Control',
      rego: `
        package iam
        
        deny[msg] {
          input.action == "write"
          input.path == "/etc/passwd"
          msg := "Write access to system files denied"
        }
        
        deny[msg] {
          input.action == "write"
          startswith(input.path, "/root/")
          not input.user.admin
          msg := "Non-admin write access to root directory denied"
        }
      `,
      severity: 'critical',
      enabled: true,
    });

    // Budget policy rules
    this.policyRules.set('budget-limits', {
      id: 'budget-limits',
      name: 'Budget Enforcement',
      rego: `
        package budget
        
        deny[msg] {
          input.cost.usd > input.context.budgets.usd
          msg := sprintf("Cost %v exceeds budget %v", [input.cost.usd, input.context.budgets.usd])
        }
        
        deny[msg] {
          input.cost.ci_mins > input.context.budgets.ci_mins
          msg := sprintf("CI minutes %v exceed budget %v", [input.cost.ci_mins, input.context.budgets.ci_mins])
        }
      `,
      severity: 'high',
      enabled: true,
    });

    // Data residency rules
    this.policyRules.set('data-residency', {
      id: 'data-residency',
      name: 'Data Residency Compliance',
      rego: `
        package residency
        
        deny[msg] {
          input.data.type == "pii"
          input.context.region == "eu-west"
          not startswith(input.storage.location, "eu-")
          msg := "PII data must be stored in EU for EU region"
        }
      `,
      severity: 'critical',
      enabled: true,
    });

    // Model access rules
    this.policyRules.set('model-caps', {
      id: 'model-caps',
      name: 'Model Access Limits',
      rego: `
        package models
        
        deny[msg] {
          input.action == "model_call"
          input.model.size == "large"
          input.context.tenant == "trial"
          msg := "Trial tenants cannot access large models"
        }
        
        deny[msg] {
          input.action == "model_call"
          input.tokens > 100000
          not input.context.tenant == "enterprise"
          msg := "High token usage requires enterprise tier"
        }
      `,
      severity: 'medium',
      enabled: true,
    });
  }

  private initializeCostModels(): void {
    // LLM cost model
    this.costModels.set('llm', (context: any, changes: any[]) => {
      const baseTokens = changes.length * 1000; // 1k tokens per change
      const tokenCost = 0.002; // $0.002 per 1k tokens
      return (baseTokens * tokenCost) / 1000;
    });

    // CI cost model
    this.costModels.set('ci', (context: any, changes: any[]) => {
      const baseMinutes = changes.length * 2; // 2 minutes per change
      const minuteCost = 0.008; // $0.008 per minute
      return baseMinutes * minuteCost;
    });

    // Storage cost model
    this.costModels.set('storage', (context: any, changes: any[]) => {
      const storageMB = changes.length * 10; // 10MB per change
      const storageCost = 0.000023; // $0.000023 per MB per month
      return storageMB * storageCost;
    });

    // Network cost model
    this.costModels.set('network', (context: any, changes: any[]) => {
      const transferGB = changes.length * 0.1; // 100MB per change
      const transferCost = 0.09; // $0.09 per GB
      return transferGB * transferCost;
    });
  }

  /**
   * Simulate policy and cost impacts of a scenario
   */
  async simulate(scenario: PolicyScenario): Promise<PolicySimulationResult> {
    try {
      // Run OPA evaluation
      const opaResult = await this.evaluateOPA(scenario);

      // Calculate cost predictions
      const costResult = await this.predictCosts(scenario);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(
        scenario,
        opaResult,
        costResult,
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        scenario,
        opaResult,
        costResult,
        riskScore,
      );

      const result: PolicySimulationResult = {
        scenario: scenario.plan,
        changes: scenario.changes,
        context: scenario.context,
        opa: {
          denies: opaResult.violatedRules.length,
          reasons: opaResult.reasons,
          rules: opaResult.violatedRules,
        },
        cost: costResult,
        pass: opaResult.allow && costResult.usd <= scenario.context.budgets.usd,
        riskScore,
        recommendations,
      };

      // Store simulation history
      this.simulationHistory.push({
        scenario: scenario.plan,
        result,
        timestamp: Date.now(),
      });

      // Emit events
      if (!result.pass) {
        this.emit('violationPredicted', result);
      }

      this.emit('simulationComplete', result);
      return result;
    } catch (error) {
      this.emit('simulationError', {
        scenario: scenario.plan,
        error: error.message,
      });
      throw error;
    }
  }

  private async evaluateOPA(
    scenario: PolicyScenario,
  ): Promise<OPAEvaluationResult> {
    const input = {
      action: this.inferAction(scenario.changes),
      context: scenario.context,
      changes: scenario.changes,
      cost: await this.predictCosts(scenario),
    };

    const violatedRules: string[] = [];
    const reasons: string[] = [];

    // Evaluate each enabled policy rule
    for (const [ruleId, rule] of this.policyRules) {
      if (!rule.enabled) continue;

      const violation = await this.evaluateRule(rule, input);
      if (violation) {
        violatedRules.push(ruleId);
        reasons.push(`${rule.name}: ${violation}`);
      }
    }

    return {
      allow: violatedRules.length === 0,
      deny: violatedRules.length > 0,
      reasons,
      violatedRules,
      metadata: {
        rulesEvaluated: this.policyRules.size,
        inputSize: JSON.stringify(input).length,
      },
    };
  }

  private async evaluateRule(
    rule: PolicyRule,
    input: any,
  ): Promise<string | null> {
    // Mock OPA evaluation - in reality would use @open-policy-agent/opa-wasm
    // For now, implement key rules directly

    switch (rule.id) {
      case 'iam-write-access':
        if (
          input.action === 'write' &&
          input.changes.some((c: any) => c.path.includes('passwd'))
        ) {
          return 'Write access to system files denied';
        }
        break;

      case 'budget-limits':
        if (input.cost.usd > input.context.budgets.usd) {
          return `Cost ${input.cost.usd} exceeds budget ${input.context.budgets.usd}`;
        }
        break;

      case 'data-residency':
        if (
          input.context.region === 'eu-west' &&
          input.changes.some((c: any) => c.path.includes('pii')) &&
          !input.context.region.startsWith('eu-')
        ) {
          return 'PII data must be stored in EU for EU region';
        }
        break;

      case 'model-caps':
        if (
          input.action === 'model_call' &&
          input.context.tenant === 'trial' &&
          input.changes.some((c: any) => c.path.includes('large-model'))
        ) {
          return 'Trial tenants cannot access large models';
        }
        break;
    }

    return null; // No violation
  }

  private inferAction(changes: Array<{ path: string; diff: string }>): string {
    // Infer action type from changes
    if (
      changes.some((c) => c.path.includes('policy') || c.path.includes('auth'))
    ) {
      return 'policy_change';
    }
    if (
      changes.some((c) => c.path.includes('model') || c.path.includes('ai'))
    ) {
      return 'model_call';
    }
    if (changes.some((c) => c.diff.includes('+'))) {
      return 'write';
    }
    return 'read';
  }

  private async predictCosts(scenario: PolicyScenario): Promise<{
    usd: number;
    predicted: boolean;
    breakdown: Record<string, number>;
  }> {
    const breakdown: Record<string, number> = {};
    let totalUSD = 0;

    // Calculate costs using different models
    for (const [modelName, costModel] of this.costModels) {
      const cost = costModel(scenario.context, scenario.changes);
      breakdown[modelName] = cost;
      totalUSD += cost;
    }

    // Add region-specific multipliers
    const regionMultiplier = this.getRegionCostMultiplier(
      scenario.context.region,
    );
    totalUSD *= regionMultiplier;

    return {
      usd: Math.round(totalUSD * 100) / 100, // Round to 2 decimal places
      predicted: true,
      breakdown,
    };
  }

  private getRegionCostMultiplier(region: string): number {
    const multipliers: Record<string, number> = {
      'us-east-1': 1.0,
      'us-west-2': 1.05,
      'eu-west-1': 1.15,
      'ap-southeast-1': 1.2,
      'ap-northeast-1': 1.25,
    };
    return multipliers[region] || 1.1; // Default 10% premium for unknown regions
  }

  private calculateRiskScore(
    scenario: PolicyScenario,
    opaResult: OPAEvaluationResult,
    costResult: any,
  ): number {
    let risk = 0;

    // Policy violation risk
    if (opaResult.violatedRules.length > 0) {
      risk += 0.4;

      // Critical violations increase risk more
      for (const ruleId of opaResult.violatedRules) {
        const rule = this.policyRules.get(ruleId);
        if (rule?.severity === 'critical') risk += 0.2;
        else if (rule?.severity === 'high') risk += 0.1;
      }
    }

    // Cost overrun risk
    const costRatio = costResult.usd / (scenario.context.budgets.usd || 1);
    if (costRatio > 1) {
      risk += Math.min(0.3, (costRatio - 1) * 0.5);
    }

    // Change volume risk
    const changeCount = scenario.changes.length;
    if (changeCount > 10) {
      risk += Math.min(0.2, (changeCount - 10) * 0.01);
    }

    // Critical path risk
    const criticalPaths = ['auth/', 'security/', 'policy/', 'admin/'];
    if (
      scenario.changes.some((c) =>
        criticalPaths.some((cp) => c.path.includes(cp)),
      )
    ) {
      risk += 0.15;
    }

    return Math.min(1.0, risk);
  }

  private generateRecommendations(
    scenario: PolicyScenario,
    opaResult: OPAEvaluationResult,
    costResult: any,
    riskScore: number,
  ): string[] {
    const recommendations: string[] = [];

    // Policy recommendations
    if (opaResult.violatedRules.length > 0) {
      recommendations.push('Address policy violations before proceeding');
      recommendations.push('Consider alternative implementation approaches');

      if (opaResult.violatedRules.includes('iam-write-access')) {
        recommendations.push(
          'Use service accounts instead of direct file access',
        );
      }
      if (opaResult.violatedRules.includes('budget-limits')) {
        recommendations.push(
          'Optimize implementation to reduce resource usage',
        );
      }
    }

    // Cost recommendations
    if (costResult.usd > scenario.context.budgets.usd * 0.8) {
      recommendations.push('Consider cost optimization strategies');
      recommendations.push('Evaluate if all changes are necessary in this PR');
    }

    // Risk recommendations
    if (riskScore > 0.6) {
      recommendations.push('High risk detected - consider additional testing');
      recommendations.push('Implement feature flags for safer rollout');
      recommendations.push('Add extra monitoring and alerting');
    }

    // Change volume recommendations
    if (scenario.changes.length > 15) {
      recommendations.push('Consider breaking this into smaller, focused PRs');
    }

    if (recommendations.length === 0) {
      recommendations.push('All checks passed - PR is ready for review');
    }

    return recommendations;
  }

  /**
   * Run policy mutation testing to verify rule effectiveness
   */
  async runMutationTest(): Promise<{
    coverage: number;
    mutations: number;
    failures: number;
  }> {
    const mutations = [];
    let failures = 0;

    // Generate policy mutations
    for (const [ruleId, rule] of this.policyRules) {
      if (!rule.enabled) continue;

      const mutatedRules = this.generatePolicyMutations(rule);
      mutations.push(...mutatedRules);
    }

    // Test each mutation
    for (const mutation of mutations) {
      const survived = await this.testPolicyMutation(mutation);
      if (survived) {
        failures++;
        this.emit('policyMutationSurvived', {
          mutation,
          ruleId: mutation.originalId,
        });
      }
    }

    const coverage =
      mutations.length > 0
        ? (mutations.length - failures) / mutations.length
        : 1;

    return {
      coverage,
      mutations: mutations.length,
      failures,
    };
  }

  private generatePolicyMutations(
    rule: PolicyRule,
  ): Array<PolicyRule & { originalId: string }> {
    const mutations = [];

    // Mutation 1: Change comparison operators
    const mutation1 = {
      ...rule,
      id: `${rule.id}_mut_1`,
      originalId: rule.id,
      rego: rule.rego.replace(/>/g, '>=').replace(/</g, '<='),
    };
    mutations.push(mutation1);

    // Mutation 2: Change string matching
    const mutation2 = {
      ...rule,
      id: `${rule.id}_mut_2`,
      originalId: rule.id,
      rego: rule.rego.replace(/startswith\(/g, 'contains('),
    };
    mutations.push(mutation2);

    // Mutation 3: Flip boolean conditions
    const mutation3 = {
      ...rule,
      id: `${rule.id}_mut_3`,
      originalId: rule.id,
      rego: rule.rego.replace(/not /g, '').replace(/== "write"/g, '== "read"'),
    };
    mutations.push(mutation3);

    return mutations;
  }

  private async testPolicyMutation(
    mutation: PolicyRule & { originalId: string },
  ): Promise<boolean> {
    // Test scenarios that should fail with the original rule
    const testScenarios = this.generateTestScenarios(mutation.originalId);

    for (const testScenario of testScenarios) {
      // Temporarily replace rule for testing
      const originalRule = this.policyRules.get(mutation.originalId);
      this.policyRules.set(mutation.originalId, mutation);

      try {
        const result = await this.simulate(testScenario);

        // If mutation allows what should be denied, it survived (bad)
        if (result.pass && !testScenario.shouldPass) {
          this.policyRules.set(mutation.originalId, originalRule!);
          return true; // Mutation survived
        }
      } catch (error) {
        // Restore original rule and continue
        this.policyRules.set(mutation.originalId, originalRule!);
        continue;
      }

      // Restore original rule
      this.policyRules.set(mutation.originalId, originalRule!);
    }

    return false; // Mutation was killed (good)
  }

  private generateTestScenarios(
    ruleId: string,
  ): Array<PolicyScenario & { shouldPass: boolean }> {
    const scenarios = [];

    switch (ruleId) {
      case 'iam-write-access':
        scenarios.push({
          plan: 'test-iam-violation',
          changes: [{ path: '/etc/passwd', diff: '+password_change' }],
          context: {
            region: 'us-east-1',
            tenant: 'test',
            budgets: { usd: 10, ci_mins: 50 },
          },
          checks: ['opa'],
          shouldPass: false,
        });
        break;

      case 'budget-limits':
        scenarios.push({
          plan: 'test-budget-violation',
          changes: [
            { path: 'expensive-operation.ts', diff: '+large_model_call' },
          ],
          context: {
            region: 'us-east-1',
            tenant: 'test',
            budgets: { usd: 0.1, ci_mins: 1 },
          },
          checks: ['opa'],
          shouldPass: false,
        });
        break;
    }

    return scenarios;
  }

  /**
   * Get simulation history
   */
  getSimulationHistory(): Array<{
    scenario: string;
    result: PolicySimulationResult;
    timestamp: number;
  }> {
    return this.simulationHistory;
  }

  /**
   * Get policy rules
   */
  getPolicyRules(): Map<string, PolicyRule> {
    return this.policyRules;
  }

  /**
   * Enable/disable policy rule
   */
  setPolicyRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.policyRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.emit('policyRuleToggled', { ruleId, enabled });
    }
  }

  /**
   * Add custom policy rule
   */
  addPolicyRule(rule: PolicyRule): void {
    this.policyRules.set(rule.id, rule);
    this.emit('policyRuleAdded', rule);
  }
}

export default PolicySimulator;
