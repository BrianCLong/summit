import { PRRiskScorer } from './riskScorer';

export { PRRiskScorer };

// Utility functions for easy integration
export async function scorePRRisk(options: {
  author: string;
  title: string;
  description: string;
  branch: string;
  baseBranch?: string;
  files: string[];
  commits: any[];
  number?: number;
  projectRoot?: string;
}) {
  const scorer = new PRRiskScorer(options.projectRoot);

  return await scorer.scorePR({
    number: options.number,
    author: options.author,
    title: options.title,
    description: options.description,
    branch: options.branch,
    baseBranch: options.baseBranch || 'main',
    files: options.files,
    commits: options.commits,
  });
}

// Risk analysis helpers
export class RiskAnalyzer {
  private scorer: PRRiskScorer;

  constructor(projectRoot?: string) {
    this.scorer = new PRRiskScorer(projectRoot);
  }

  async analyzeCurrentBranch(): Promise<any> {
    try {
      const { execSync } = require('child_process');

      // Get current branch info
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim();
      const author = execSync('git log -1 --pretty=format:"%an"', {
        encoding: 'utf8',
      }).trim();

      // Get changed files
      const changedFiles = execSync('git diff --name-only HEAD~1', {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter((f) => f);

      // Get commits
      const commitLog = execSync('git log --oneline HEAD~1..HEAD', {
        encoding: 'utf8',
      });
      const commits = commitLog
        .trim()
        .split('\n')
        .map((line) => {
          const [hash, ...messageParts] = line.split(' ');
          return {
            hash,
            message: messageParts.join(' '),
          };
        });

      return await this.scorer.scorePR({
        author,
        title: 'Current Branch Analysis',
        description: 'Risk analysis of current branch changes',
        branch,
        baseBranch: 'main',
        files: changedFiles,
        commits,
      });
    } catch (error) {
      throw new Error(`Failed to analyze current branch: ${error.message}`);
    }
  }

  async analyzeCommitRange(from: string, to: string = 'HEAD'): Promise<any> {
    try {
      const { execSync } = require('child_process');

      const author = execSync(`git log -1 --pretty=format:"%an" ${to}`, {
        encoding: 'utf8',
      }).trim();

      const changedFiles = execSync(`git diff --name-only ${from}..${to}`, {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter((f) => f);

      const commitLog = execSync(`git log --oneline ${from}..${to}`, {
        encoding: 'utf8',
      });
      const commits = commitLog
        .trim()
        .split('\n')
        .map((line) => {
          const [hash, ...messageParts] = line.split(' ');
          return {
            hash,
            message: messageParts.join(' '),
          };
        });

      return await this.scorer.scorePR({
        author,
        title: `Commit Range Analysis: ${from}..${to}`,
        description: 'Risk analysis of commit range',
        branch: to,
        baseBranch: from,
        files: changedFiles,
        commits,
      });
    } catch (error) {
      throw new Error(`Failed to analyze commit range: ${error.message}`);
    }
  }

  async generateRiskReport(
    author?: string,
    days: number = 30,
  ): Promise<{
    summary: {
      totalPRs: number;
      averageRisk: number;
      highRiskPRs: number;
      autoMergeEligible: number;
    };
    trends: {
      riskTrend: 'improving' | 'stable' | 'concerning';
      riskByCategory: Record<string, number>;
      commonIssues: string[];
    };
    recommendations: string[];
  }> {
    const scores = await this.scorer.getHistoricalRiskScores(author, days);

    if (scores.length === 0) {
      return {
        summary: {
          totalPRs: 0,
          averageRisk: 0,
          highRiskPRs: 0,
          autoMergeEligible: 0,
        },
        trends: {
          riskTrend: 'stable',
          riskByCategory: {},
          commonIssues: [],
        },
        recommendations: ['No historical data available'],
      };
    }

    // Calculate summary
    const averageRisk =
      scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;
    const highRiskPRs = scores.filter((s) => s.overall >= 75).length;
    const autoMergeEligible = scores.filter(
      (s) => s.recommendation === 'auto-merge',
    ).length;

    // Analyze trends
    const recentScores = scores.slice(0, Math.ceil(scores.length / 2));
    const olderScores = scores.slice(Math.ceil(scores.length / 2));

    const recentAvg =
      recentScores.reduce((sum, s) => sum + s.overall, 0) / recentScores.length;
    const olderAvg =
      olderScores.length > 0
        ? olderScores.reduce((sum, s) => sum + s.overall, 0) /
          olderScores.length
        : recentAvg;

    let riskTrend: 'improving' | 'stable' | 'concerning' = 'stable';
    if (recentAvg < olderAvg - 10) riskTrend = 'improving';
    else if (recentAvg > olderAvg + 10) riskTrend = 'concerning';

    // Risk by category
    const riskByCategory: Record<string, number> = {};
    for (const score of scores) {
      for (const factor of score.factors) {
        if (!riskByCategory[factor.category]) {
          riskByCategory[factor.category] = 0;
        }
        riskByCategory[factor.category] += factor.score * factor.weight;
      }
    }

    // Normalize by count
    for (const category in riskByCategory) {
      riskByCategory[category] /= scores.length;
    }

    // Common issues
    const allEvidence = scores.flatMap((s) => s.evidence.negative);
    const evidenceCounts: Record<string, number> = {};

    for (const evidence of allEvidence) {
      evidenceCounts[evidence] = (evidenceCounts[evidence] || 0) + 1;
    }

    const commonIssues = Object.entries(evidenceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    // Generate recommendations
    const recommendations: string[] = [];

    if (averageRisk > 60) {
      recommendations.push('Consider breaking down changes into smaller PRs');
    }

    if (riskTrend === 'concerning') {
      recommendations.push(
        'Risk trend is concerning - review development practices',
      );
    }

    if (riskByCategory.technical > 50) {
      recommendations.push('Focus on reducing technical complexity');
    }

    if (riskByCategory.security > 40) {
      recommendations.push('Implement additional security review processes');
    }

    if (commonIssues.length > 0) {
      recommendations.push(`Address common issues: ${commonIssues[0]}`);
    }

    if (autoMergeEligible / scores.length < 0.2) {
      recommendations.push(
        'Very few PRs qualify for auto-merge - consider process improvements',
      );
    }

    return {
      summary: {
        totalPRs: scores.length,
        averageRisk: Math.round(averageRisk),
        highRiskPRs,
        autoMergeEligible,
      },
      trends: {
        riskTrend,
        riskByCategory,
        commonIssues,
      },
      recommendations,
    };
  }
}

// CLI integration helpers
export async function runRiskAnalysis(
  command: string,
  ...args: string[]
): Promise<void> {
  const analyzer = new RiskAnalyzer();

  switch (command) {
    case 'current':
      const currentResult = await analyzer.analyzeCurrentBranch();
      console.log(JSON.stringify(currentResult, null, 2));
      break;

    case 'range':
      if (args.length < 1) {
        throw new Error('Usage: range <from-commit> [to-commit]');
      }
      const rangeResult = await analyzer.analyzeCommitRange(args[0], args[1]);
      console.log(JSON.stringify(rangeResult, null, 2));
      break;

    case 'report':
      const author = args[0];
      const days = args[1] ? parseInt(args[1]) : 30;
      const report = await analyzer.generateRiskReport(author, days);
      console.log(JSON.stringify(report, null, 2));
      break;

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Export types for external use
export type { RiskFactor, RiskScore } from './riskScorer';
