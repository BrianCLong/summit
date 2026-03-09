import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  evidence: string[];
  confidence: number;
  category: 'technical' | 'process' | 'business' | 'security';
}

interface RiskScore {
  overall: number;
  factors: RiskFactor[];
  recommendation:
    | 'auto-merge'
    | 'review-recommended'
    | 'manual-review'
    | 'block';
  evidence: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  metadata: {
    prNumber?: number;
    author: string;
    timestamp: string;
    commitCount: number;
    filesChanged: number;
    linesChanged: number;
  };
}

interface HistoricalData {
  author: string;
  recentPRs: {
    merged: number;
    reverted: number;
    hotfixes: number;
    averageReviewTime: number;
  };
  codeQuality: {
    testCoverage: number;
    lintViolations: number;
    complexityScore: number;
  };
}

export class PRRiskScorer {
  private projectRoot: string;
  private riskFactors: Map<string, (data: any) => Promise<RiskFactor>>;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.initializeRiskFactors();
  }

  private initializeRiskFactors(): void {
    this.riskFactors = new Map([
      ['code-complexity', this.assessCodeComplexity.bind(this)],
      ['test-coverage', this.assessTestCoverage.bind(this)],
      ['file-risk', this.assessFileRisk.bind(this)],
      ['author-history', this.assessAuthorHistory.bind(this)],
      ['change-size', this.assessChangeSize.bind(this)],
      ['dependency-risk', this.assessDependencyRisk.bind(this)],
      ['security-risk', this.assessSecurityRisk.bind(this)],
      ['process-adherence', this.assessProcessAdherence.bind(this)],
      ['timing-risk', this.assessTimingRisk.bind(this)],
      ['rollback-risk', this.assessRollbackRisk.bind(this)],
    ]);
  }

  async scorePR(prData: {
    number?: number;
    author: string;
    title: string;
    description: string;
    branch: string;
    baseBranch: string;
    files: string[];
    commits: any[];
  }): Promise<RiskScore> {
    console.log(`📊 Analyzing PR risk for: ${prData.title}`);

    // Gather change statistics
    const changeStats = await this.getChangeStatistics(
      prData.branch,
      prData.baseBranch,
    );

    // Get historical data
    const historicalData = await this.getHistoricalData(prData.author);

    // Evaluate all risk factors
    const factors: RiskFactor[] = [];
    const evaluationData = {
      ...prData,
      changeStats,
      historicalData,
    };

    for (const [name, evaluator] of this.riskFactors.entries()) {
      try {
        const factor = await evaluator(evaluationData);
        factors.push(factor);
      } catch (error) {
        console.warn(`Failed to evaluate risk factor ${name}:`, error.message);
        // Add a neutral factor for failed evaluations
        factors.push({
          name,
          weight: 0.1,
          score: 50,
          evidence: [`Failed to evaluate: ${error.message}`],
          confidence: 0.1,
          category: 'technical',
        });
      }
    }

    // Calculate weighted overall score
    const totalWeight = factors.reduce(
      (sum, f) => sum + f.weight * f.confidence,
      0,
    );
    const weightedScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight * f.confidence,
      0,
    );

    const overall =
      totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;

    // Generate recommendation
    const recommendation = this.generateRecommendation(overall, factors);

    // Collect evidence
    const evidence = this.collectEvidence(factors);

    const result: RiskScore = {
      overall,
      factors,
      recommendation,
      evidence,
      metadata: {
        prNumber: prData.number,
        author: prData.author,
        timestamp: new Date().toISOString(),
        commitCount: prData.commits.length,
        filesChanged: prData.files.length,
        linesChanged: changeStats.linesAdded + changeStats.linesRemoved,
      },
    };

    await this.persistRiskScore(result);
    return result;
  }

  private async getChangeStatistics(
    branch: string,
    baseBranch: string = 'main',
  ): Promise<{
    linesAdded: number;
    linesRemoved: number;
    filesChanged: number;
    testFilesChanged: number;
    configFilesChanged: number;
    binaryFilesChanged: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `git diff --stat ${baseBranch}...${branch}`,
        { cwd: this.projectRoot },
      );

      const lines = stdout.split('\n');
      const summaryLine = lines[lines.length - 2] || '';

      const addedMatch = summaryLine.match(/(\d+) insertion/);
      const removedMatch = summaryLine.match(/(\d+) deletion/);

      const linesAdded = addedMatch ? parseInt(addedMatch[1]) : 0;
      const linesRemoved = removedMatch ? parseInt(removedMatch[1]) : 0;

      // Count different types of files
      const filesChanged = lines.filter((l) => l.includes('|')).length;
      const testFilesChanged = lines.filter(
        (l) =>
          l.includes('.test.') ||
          l.includes('.spec.') ||
          l.includes('__tests__'),
      ).length;
      const configFilesChanged = lines.filter(
        (l) =>
          l.includes('config') ||
          l.includes('.json') ||
          l.includes('.yml') ||
          l.includes('.yaml'),
      ).length;
      const binaryFilesChanged = lines.filter((l) => l.includes('Bin')).length;

      return {
        linesAdded,
        linesRemoved,
        filesChanged,
        testFilesChanged,
        configFilesChanged,
        binaryFilesChanged,
      };
    } catch (error) {
      console.warn('Failed to get change statistics:', error.message);
      return {
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
        testFilesChanged: 0,
        configFilesChanged: 0,
        binaryFilesChanged: 0,
      };
    }
  }

  private async getHistoricalData(author: string): Promise<HistoricalData> {
    try {
      // Get recent PR statistics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { stdout: commitHistory } = await execAsync(
        `git log --author="${author}" --since="${thirtyDaysAgo.toISOString()}" --oneline`,
        { cwd: this.projectRoot },
      );

      const recentCommits = commitHistory
        .split('\n')
        .filter((line) => line.trim()).length;

      // Estimate PR statistics (simplified)
      return {
        author,
        recentPRs: {
          merged: Math.floor(recentCommits / 3), // Estimate PRs from commits
          reverted: 0, // Would need more sophisticated analysis
          hotfixes: 0,
          averageReviewTime: 24, // Default 24 hours
        },
        codeQuality: {
          testCoverage: 75, // Would get from coverage reports
          lintViolations: 0,
          complexityScore: 50,
        },
      };
    } catch (error) {
      return {
        author,
        recentPRs: {
          merged: 0,
          reverted: 0,
          hotfixes: 0,
          averageReviewTime: 48,
        },
        codeQuality: {
          testCoverage: 0,
          lintViolations: 0,
          complexityScore: 50,
        },
      };
    }
  }

  // Risk factor implementations
  private async assessCodeComplexity(data: any): Promise<RiskFactor> {
    const { changeStats } = data;
    const evidence: string[] = [];

    // Simple complexity heuristics
    let score = 30; // Start with low risk

    const totalChanges = changeStats.linesAdded + changeStats.linesRemoved;
    if (totalChanges > 500) {
      score += 30;
      evidence.push(`Large change: ${totalChanges} lines modified`);
    } else if (totalChanges > 100) {
      score += 15;
      evidence.push(`Medium change: ${totalChanges} lines modified`);
    }

    if (changeStats.filesChanged > 20) {
      score += 25;
      evidence.push(`Many files changed: ${changeStats.filesChanged} files`);
    } else if (changeStats.filesChanged > 5) {
      score += 10;
      evidence.push(
        `Multiple files changed: ${changeStats.filesChanged} files`,
      );
    }

    return {
      name: 'code-complexity',
      weight: 0.2,
      score: Math.min(100, score),
      evidence,
      confidence: 0.8,
      category: 'technical',
    };
  }

  private async assessTestCoverage(data: any): Promise<RiskFactor> {
    const { changeStats, historicalData } = data;
    const evidence: string[] = [];
    let score = 50;

    // Check if tests were added/modified
    const hasTestChanges = changeStats.testFilesChanged > 0;
    const testRatio =
      changeStats.testFilesChanged / Math.max(1, changeStats.filesChanged);

    if (!hasTestChanges && changeStats.filesChanged > 3) {
      score += 40;
      evidence.push('No test files modified despite significant code changes');
    } else if (testRatio < 0.2) {
      score += 20;
      evidence.push('Low ratio of test file changes to code changes');
    } else {
      score -= 10;
      evidence.push(
        `Good test coverage: ${changeStats.testFilesChanged} test files updated`,
      );
    }

    if (historicalData.codeQuality.testCoverage < 60) {
      score += 15;
      evidence.push('Author has historically low test coverage');
    }

    return {
      name: 'test-coverage',
      weight: 0.25,
      score: Math.min(100, Math.max(0, score)),
      evidence,
      confidence: 0.9,
      category: 'technical',
    };
  }

  private async assessFileRisk(data: any): Promise<RiskFactor> {
    const { files } = data;
    const evidence: string[] = [];
    let score = 20;

    const criticalFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'Dockerfile',
      'docker-compose.yml',
      '.github/workflows',
      'ci/',
      'build/',
      'config/',
      'env',
      '.env',
    ];

    const criticalPaths = [
      'auth',
      'security',
      'payment',
      'billing',
      'database',
      'migration',
      'schema',
    ];

    for (const file of files) {
      // Check for critical files
      if (criticalFiles.some((cf) => file.includes(cf))) {
        score += 20;
        evidence.push(`Critical file modified: ${file}`);
      }

      // Check for critical paths
      if (criticalPaths.some((cp) => file.toLowerCase().includes(cp))) {
        score += 15;
        evidence.push(`High-risk area: ${file}`);
      }

      // Check for generated files
      if (
        file.includes('dist/') ||
        file.includes('build/') ||
        file.includes('.min.')
      ) {
        score += 10;
        evidence.push(`Generated file modified: ${file}`);
      }
    }

    return {
      name: 'file-risk',
      weight: 0.15,
      score: Math.min(100, score),
      evidence,
      confidence: 0.95,
      category: 'business',
    };
  }

  private async assessAuthorHistory(data: any): Promise<RiskFactor> {
    const { author, historicalData } = data;
    const evidence: string[] = [];
    let score = 50;

    const { recentPRs } = historicalData;

    // New contributor risk
    if (recentPRs.merged === 0) {
      score += 30;
      evidence.push('New contributor - limited history');
    } else if (recentPRs.merged < 3) {
      score += 15;
      evidence.push('Infrequent contributor');
    } else {
      score -= 10;
      evidence.push(`Experienced contributor: ${recentPRs.merged} recent PRs`);
    }

    // Revert history
    if (recentPRs.reverted > 0) {
      score += recentPRs.reverted * 20;
      evidence.push(`${recentPRs.reverted} recent reverts`);
    }

    // Hotfix history
    if (recentPRs.hotfixes > 0) {
      score += recentPRs.hotfixes * 15;
      evidence.push(`${recentPRs.hotfixes} recent hotfixes`);
    }

    return {
      name: 'author-history',
      weight: 0.1,
      score: Math.min(100, Math.max(0, score)),
      evidence,
      confidence: 0.7,
      category: 'process',
    };
  }

  private async assessChangeSize(data: any): Promise<RiskFactor> {
    const { changeStats } = data;
    const evidence: string[] = [];
    let score = 10;

    const totalLines = changeStats.linesAdded + changeStats.linesRemoved;

    if (totalLines > 1000) {
      score += 50;
      evidence.push(`Very large change: ${totalLines} lines`);
    } else if (totalLines > 300) {
      score += 25;
      evidence.push(`Large change: ${totalLines} lines`);
    } else if (totalLines > 100) {
      score += 10;
      evidence.push(`Medium change: ${totalLines} lines`);
    } else {
      evidence.push(`Small change: ${totalLines} lines`);
    }

    if (changeStats.filesChanged > 30) {
      score += 30;
      evidence.push(`Many files: ${changeStats.filesChanged} files`);
    }

    return {
      name: 'change-size',
      weight: 0.15,
      score: Math.min(100, score),
      evidence,
      confidence: 0.9,
      category: 'technical',
    };
  }

  private async assessDependencyRisk(data: any): Promise<RiskFactor> {
    const { files } = data;
    const evidence: string[] = [];
    let score = 20;

    const dependencyFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'requirements.txt',
      'Pipfile',
      'go.mod',
    ];
    const hasDependencyChanges = files.some((file) =>
      dependencyFiles.some((df) => file.includes(df)),
    );

    if (hasDependencyChanges) {
      score += 30;
      evidence.push('Dependency changes detected');

      // Check for major version updates (would need actual diff analysis)
      // This is a simplified check
      evidence.push('Recommend security audit of new dependencies');
    }

    return {
      name: 'dependency-risk',
      weight: 0.1,
      score,
      evidence,
      confidence: hasDependencyChanges ? 0.8 : 0.3,
      category: 'security',
    };
  }

  private async assessSecurityRisk(data: any): Promise<RiskFactor> {
    const { files, title, description } = data;
    const evidence: string[] = [];
    let score = 20;

    const securityKeywords = [
      'auth',
      'password',
      'token',
      'secret',
      'key',
      'crypto',
      'security',
      'permission',
      'role',
      'access',
      'cors',
    ];

    const securityFiles = files.filter((file) =>
      securityKeywords.some((keyword) => file.toLowerCase().includes(keyword)),
    );

    if (securityFiles.length > 0) {
      score += 25;
      evidence.push(`Security-related files: ${securityFiles.join(', ')}`);
    }

    // Check PR description for security context
    const titleDesc = `${title} ${description}`.toLowerCase();
    const securityMentioned = securityKeywords.some((keyword) =>
      titleDesc.includes(keyword),
    );

    if (securityMentioned) {
      score += 15;
      evidence.push('Security-related changes mentioned in PR');
    }

    return {
      name: 'security-risk',
      weight: 0.15,
      score,
      evidence,
      confidence: 0.8,
      category: 'security',
    };
  }

  private async assessProcessAdherence(data: any): Promise<RiskFactor> {
    const { title, description, commits } = data;
    const evidence: string[] = [];
    let score = 30;

    // Check PR title format
    const hasIssueReference = /\b(fixes|closes|resolves)\s+#\d+/i.test(title);
    const hasConventionalCommits = commits.some((commit) =>
      /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/.test(
        commit.message,
      ),
    );

    if (!hasIssueReference) {
      score += 15;
      evidence.push('No issue reference in title');
    } else {
      evidence.push('Links to issue');
    }

    if (!hasConventionalCommits) {
      score += 10;
      evidence.push('Non-conventional commit messages');
    }

    if (!description || description.length < 50) {
      score += 20;
      evidence.push('Minimal or missing PR description');
    }

    return {
      name: 'process-adherence',
      weight: 0.05,
      score: Math.min(100, score),
      evidence,
      confidence: 0.6,
      category: 'process',
    };
  }

  private async assessTimingRisk(data: any): Promise<RiskFactor> {
    const evidence: string[] = [];
    let score = 20;

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend or after-hours deployments are riskier
    if (day === 0 || day === 6) {
      score += 25;
      evidence.push('Weekend deployment');
    }

    if (hour < 9 || hour > 17) {
      score += 15;
      evidence.push('After-hours deployment');
    }

    // Friday deployments
    if (day === 5 && hour > 15) {
      score += 20;
      evidence.push('Late Friday deployment');
    }

    return {
      name: 'timing-risk',
      weight: 0.05,
      score,
      evidence,
      confidence: 0.8,
      category: 'process',
    };
  }

  private async assessRollbackRisk(data: any): Promise<RiskFactor> {
    const { files, changeStats } = data;
    const evidence: string[] = [];
    let score = 30;

    // Database migrations
    const hasMigrations = files.some(
      (file) => file.includes('migration') || file.includes('schema'),
    );

    if (hasMigrations) {
      score += 30;
      evidence.push('Database migrations present - rollback complexity high');
    }

    // Infrastructure changes
    const hasInfraChanges = files.some(
      (file) =>
        file.includes('docker') ||
        file.includes('k8s') ||
        file.includes('terraform'),
    );

    if (hasInfraChanges) {
      score += 20;
      evidence.push('Infrastructure changes - rollback coordination needed');
    }

    // Configuration changes
    if (changeStats.configFilesChanged > 0) {
      score += 15;
      evidence.push('Configuration changes may require restarts');
    }

    return {
      name: 'rollback-risk',
      weight: 0.1,
      score,
      evidence,
      confidence: 0.7,
      category: 'business',
    };
  }

  private generateRecommendation(
    overall: number,
    factors: RiskFactor[],
  ): 'auto-merge' | 'review-recommended' | 'manual-review' | 'block' {
    // Check for blocking factors
    const criticalFactors = factors.filter(
      (f) =>
        f.score > 80 &&
        f.confidence > 0.8 &&
        (f.category === 'security' || f.category === 'business'),
    );

    if (criticalFactors.length > 0) {
      return 'block';
    }

    if (overall >= 75) {
      return 'manual-review';
    } else if (overall >= 50) {
      return 'review-recommended';
    } else if (overall >= 25) {
      return 'review-recommended'; // Still recommend review for moderate risk
    } else {
      return 'auto-merge';
    }
  }

  private collectEvidence(factors: RiskFactor[]): {
    positive: string[];
    negative: string[];
    neutral: string[];
  } {
    const evidence = {
      positive: [] as string[],
      negative: [] as string[],
      neutral: [] as string[],
    };

    for (const factor of factors) {
      if (factor.score < 30) {
        evidence.positive.push(...factor.evidence);
      } else if (factor.score > 70) {
        evidence.negative.push(...factor.evidence);
      } else {
        evidence.neutral.push(...factor.evidence);
      }
    }

    return evidence;
  }

  private async persistRiskScore(score: RiskScore): Promise<void> {
    const scoresDir = join(this.projectRoot, '.maestro', 'risk-scores');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `risk-score-${score.metadata.prNumber || 'unknown'}-${timestamp}.json`;

    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(scoresDir, { recursive: true });
      await writeFile(
        join(scoresDir, filename),
        JSON.stringify(score, null, 2),
      );
    } catch (error) {
      console.warn('Failed to persist risk score:', error);
    }
  }

  async getHistoricalRiskScores(
    author?: string,
    days: number = 30,
  ): Promise<RiskScore[]> {
    try {
      const scoresDir = join(this.projectRoot, '.maestro', 'risk-scores');
      await access(scoresDir);

      const { readdir } = await import('fs/promises');
      const files = await readdir(scoresDir);

      const scores: RiskScore[] = [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      for (const file of files.filter((f) => f.endsWith('.json'))) {
        try {
          const content = await readFile(join(scoresDir, file), 'utf8');
          const score: RiskScore = JSON.parse(content);

          const scoreDate = new Date(score.metadata.timestamp);
          if (scoreDate >= cutoff) {
            if (!author || score.metadata.author === author) {
              scores.push(score);
            }
          }
        } catch (error) {
          console.warn(
            `Failed to load risk score from ${file}:`,
            error.message,
          );
        }
      }

      return scores.sort(
        (a, b) =>
          new Date(b.metadata.timestamp).getTime() -
          new Date(a.metadata.timestamp).getTime(),
      );
    } catch {
      return [];
    }
  }
}
