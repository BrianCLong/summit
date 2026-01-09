
import { PRRiskScorer } from '../../src/risk/riskScorer.ts';
import fs from 'fs';

// Mock the scorer to use synthetic data instead of git
class SyntheticRiskScorer extends PRRiskScorer {
  private syntheticStats: any;

  constructor(syntheticStats: any) {
    super();
    this.syntheticStats = syntheticStats;
  }

  // Override to return synthetic stats
  // @ts-ignore
  protected async getChangeStatistics(branch: string, baseBranch: string): Promise<any> {
    return {
      linesAdded: this.syntheticStats.linesAdded || 0,
      linesRemoved: this.syntheticStats.linesRemoved || 0,
      filesChanged: this.syntheticStats.files?.length || 0,
      testFilesChanged: this.syntheticStats.files?.filter((f: string) => f.includes('test') || f.includes('spec')).length || 0,
      configFilesChanged: this.syntheticStats.files?.filter((f: string) => f.includes('config') || f.endsWith('.json') || f.endsWith('.yaml')).length || 0,
      binaryFilesChanged: 0
    };
  }

  // Override to return synthetic historical data
  // @ts-ignore
  protected async getHistoricalData(author: string): Promise<any> {
    return {
      author,
      recentPRs: {
        merged: 10,
        reverted: 0,
        hotfixes: 0,
        averageReviewTime: 24
      },
      codeQuality: {
        testCoverage: 80,
        lintViolations: 0,
        complexityScore: 40
      }
    };
  }
}

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error('Usage: npx tsx validate_change_risk.ts <path-to-scenario-json>');
    process.exit(1);
  }

  try {
    const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
    const scenario = JSON.parse(scenarioContent);

    const scorer = new SyntheticRiskScorer(scenario);

    // Suppress console.log/warn during scoring to avoid polluting JSON output
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};

    try {
      // We pass the scenario data as the "PR data"
      const score = await scorer.scorePR({
        author: 'governance-bot',
        title: scenario.title || 'Synthetic Governance Test',
        description: scenario.description || 'Synthetic scenario for governance testing',
        branch: 'synthetic-branch',
        baseBranch: 'main',
        files: scenario.files || [],
        commits: scenario.commits || []
      });

      // Restore console
      console.log = originalLog;
      console.warn = originalWarn;

      console.log(JSON.stringify(score, null, 2));
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }
  } catch (error) {
    console.error('Error validating change risk:', error);
    process.exit(1);
  }
}

main();
