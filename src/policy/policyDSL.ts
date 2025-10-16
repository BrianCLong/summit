interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'allow' | 'warn' | 'block';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  exemptions?: string[];
}

interface PolicyEvaluation {
  rule: PolicyRule;
  matched: boolean;
  reason: string;
  evidence: string[];
  action: 'allow' | 'warn' | 'block';
}

interface PolicyContext {
  pr: {
    author: string;
    title: string;
    files: string[];
    additions: number;
    deletions: number;
    branch: string;
    baseBranch: string;
  };
  checks: {
    testsPass: boolean;
    lintsPass: boolean;
    buildsPass: boolean;
    securityPass: boolean;
  };
  risk: {
    score: number;
    factors: string[];
  };
  timing: {
    hour: number;
    day: number; // 0 = Sunday
    isHoliday: boolean;
  };
}

export class PolicyEngine {
  private rules: Map<string, PolicyRule>;

  constructor() {
    this.rules = new Map();
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Size-based policies
    this.addRule({
      id: 'max-pr-size',
      name: 'Maximum PR Size',
      description: 'Prevent overly large PRs that are hard to review',
      condition: 'pr.additions + pr.deletions > 800',
      action: 'warn',
      severity: 'medium',
      reason:
        'Large PRs are harder to review and more likely to contain bugs. Consider breaking into smaller changes.',
      exemptions: ['hotfix/', 'migration/', 'generated/'],
    });

    this.addRule({
      id: 'massive-pr-block',
      name: 'Massive PR Block',
      description: 'Block extremely large PRs',
      condition: 'pr.additions + pr.deletions > 2000',
      action: 'block',
      severity: 'high',
      reason:
        'Extremely large PRs cannot be effectively reviewed. Must be broken down.',
      exemptions: ['data-migration/', 'vendor-update/'],
    });

    // Quality gates
    this.addRule({
      id: 'tests-required',
      name: 'Tests Required',
      description: 'All PRs must pass tests',
      condition: 'checks.testsPass === false',
      action: 'block',
      severity: 'high',
      reason:
        'All tests must pass before merging to maintain code quality and prevent regressions.',
    });

    this.addRule({
      id: 'lint-required',
      name: 'Lint Required',
      description: 'All PRs must pass linting',
      condition: 'checks.lintsPass === false',
      action: 'warn',
      severity: 'medium',
      reason:
        'Code should follow established style guidelines for consistency and maintainability.',
    });

    // Security policies
    this.addRule({
      id: 'security-files',
      name: 'Security File Changes',
      description: 'Security-related files require special review',
      condition:
        'pr.files.some(f => f.includes("auth") || f.includes("security") || f.includes("password"))',
      action: 'warn',
      severity: 'high',
      reason:
        'Changes to security-critical files require additional security review to prevent vulnerabilities.',
    });

    this.addRule({
      id: 'env-changes',
      name: 'Environment Changes',
      description: 'Environment file changes need careful review',
      condition:
        'pr.files.some(f => f.includes(".env") || f.includes("config"))',
      action: 'warn',
      severity: 'medium',
      reason:
        'Configuration changes can affect system behavior and should be reviewed carefully.',
    });

    // Timing policies
    this.addRule({
      id: 'no-friday-deployments',
      name: 'No Friday Deployments',
      description: 'Avoid risky deployments on Friday afternoons',
      condition: 'timing.day === 5 && timing.hour >= 15',
      action: 'warn',
      severity: 'medium',
      reason:
        'Friday afternoon deployments can cause weekend incidents when support is limited.',
    });

    this.addRule({
      id: 'no-weekend-deployments',
      name: 'No Weekend Deployments',
      description: 'Block weekend deployments unless hotfix',
      condition:
        '(timing.day === 0 || timing.day === 6) && !pr.branch.startsWith("hotfix/")',
      action: 'block',
      severity: 'medium',
      reason:
        'Weekend deployments should be avoided unless they are critical hotfixes.',
    });

    // Risk-based policies
    this.addRule({
      id: 'high-risk-review',
      name: 'High Risk Review Required',
      description: 'High-risk changes need manual review',
      condition: 'risk.score > 75',
      action: 'warn',
      severity: 'high',
      reason:
        'High-risk changes require thorough manual review to prevent potential issues.',
    });

    this.addRule({
      id: 'critical-risk-block',
      name: 'Critical Risk Block',
      description: 'Block extremely risky changes',
      condition: 'risk.score > 90',
      action: 'block',
      severity: 'critical',
      reason:
        'Extremely high-risk changes must be redesigned or broken down before proceeding.',
    });

    // Database policies
    this.addRule({
      id: 'migration-review',
      name: 'Database Migration Review',
      description: 'Database migrations need special attention',
      condition:
        'pr.files.some(f => f.includes("migration") || f.includes("schema"))',
      action: 'warn',
      severity: 'high',
      reason:
        'Database migrations can cause data loss and downtime. Require DBA review and rollback plan.',
    });

    // Dependency policies
    this.addRule({
      id: 'dependency-updates',
      name: 'Dependency Update Review',
      description: 'Dependency updates need security review',
      condition:
        'pr.files.some(f => f.includes("package.json") || f.includes("requirements.txt"))',
      action: 'warn',
      severity: 'medium',
      reason:
        'Dependency updates can introduce security vulnerabilities or breaking changes.',
    });
  }

  addRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  updateRule(id: string, updates: Partial<PolicyRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    this.rules.set(id, { ...rule, ...updates });
    return true;
  }

  async evaluate(context: PolicyContext): Promise<{
    allowed: boolean;
    evaluations: PolicyEvaluation[];
    blockers: PolicyEvaluation[];
    warnings: PolicyEvaluation[];
    summary: string;
  }> {
    const evaluations: PolicyEvaluation[] = [];

    for (const rule of this.rules.values()) {
      try {
        const evaluation = await this.evaluateRule(rule, context);
        evaluations.push(evaluation);
      } catch (error) {
        console.warn(`Failed to evaluate rule ${rule.id}:`, error.message);
        evaluations.push({
          rule,
          matched: false,
          reason: `Evaluation failed: ${error.message}`,
          evidence: [],
          action: 'allow',
        });
      }
    }

    const blockers = evaluations.filter((e) => e.action === 'block');
    const warnings = evaluations.filter((e) => e.action === 'warn');
    const allowed = blockers.length === 0;

    const summary = this.generateSummary(allowed, blockers, warnings);

    return {
      allowed,
      evaluations,
      blockers,
      warnings,
      summary,
    };
  }

  private async evaluateRule(
    rule: PolicyRule,
    context: PolicyContext,
  ): Promise<PolicyEvaluation> {
    // Check exemptions first
    if (rule.exemptions) {
      for (const exemption of rule.exemptions) {
        if (
          context.pr.branch.includes(exemption) ||
          context.pr.files.some((f) => f.includes(exemption))
        ) {
          return {
            rule,
            matched: false,
            reason: `Exempted by pattern: ${exemption}`,
            evidence: [],
            action: 'allow',
          };
        }
      }
    }

    // Evaluate condition
    const matched = this.evaluateCondition(rule.condition, context);

    if (!matched) {
      return {
        rule,
        matched: false,
        reason: 'Condition not met',
        evidence: [],
        action: 'allow',
      };
    }

    // Collect evidence
    const evidence = this.collectEvidence(rule, context);

    return {
      rule,
      matched: true,
      reason: rule.reason,
      evidence,
      action: rule.action,
    };
  }

  private evaluateCondition(
    condition: string,
    context: PolicyContext,
  ): boolean {
    try {
      // Simple expression evaluator - in production, use a proper parser
      const func = new Function(
        'pr',
        'checks',
        'risk',
        'timing',
        `return ${condition}`,
      );
      return func(context.pr, context.checks, context.risk, context.timing);
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error.message);
      return false;
    }
  }

  private collectEvidence(rule: PolicyRule, context: PolicyContext): string[] {
    const evidence: string[] = [];

    // Basic evidence collection based on rule type
    if (rule.condition.includes('pr.additions + pr.deletions')) {
      evidence.push(
        `Total changes: ${context.pr.additions + context.pr.deletions} lines`,
      );
    }

    if (rule.condition.includes('pr.files')) {
      const relevantFiles = context.pr.files.filter(
        (f) =>
          (rule.condition.includes('auth') && f.includes('auth')) ||
          (rule.condition.includes('security') && f.includes('security')) ||
          (rule.condition.includes('.env') && f.includes('.env')) ||
          (rule.condition.includes('migration') && f.includes('migration')),
      );
      if (relevantFiles.length > 0) {
        evidence.push(`Relevant files: ${relevantFiles.join(', ')}`);
      }
    }

    if (rule.condition.includes('risk.score')) {
      evidence.push(`Risk score: ${context.risk.score}`);
      if (context.risk.factors.length > 0) {
        evidence.push(`Risk factors: ${context.risk.factors.join(', ')}`);
      }
    }

    if (rule.condition.includes('timing')) {
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      evidence.push(
        `Timing: ${days[context.timing.day]} at ${context.timing.hour}:00`,
      );
    }

    return evidence;
  }

  private generateSummary(
    allowed: boolean,
    blockers: PolicyEvaluation[],
    warnings: PolicyEvaluation[],
  ): string {
    if (blockers.length > 0) {
      const reasons = blockers.map((b) => b.rule.name).join(', ');
      return `❌ **BLOCKED** by policies: ${reasons}. Address these issues before proceeding.`;
    }

    if (warnings.length > 0) {
      const reasons = warnings.map((w) => w.rule.name).join(', ');
      return `⚠️ **WARNINGS** from policies: ${reasons}. Consider addressing these concerns.`;
    }

    return `✅ **ALLOWED** - No policy violations detected.`;
  }

  generatePolicyReport(): string {
    let report = '# Policy Configuration\n\n';
    report += `Total rules: ${this.rules.size}\n\n`;

    const rulesByAction = new Map<string, PolicyRule[]>();
    const rulesBySeverity = new Map<string, PolicyRule[]>();

    for (const rule of this.rules.values()) {
      // Group by action
      if (!rulesByAction.has(rule.action)) {
        rulesByAction.set(rule.action, []);
      }
      rulesByAction.get(rule.action)!.push(rule);

      // Group by severity
      if (!rulesBySeverity.has(rule.severity)) {
        rulesBySeverity.set(rule.severity, []);
      }
      rulesBySeverity.get(rule.severity)!.push(rule);
    }

    report += '## Rules by Action\n\n';
    for (const [action, rules] of rulesByAction.entries()) {
      report += `### ${action.toUpperCase()} (${rules.length})\n\n`;
      for (const rule of rules) {
        report += `- **${rule.name}**: ${rule.description}\n`;
      }
      report += '\n';
    }

    report += '## Rules by Severity\n\n';
    for (const [severity, rules] of rulesBySeverity.entries()) {
      report += `### ${severity.toUpperCase()} (${rules.length})\n\n`;
      for (const rule of rules) {
        report += `- **${rule.name}**: ${rule.description}\n`;
      }
      report += '\n';
    }

    return report;
  }

  exportRules(): PolicyRule[] {
    return Array.from(this.rules.values());
  }

  importRules(rules: PolicyRule[]): void {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
}
