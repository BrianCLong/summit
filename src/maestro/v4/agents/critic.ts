// Critic Agent for Maestro v0.4
// Summarize semantic diff, compute risk, and propose tests

export interface CriticAnalysis {
  riskScore: number;
  summary: string;
  suggestedTests: string[];
  staticAnalysis: StaticAnalysisResult;
  needsFixes: boolean;
  issues: CriticIssue[];
  cost: number;
}

export interface CriticIssue {
  type:
    | 'security'
    | 'performance'
    | 'maintainability'
    | 'testing'
    | 'licensing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface StaticAnalysisResult {
  lintErrors: number;
  securityIssues: number;
  complexityViolations: number;
  duplicatedCode: number;
  testCoverage?: number;
}

export class CriticAgent {
  private guardrails = [
    'Do not approve missing tests for changed logic.',
    'Never include license-incompatible code.',
    'Flag potential security vulnerabilities.',
    'Ensure backward compatibility unless explicitly breaking.',
    'Check for proper error handling.',
  ];

  /**
   * Analyze changes and provide comprehensive criticism
   */
  async analyze(changes: any[], model: string): Promise<CriticAnalysis> {
    const startTime = Date.now();

    try {
      // Perform static analysis
      const staticAnalysis = await this.performStaticAnalysis(changes);

      // Analyze semantic changes
      const semanticAnalysis = await this.analyzeSemanticChanges(changes);

      // Generate risk score
      const riskScore = this.computeRiskScore(staticAnalysis, semanticAnalysis);

      // Generate summary
      const summary = this.generateSummary(
        changes,
        staticAnalysis,
        semanticAnalysis,
      );

      // Suggest tests
      const suggestedTests = await this.suggestTests(changes, semanticAnalysis);

      // Identify issues
      const issues = this.identifyIssues(staticAnalysis, semanticAnalysis);

      // Check if fixes are needed
      const needsFixes = issues.some(
        (issue) => issue.severity === 'high' || issue.severity === 'critical',
      );

      // Calculate cost (mock - would be based on actual model usage)
      const cost = this.calculateCost(model, changes.length);

      return {
        riskScore,
        summary,
        suggestedTests,
        staticAnalysis,
        needsFixes,
        issues,
        cost,
      };
    } catch (error) {
      return {
        riskScore: 1.0, // Max risk on error
        summary: `Analysis failed: ${error}`,
        suggestedTests: [],
        staticAnalysis: {
          lintErrors: 0,
          securityIssues: 0,
          complexityViolations: 0,
          duplicatedCode: 0,
        },
        needsFixes: true,
        issues: [
          {
            type: 'maintainability',
            severity: 'high',
            description: `Critic analysis failed: ${error}`,
          },
        ],
        cost: 0.01,
      };
    }
  }

  private async performStaticAnalysis(
    changes: any[],
  ): Promise<StaticAnalysisResult> {
    // Mock static analysis - in production would integrate with:
    // - ESLint/TSLint for linting
    // - SonarQube for code quality
    // - Semgrep for security
    // - CodeQL for vulnerability detection

    let lintErrors = 0;
    let securityIssues = 0;
    let complexityViolations = 0;
    let duplicatedCode = 0;

    for (const change of changes) {
      // Mock analysis based on change patterns
      if (
        change.content?.includes('eval(') ||
        change.content?.includes('innerHTML')
      ) {
        securityIssues++;
      }

      if (
        change.content?.includes('for (') &&
        change.content?.includes('for (')
      ) {
        complexityViolations++;
      }

      // Mock lint errors
      lintErrors += Math.floor(Math.random() * 3);

      // Mock duplicated code detection
      if (change.additions > 50) {
        duplicatedCode += Math.floor(Math.random() * 2);
      }
    }

    return {
      lintErrors,
      securityIssues,
      complexityViolations,
      duplicatedCode,
      testCoverage: Math.random() * 100, // Mock coverage
    };
  }

  private async analyzeSemanticChanges(changes: any[]): Promise<any> {
    // Mock semantic analysis - would use AST parsing and pattern matching
    const semanticChanges = {
      newFunctions: 0,
      modifiedFunctions: 0,
      newClasses: 0,
      modifiedClasses: 0,
      apiChanges: 0,
      databaseChanges: 0,
      configChanges: 0,
    };

    for (const change of changes) {
      if (
        change.content?.includes('function ') ||
        change.content?.includes('const ')
      ) {
        semanticChanges.newFunctions++;
      }

      if (change.content?.includes('class ')) {
        semanticChanges.newClasses++;
      }

      if (change.file?.includes('api/') || change.file?.includes('routes/')) {
        semanticChanges.apiChanges++;
      }

      if (
        change.file?.includes('migration') ||
        change.content?.includes('ALTER TABLE')
      ) {
        semanticChanges.databaseChanges++;
      }

      if (change.file?.includes('config') || change.file?.includes('.env')) {
        semanticChanges.configChanges++;
      }
    }

    return semanticChanges;
  }

  private computeRiskScore(
    staticAnalysis: StaticAnalysisResult,
    semanticAnalysis: any,
  ): number {
    let score = 0;

    // Security issues contribute heavily to risk
    score += staticAnalysis.securityIssues * 0.3;

    // Complexity violations
    score += staticAnalysis.complexityViolations * 0.2;

    // Lint errors (less critical)
    score += staticAnalysis.lintErrors * 0.05;

    // API changes are risky
    score += semanticAnalysis.apiChanges * 0.25;

    // Database changes are risky
    score += semanticAnalysis.databaseChanges * 0.4;

    // Config changes can be risky
    score += semanticAnalysis.configChanges * 0.15;

    return Math.min(1.0, score);
  }

  private generateSummary(
    changes: any[],
    staticAnalysis: StaticAnalysisResult,
    semanticAnalysis: any,
  ): string {
    const parts: string[] = [];

    const totalFiles = changes.length;
    const totalLines = changes.reduce(
      (sum, change) => sum + (change.additions || 0) + (change.deletions || 0),
      0,
    );

    parts.push(
      `**Change Overview**: ${totalFiles} files modified, ${totalLines} lines changed.`,
    );

    if (semanticAnalysis.newFunctions > 0) {
      parts.push(`Added ${semanticAnalysis.newFunctions} new functions.`);
    }

    if (semanticAnalysis.newClasses > 0) {
      parts.push(`Added ${semanticAnalysis.newClasses} new classes.`);
    }

    if (semanticAnalysis.apiChanges > 0) {
      parts.push(`⚠️  ${semanticAnalysis.apiChanges} API endpoints modified.`);
    }

    if (semanticAnalysis.databaseChanges > 0) {
      parts.push(
        `⚠️  ${semanticAnalysis.databaseChanges} database schema changes detected.`,
      );
    }

    if (staticAnalysis.securityIssues > 0) {
      parts.push(
        `🚨 ${staticAnalysis.securityIssues} potential security issues found.`,
      );
    }

    if (staticAnalysis.lintErrors > 0) {
      parts.push(`${staticAnalysis.lintErrors} linting issues to address.`);
    }

    return parts.join(' ');
  }

  private async suggestTests(
    changes: any[],
    semanticAnalysis: any,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (semanticAnalysis.newFunctions > 0) {
      suggestions.push('Add unit tests for new functions with edge cases');
    }

    if (semanticAnalysis.apiChanges > 0) {
      suggestions.push('Add integration tests for modified API endpoints');
      suggestions.push('Update API contract tests');
    }

    if (semanticAnalysis.databaseChanges > 0) {
      suggestions.push('Add migration tests and rollback verification');
    }

    if (semanticAnalysis.configChanges > 0) {
      suggestions.push('Test configuration changes in staging environment');
    }

    // Always suggest at least basic testing
    if (suggestions.length === 0) {
      suggestions.push('Add regression tests for modified functionality');
    }

    return suggestions;
  }

  private identifyIssues(
    staticAnalysis: StaticAnalysisResult,
    semanticAnalysis: any,
  ): CriticIssue[] {
    const issues: CriticIssue[] = [];

    if (staticAnalysis.securityIssues > 0) {
      issues.push({
        type: 'security',
        severity: 'high',
        description: `${staticAnalysis.securityIssues} potential security vulnerabilities detected`,
        suggestion: 'Review and fix security issues before merging',
      });
    }

    if (staticAnalysis.complexityViolations > 0) {
      issues.push({
        type: 'maintainability',
        severity: 'medium',
        description: `${staticAnalysis.complexityViolations} complexity violations found`,
        suggestion: 'Consider refactoring complex functions',
      });
    }

    if (staticAnalysis.testCoverage && staticAnalysis.testCoverage < 80) {
      issues.push({
        type: 'testing',
        severity: 'medium',
        description: `Test coverage is ${staticAnalysis.testCoverage.toFixed(1)}%`,
        suggestion: 'Add tests to improve coverage',
      });
    }

    if (
      semanticAnalysis.apiChanges > 0 &&
      semanticAnalysis.newFunctions === 0
    ) {
      issues.push({
        type: 'maintainability',
        severity: 'low',
        description: 'API changes without corresponding test additions',
        suggestion: 'Ensure API changes are properly tested',
      });
    }

    return issues;
  }

  private calculateCost(model: string, changeCount: number): number {
    // Mock cost calculation - would be based on actual model usage
    const baseCosts = {
      small: 0.01,
      medium: 0.05,
      large: 0.15,
    };

    const baseCost = baseCosts[model as keyof typeof baseCosts] || 0.01;
    return baseCost * Math.max(1, changeCount / 10);
  }

  async getStats(): Promise<any> {
    return {
      component: 'CriticAgent',
      version: '0.4.0',
      guardrails: this.guardrails,
      // Add runtime statistics here
    };
  }
}
