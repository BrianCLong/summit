import { spawn } from 'child_process';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface CriticResult {
  riskScore: number;
  staticCheckResults: StaticCheckResult[];
  diffSummary: DiffSummary;
  recommendations: string[];
  shouldProceed: boolean;
}

interface StaticCheckResult {
  tool: string;
  passed: boolean;
  issues: Issue[];
  executionTime: number;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
}

interface DiffSummary {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  complexity: 'low' | 'medium' | 'high';
  affectedModules: string[];
  testCoverage: number;
}

export class CriticAgent {
  private projectRoot: string;
  private staticChecks: string[];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.staticChecks = [
      'eslint',
      'typescript',
      'security',
      'dependencies',
      'tests',
    ];
  }

  async analyze(diffContent?: string): Promise<CriticResult> {
    console.log('🔍 Critic: Starting comprehensive analysis...');

    const [staticResults, diffSummary] = await Promise.all([
      this.runStaticChecks(),
      this.analyzeDiff(diffContent),
    ]);

    const riskScore = this.calculateRiskScore(staticResults, diffSummary);
    const recommendations = this.generateRecommendations(
      staticResults,
      diffSummary,
      riskScore,
    );

    const result: CriticResult = {
      riskScore,
      staticCheckResults: staticResults,
      diffSummary,
      recommendations,
      shouldProceed: riskScore < 70, // Threshold for auto-proceed
    };

    await this.persistAnalysis(result);
    return result;
  }

  private async runStaticChecks(): Promise<StaticCheckResult[]> {
    const results: StaticCheckResult[] = [];

    for (const check of this.staticChecks) {
      const startTime = Date.now();
      try {
        const result = await this.executeCheck(check);
        results.push({
          ...result,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          tool: check,
          passed: false,
          issues: [
            {
              severity: 'error',
              message: `Failed to run ${check}: ${error}`,
              file: 'system',
            },
          ],
          executionTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  private async executeCheck(
    tool: string,
  ): Promise<Omit<StaticCheckResult, 'executionTime'>> {
    switch (tool) {
      case 'eslint':
        return this.runEslint();
      case 'typescript':
        return this.runTypeCheck();
      case 'security':
        return this.runSecurityScan();
      case 'dependencies':
        return this.checkDependencies();
      case 'tests':
        return this.analyzeTestCoverage();
      default:
        throw new Error(`Unknown check: ${tool}`);
    }
  }

  private async runEslint(): Promise<Omit<StaticCheckResult, 'executionTime'>> {
    try {
      const { stdout } = await execAsync('npx eslint . --format json', {
        cwd: this.projectRoot,
      });

      const results = JSON.parse(stdout);
      const issues: Issue[] = [];

      for (const fileResult of results) {
        for (const message of fileResult.messages) {
          issues.push({
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            file: fileResult.filePath,
            line: message.line,
            column: message.column,
            rule: message.ruleId,
          });
        }
      }

      return {
        tool: 'eslint',
        passed: issues.filter((i) => i.severity === 'error').length === 0,
        issues,
      };
    } catch (error) {
      // ESLint non-zero exit doesn't mean failure to run
      if (error.stdout) {
        const results = JSON.parse(error.stdout);
        const issues: Issue[] = [];

        for (const fileResult of results) {
          for (const message of fileResult.messages) {
            issues.push({
              severity: message.severity === 2 ? 'error' : 'warning',
              message: message.message,
              file: fileResult.filePath,
              line: message.line,
              column: message.column,
              rule: message.ruleId,
            });
          }
        }

        return {
          tool: 'eslint',
          passed: issues.filter((i) => i.severity === 'error').length === 0,
          issues,
        };
      }
      throw error;
    }
  }

  private async runTypeCheck(): Promise<
    Omit<StaticCheckResult, 'executionTime'>
  > {
    try {
      const { stdout, stderr } = await execAsync(
        'npx tsc --noEmit --pretty false',
        {
          cwd: this.projectRoot,
        },
      );

      return {
        tool: 'typescript',
        passed: true,
        issues: [],
      };
    } catch (error) {
      const issues: Issue[] = [];

      if (error.stdout) {
        // Parse TypeScript error output
        const lines = error.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/^(.+)\((\d+),(\d+)\): error TS\d+: (.+)$/);
          if (match) {
            issues.push({
              severity: 'error',
              message: match[4],
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
            });
          }
        }
      }

      return {
        tool: 'typescript',
        passed: false,
        issues,
      };
    }
  }

  private async runSecurityScan(): Promise<
    Omit<StaticCheckResult, 'executionTime'>
  > {
    try {
      const { stdout } = await execAsync(
        'npm audit --audit-level high --json',
        {
          cwd: this.projectRoot,
        },
      );

      const audit = JSON.parse(stdout);
      const issues: Issue[] = [];

      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
          const v = vuln as any;
          issues.push({
            severity:
              v.severity === 'critical' || v.severity === 'high'
                ? 'error'
                : 'warning',
            message: `${v.severity} vulnerability in ${name}: ${v.via[0]?.title || 'Unknown'}`,
            file: 'package.json',
          });
        }
      }

      return {
        tool: 'security',
        passed: issues.filter((i) => i.severity === 'error').length === 0,
        issues,
      };
    } catch (error) {
      return {
        tool: 'security',
        passed: false,
        issues: [
          {
            severity: 'warning',
            message: 'Unable to run security audit',
            file: 'system',
          },
        ],
      };
    }
  }

  private async checkDependencies(): Promise<
    Omit<StaticCheckResult, 'executionTime'>
  > {
    try {
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: this.projectRoot,
      });

      const outdated = JSON.parse(stdout);
      const issues: Issue[] = [];

      for (const [name, info] of Object.entries(outdated)) {
        const dep = info as any;
        const majorBehind =
          dep.latest.split('.')[0] !== dep.current.split('.')[0];

        issues.push({
          severity: majorBehind ? 'warning' : 'info',
          message: `${name} is outdated: ${dep.current} → ${dep.latest}`,
          file: 'package.json',
        });
      }

      return {
        tool: 'dependencies',
        passed: true,
        issues,
      };
    } catch {
      // npm outdated exits with 1 when there are outdated packages
      return {
        tool: 'dependencies',
        passed: true,
        issues: [],
      };
    }
  }

  private async analyzeTestCoverage(): Promise<
    Omit<StaticCheckResult, 'executionTime'>
  > {
    try {
      // Check if coverage data exists
      const coverageFiles = [
        'coverage/lcov-report/index.html',
        'coverage/coverage-summary.json',
      ];

      let coverageData: any = null;
      for (const file of coverageFiles) {
        try {
          await access(join(this.projectRoot, file));
          if (file.endsWith('.json')) {
            const content = await readFile(
              join(this.projectRoot, file),
              'utf8',
            );
            coverageData = JSON.parse(content);
          }
          break;
        } catch {}
      }

      const issues: Issue[] = [];

      if (!coverageData) {
        issues.push({
          severity: 'warning',
          message: 'No test coverage data found',
          file: 'tests',
        });
      } else {
        const total = coverageData.total;
        if (total.lines.pct < 80) {
          issues.push({
            severity: 'warning',
            message: `Low line coverage: ${total.lines.pct}% (target: 80%)`,
            file: 'tests',
          });
        }
        if (total.branches.pct < 70) {
          issues.push({
            severity: 'warning',
            message: `Low branch coverage: ${total.branches.pct}% (target: 70%)`,
            file: 'tests',
          });
        }
      }

      return {
        tool: 'tests',
        passed: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        tool: 'tests',
        passed: false,
        issues: [
          {
            severity: 'warning',
            message: `Failed to analyze test coverage: ${error}`,
            file: 'tests',
          },
        ],
      };
    }
  }

  private async analyzeDiff(diffContent?: string): Promise<DiffSummary> {
    if (!diffContent) {
      try {
        const { stdout } = await execAsync('git diff --stat HEAD~1', {
          cwd: this.projectRoot,
        });
        diffContent = stdout;
      } catch {
        return {
          filesChanged: 0,
          linesAdded: 0,
          linesRemoved: 0,
          complexity: 'low',
          affectedModules: [],
          testCoverage: 0,
        };
      }
    }

    const lines = diffContent.split('\n');
    const fileChanges = lines.filter((l) => l.includes('|')).length;
    const summaryLine = lines[lines.length - 2] || '';

    const addedMatch = summaryLine.match(/(\d+) insertion/);
    const removedMatch = summaryLine.match(/(\d+) deletion/);

    const linesAdded = addedMatch ? parseInt(addedMatch[1]) : 0;
    const linesRemoved = removedMatch ? parseInt(removedMatch[1]) : 0;

    const complexity = this.assessComplexity(
      fileChanges,
      linesAdded + linesRemoved,
    );
    const affectedModules = this.identifyAffectedModules(lines);

    return {
      filesChanged: fileChanges,
      linesAdded,
      linesRemoved,
      complexity,
      affectedModules,
      testCoverage: await this.estimateTestCoverage(affectedModules),
    };
  }

  private assessComplexity(
    files: number,
    totalLines: number,
  ): 'low' | 'medium' | 'high' {
    if (files > 20 || totalLines > 500) return 'high';
    if (files > 5 || totalLines > 100) return 'medium';
    return 'low';
  }

  private identifyAffectedModules(diffLines: string[]): string[] {
    const modules = new Set<string>();

    for (const line of diffLines) {
      if (line.includes('|')) {
        const filePath = line.split('|')[0].trim();
        const parts = filePath.split('/');

        if (parts.length > 1) {
          modules.add(parts[0]);
        }
      }
    }

    return Array.from(modules);
  }

  private async estimateTestCoverage(modules: string[]): Promise<number> {
    try {
      const coverageFile = join(
        this.projectRoot,
        'coverage/coverage-summary.json',
      );
      await access(coverageFile);

      const coverage = JSON.parse(await readFile(coverageFile, 'utf8'));
      return coverage.total?.lines?.pct || 0;
    } catch {
      return 0;
    }
  }

  private calculateRiskScore(
    staticResults: StaticCheckResult[],
    diffSummary: DiffSummary,
  ): number {
    let score = 0;

    // Static check penalties
    for (const result of staticResults) {
      const errors = result.issues.filter((i) => i.severity === 'error').length;
      const warnings = result.issues.filter(
        (i) => i.severity === 'warning',
      ).length;

      score += errors * 10 + warnings * 3;
    }

    // Diff complexity penalties
    switch (diffSummary.complexity) {
      case 'high':
        score += 30;
        break;
      case 'medium':
        score += 15;
        break;
      case 'low':
        score += 5;
        break;
    }

    // Test coverage bonus/penalty
    if (diffSummary.testCoverage > 80) {
      score -= 10;
    } else if (diffSummary.testCoverage < 60) {
      score += 20;
    }

    // Critical module penalty
    const criticalModules = ['auth', 'security', 'payment', 'api'];
    const touchesCritical = diffSummary.affectedModules.some((m) =>
      criticalModules.some((cm) => m.toLowerCase().includes(cm)),
    );

    if (touchesCritical) {
      score += 25;
    }

    return Math.min(100, Math.max(0, score));
  }

  private generateRecommendations(
    staticResults: StaticCheckResult[],
    diffSummary: DiffSummary,
    riskScore: number,
  ): string[] {
    const recommendations: string[] = [];

    // Static check recommendations
    for (const result of staticResults) {
      if (!result.passed) {
        const errorCount = result.issues.filter(
          (i) => i.severity === 'error',
        ).length;
        if (errorCount > 0) {
          recommendations.push(
            `Fix ${errorCount} ${result.tool} errors before proceeding`,
          );
        }
      }
    }

    // Complexity recommendations
    if (diffSummary.complexity === 'high') {
      recommendations.push('Consider breaking this change into smaller PRs');
      recommendations.push(
        'Add comprehensive tests for high-complexity changes',
      );
    }

    // Coverage recommendations
    if (diffSummary.testCoverage < 70) {
      recommendations.push('Increase test coverage before merging');
    }

    // Risk-based recommendations
    if (riskScore > 80) {
      recommendations.push('High risk change - require manual review');
      recommendations.push('Consider feature flagging this change');
    } else if (riskScore > 50) {
      recommendations.push('Medium risk - run extended test suite');
    }

    if (recommendations.length === 0) {
      recommendations.push('All checks passed - safe to proceed');
    }

    return recommendations;
  }

  private async persistAnalysis(result: CriticResult): Promise<void> {
    const analysisDir = join(this.projectRoot, '.maestro', 'analysis');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `critic-${timestamp}.json`;

    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(analysisDir, { recursive: true });
      await writeFile(
        join(analysisDir, filename),
        JSON.stringify(result, null, 2),
      );
    } catch (error) {
      console.warn('Failed to persist analysis:', error);
    }
  }
}
