import { CriticAgent } from '../agents/critic';
import { PRRiskScorer } from '../risk/riskScorer';
import { MaestroMemory } from '../memory';
import { CapabilityRouter } from '../router/capabilityRouter';

interface PRHealthCheck {
  overall: 'healthy' | 'needs-attention' | 'unhealthy';
  score: number;
  checks: HealthCheck[];
  recommendations: string[];
  autoActions: string[];
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'low' | 'medium' | 'high';
  fixable: boolean;
}

interface PRContext {
  number: number;
  title: string;
  body: string;
  author: string;
  branch: string;
  baseBranch: string;
  files: string[];
  additions: number;
  deletions: number;
  commits: any[];
  reviews?: any[];
  checks?: any[];
}

export class PRHealthBot {
  private critic: CriticAgent;
  private riskScorer: PRRiskScorer;
  private memory: MaestroMemory;
  private router: CapabilityRouter;

  constructor(projectRoot: string = process.cwd()) {
    this.critic = new CriticAgent(projectRoot);
    this.riskScorer = new PRRiskScorer(projectRoot);
    this.memory = MaestroMemory.getInstance(projectRoot);
    this.router = new CapabilityRouter(projectRoot);
  }

  async analyzePR(pr: PRContext): Promise<PRHealthCheck> {
    console.log(`🏥 PR Health Bot analyzing PR #${pr.number}: ${pr.title}`);

    const checks: HealthCheck[] = [];

    // Run all health checks in parallel
    const [
      sizeCheck,
      titleCheck,
      descriptionCheck,
      branchCheck,
      conflictCheck,
      testCheck,
      securityCheck,
      performanceCheck,
    ] = await Promise.all([
      this.checkSize(pr),
      this.checkTitle(pr),
      this.checkDescription(pr),
      this.checkBranch(pr),
      this.checkConflicts(pr),
      this.checkTests(pr),
      this.checkSecurity(pr),
      this.checkPerformance(pr),
    ]);

    checks.push(
      sizeCheck,
      titleCheck,
      descriptionCheck,
      branchCheck,
      conflictCheck,
      testCheck,
      securityCheck,
      performanceCheck,
    );

    // Calculate overall health
    const score = this.calculateHealthScore(checks);
    const overall = this.determineOverallHealth(score, checks);

    // Generate recommendations and auto-actions
    const recommendations = await this.generateRecommendations(checks, pr);
    const autoActions = this.determineAutoActions(checks);

    return {
      overall,
      score,
      checks,
      recommendations,
      autoActions,
    };
  }

  private async checkSize(pr: PRContext): Promise<HealthCheck> {
    const totalChanges = pr.additions + pr.deletions;
    const fileCount = pr.files.length;

    if (totalChanges > 800 || fileCount > 30) {
      return {
        name: 'PR Size',
        status: 'fail',
        message: `Large PR: ${totalChanges} lines across ${fileCount} files`,
        severity: 'high',
        fixable: false,
      };
    } else if (totalChanges > 300 || fileCount > 10) {
      return {
        name: 'PR Size',
        status: 'warn',
        message: `Medium PR: ${totalChanges} lines across ${fileCount} files`,
        severity: 'medium',
        fixable: false,
      };
    }

    return {
      name: 'PR Size',
      status: 'pass',
      message: `Manageable size: ${totalChanges} lines across ${fileCount} files`,
      severity: 'low',
      fixable: false,
    };
  }

  private async checkTitle(pr: PRContext): Promise<HealthCheck> {
    const title = pr.title;

    // Check conventional commit format
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .+/;
    const hasIssueRef = /\b(fixes|closes|resolves)\s+#\d+/i.test(title);

    if (!conventionalPattern.test(title)) {
      return {
        name: 'Title Format',
        status: 'warn',
        message: 'Title should follow conventional commit format',
        severity: 'low',
        fixable: true,
      };
    }

    if (!hasIssueRef && !title.toLowerCase().includes('hotfix')) {
      return {
        name: 'Title Format',
        status: 'warn',
        message: 'Consider adding issue reference (fixes #123)',
        severity: 'low',
        fixable: false,
      };
    }

    return {
      name: 'Title Format',
      status: 'pass',
      message: 'Well-formatted title',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkDescription(pr: PRContext): Promise<HealthCheck> {
    const body = pr.body || '';

    if (body.length < 50) {
      return {
        name: 'Description',
        status: 'fail',
        message: 'Missing or minimal description',
        severity: 'medium',
        fixable: true,
      };
    }

    const hasContext = /## Context|## Background|## Why/i.test(body);
    const hasChanges = /## Changes|## What/i.test(body);
    const hasTesting = /## Test|## Testing|## Verification/i.test(body);

    if (!hasContext || !hasChanges) {
      return {
        name: 'Description',
        status: 'warn',
        message:
          'Description could be more structured (Context, Changes, Testing)',
        severity: 'low',
        fixable: true,
      };
    }

    return {
      name: 'Description',
      status: 'pass',
      message: 'Well-structured description',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkBranch(pr: PRContext): Promise<HealthCheck> {
    const branch = pr.branch;
    const baseBranch = pr.baseBranch;

    // Check branch naming convention
    const goodBranchPattern = /^(feature|bugfix|hotfix|chore)\/[a-z0-9-]+$/;

    if (!goodBranchPattern.test(branch)) {
      return {
        name: 'Branch Name',
        status: 'warn',
        message: 'Branch name should follow pattern: type/description',
        severity: 'low',
        fixable: false,
      };
    }

    if (baseBranch !== 'main' && baseBranch !== 'develop') {
      return {
        name: 'Branch Name',
        status: 'warn',
        message: `Unusual base branch: ${baseBranch}`,
        severity: 'medium',
        fixable: false,
      };
    }

    return {
      name: 'Branch Name',
      status: 'pass',
      message: 'Good branch naming',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkConflicts(pr: PRContext): Promise<HealthCheck> {
    // In a real implementation, this would check Git conflicts
    // For now, we'll simulate based on file overlap heuristics

    const conflictRiskFiles = pr.files.filter(
      (f) =>
        f.includes('package.json') ||
        f.includes('yarn.lock') ||
        f.includes('schema'),
    );

    if (conflictRiskFiles.length > 0) {
      return {
        name: 'Merge Conflicts',
        status: 'warn',
        message: `Potential conflicts in: ${conflictRiskFiles.join(', ')}`,
        severity: 'medium',
        fixable: true,
      };
    }

    return {
      name: 'Merge Conflicts',
      status: 'pass',
      message: 'No obvious conflict risks',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkTests(pr: PRContext): Promise<HealthCheck> {
    const hasTestFiles = pr.files.some(
      (f) =>
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__'),
    );

    const hasCodeFiles = pr.files.some(
      (f) =>
        (f.endsWith('.ts') ||
          f.endsWith('.js') ||
          f.endsWith('.tsx') ||
          f.endsWith('.jsx')) &&
        !f.includes('.test.') &&
        !f.includes('.spec.'),
    );

    if (hasCodeFiles && !hasTestFiles) {
      return {
        name: 'Test Coverage',
        status: 'fail',
        message: 'Code changes without corresponding tests',
        severity: 'high',
        fixable: true,
      };
    }

    if (hasTestFiles) {
      return {
        name: 'Test Coverage',
        status: 'pass',
        message: 'Tests included with changes',
        severity: 'low',
        fixable: false,
      };
    }

    return {
      name: 'Test Coverage',
      status: 'pass',
      message: 'No testable code changes',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkSecurity(pr: PRContext): Promise<HealthCheck> {
    const securityFiles = pr.files.filter(
      (f) =>
        f.includes('auth') ||
        f.includes('security') ||
        f.includes('password') ||
        f.includes('token') ||
        f.includes('.env') ||
        f.includes('secret'),
    );

    const dependencyFiles = pr.files.filter(
      (f) =>
        f.includes('package.json') ||
        f.includes('requirements.txt') ||
        f.includes('go.mod'),
    );

    if (securityFiles.length > 0) {
      return {
        name: 'Security Review',
        status: 'warn',
        message: `Security-sensitive files modified: ${securityFiles.join(', ')}`,
        severity: 'high',
        fixable: false,
      };
    }

    if (dependencyFiles.length > 0) {
      return {
        name: 'Security Review',
        status: 'warn',
        message: 'Dependencies modified - security scan recommended',
        severity: 'medium',
        fixable: false,
      };
    }

    return {
      name: 'Security Review',
      status: 'pass',
      message: 'No security-sensitive changes detected',
      severity: 'low',
      fixable: false,
    };
  }

  private async checkPerformance(pr: PRContext): Promise<HealthCheck> {
    const performanceRiskFiles = pr.files.filter(
      (f) =>
        f.includes('database') ||
        f.includes('query') ||
        f.includes('migration') ||
        f.includes('index') ||
        f.includes('worker') ||
        f.includes('job'),
    );

    if (performanceRiskFiles.length > 0) {
      return {
        name: 'Performance Impact',
        status: 'warn',
        message: `Performance-sensitive areas: ${performanceRiskFiles.join(', ')}`,
        severity: 'medium',
        fixable: false,
      };
    }

    return {
      name: 'Performance Impact',
      status: 'pass',
      message: 'No performance-critical changes detected',
      severity: 'low',
      fixable: false,
    };
  }

  private calculateHealthScore(checks: HealthCheck[]): number {
    let score = 100;

    for (const check of checks) {
      if (check.status === 'fail') {
        score -=
          check.severity === 'high' ? 25 : check.severity === 'medium' ? 15 : 5;
      } else if (check.status === 'warn') {
        score -=
          check.severity === 'high' ? 15 : check.severity === 'medium' ? 10 : 5;
      }
    }

    return Math.max(0, score);
  }

  private determineOverallHealth(
    score: number,
    checks: HealthCheck[],
  ): 'healthy' | 'needs-attention' | 'unhealthy' {
    const criticalFailures = checks.filter(
      (c) => c.status === 'fail' && c.severity === 'high',
    ).length;

    if (criticalFailures > 0 || score < 50) {
      return 'unhealthy';
    } else if (score < 75) {
      return 'needs-attention';
    } else {
      return 'healthy';
    }
  }

  private async generateRecommendations(
    checks: HealthCheck[],
    pr: PRContext,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    for (const check of checks) {
      if (check.status !== 'pass') {
        switch (check.name) {
          case 'PR Size':
            recommendations.push(
              '🔄 Consider splitting large changes into smaller, focused PRs',
            );
            break;
          case 'Title Format':
            recommendations.push(
              '📝 Update title to follow conventional commit format',
            );
            break;
          case 'Description':
            recommendations.push(
              '📋 Add structured description with Context, Changes, and Testing sections',
            );
            break;
          case 'Test Coverage':
            recommendations.push('🧪 Add tests for modified code');
            break;
          case 'Security Review':
            recommendations.push(
              '🔒 Request security review for sensitive changes',
            );
            break;
        }
      }
    }

    // Use AI for contextual recommendations
    if (recommendations.length > 0) {
      try {
        const routing = await this.router.route({
          type: 'review',
          complexity: 'simple',
          priority: 'medium',
          budget: { maxCost: 0.1, timeLimit: 5000 },
          qualityRequirements: { minAccuracy: 0.8, allowExperimental: true },
          context: {
            estimatedTokens: 500,
            needsReasoning: false,
            requiresCreativity: false,
          },
        });

        recommendations.push(
          '🤖 AI-generated recommendations available via routing',
        );
      } catch (error) {
        console.warn('Failed to generate AI recommendations:', error.message);
      }
    }

    return recommendations;
  }

  private determineAutoActions(checks: HealthCheck[]): string[] {
    const actions: string[] = [];

    const fixableChecks = checks.filter(
      (c) => c.fixable && c.status !== 'pass',
    );

    for (const check of fixableChecks) {
      switch (check.name) {
        case 'Description':
          actions.push('Generate PR description template');
          break;
        case 'Merge Conflicts':
          actions.push('Suggest rebase strategy');
          break;
        case 'Test Coverage':
          actions.push('Generate test scaffolding');
          break;
      }
    }

    return actions;
  }

  async generateComment(healthCheck: PRHealthCheck): Promise<string> {
    const { overall, score, checks, recommendations } = healthCheck;

    const statusEmoji = {
      healthy: '✅',
      'needs-attention': '⚠️',
      unhealthy: '❌',
    }[overall];

    let comment = `## ${statusEmoji} PR Health Check (Score: ${score}/100)\n\n`;
    comment += `**Overall Status:** ${overall.replace('-', ' ').toUpperCase()}\n\n`;

    // Detailed check results
    comment += '### Check Results\n\n';
    for (const check of checks) {
      const icon =
        check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      comment += `${icon} **${check.name}:** ${check.message}\n`;
    }

    // Recommendations
    if (recommendations.length > 0) {
      comment += '\n### Recommendations\n\n';
      recommendations.forEach((rec) => (comment += `- ${rec}\n`));
    }

    comment += '\n---\n*Generated by Maestro PR Health Bot v2*';

    return comment;
  }
}
