/**
 * Flaky Test Detection and Management System
 * Sprint 27B: Automated flaky test identification and quarantine
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

export interface TestResult {
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  retryCount: number;
  timestamp: Date;
  environment: 'local' | 'ci';
  runId: string;
}

export interface FlakyTest {
  testFile: string;
  testName: string;
  failureRate: number;
  totalRuns: number;
  failures: number;
  lastFailure: Date;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

export interface StabilityMetrics {
  overallStability: number;
  totalTests: number;
  flakyTests: number;
  quarantinedTests: number;
  recentlyFixed: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}

export class FlakyTestDetector {
  private killListPath = 'tests/flaky/kill-list.yml';
  private testResultsPath = 'reports/test-results';
  private minimumRuns = 20;
  private flakyThreshold = 0.05; // 5% failure rate

  constructor() {
    this.ensureDirectoriesExist();
  }

  /**
   * Analyze test results and detect flaky tests
   */
  async detectFlaky(testResults: TestResult[]): Promise<FlakyTest[]> {
    const testStats = this.aggregateTestStats(testResults);
    const flakyTests: FlakyTest[] = [];

    for (const [testKey, stats] of testStats.entries()) {
      if (this.isFlakyTest(stats)) {
        const [testFile, testName] = testKey.split('::');

        flakyTests.push({
          testFile,
          testName,
          failureRate: stats.failures / stats.totalRuns,
          totalRuns: stats.totalRuns,
          failures: stats.failures,
          lastFailure: stats.lastFailure,
          pattern: this.detectPattern(stats),
          severity: this.calculateSeverity(stats),
          reason: this.detectReason(stats)
        });
      }
    }

    return flakyTests.sort((a, b) => b.failureRate - a.failureRate);
  }

  /**
   * Quarantine a flaky test
   */
  async quarantineTest(test: FlakyTest, assignee?: string): Promise<void> {
    const killList = this.loadKillList();

    const quarantinedTest = {
      test_file: test.testFile,
      test_name: test.testName,
      reason: test.reason || 'Automatically detected flaky behavior',
      quarantine_date: new Date().toISOString().split('T')[0],
      assigned_to: assignee || 'qa-team',
      github_issue: await this.createGitHubIssue(test),
      priority: this.mapSeverityToPriority(test.severity),
      estimated_fix_date: this.calculateEstimatedFixDate(test.severity),
      flake_rate: `${(test.failureRate * 100).toFixed(1)}%`
    };

    killList.quarantined_tests = killList.quarantined_tests || [];
    killList.quarantined_tests.push(quarantinedTest);
    killList.metadata.total_quarantined = killList.quarantined_tests.length;
    killList.metadata.last_updated = new Date().toISOString();

    this.saveKillList(killList);

    console.log(` Quarantined flaky test: ${test.testFile}::${test.testName}`);
    await this.notifySlack(`=� Flaky test quarantined: \`${test.testFile}::${test.testName}\` (${(test.failureRate * 100).toFixed(1)}% failure rate)`);
  }

  /**
   * Mark a test as fixed and move to monitoring
   */
  async markTestFixed(testFile: string, testName: string, fixDescription: string, prLink?: string): Promise<void> {
    const killList = this.loadKillList();

    // Remove from quarantined
    killList.quarantined_tests = killList.quarantined_tests?.filter(
      t => !(t.test_file === testFile && t.test_name === testName)
    ) || [];

    // Add to recently fixed for monitoring
    const fixedTest = {
      test_file: testFile,
      test_name: testName,
      fixed_date: new Date().toISOString().split('T')[0],
      fix_description: fixDescription,
      pr_link: prLink,
      monitoring_until: this.calculateMonitoringDate()
    };

    killList.recently_fixed = killList.recently_fixed || [];
    killList.recently_fixed.push(fixedTest);

    // Update metadata
    killList.metadata.total_quarantined = killList.quarantined_tests.length;
    killList.metadata.total_fixed = (killList.metadata.total_fixed || 0) + 1;
    killList.metadata.last_updated = new Date().toISOString();

    this.saveKillList(killList);

    console.log(` Marked test as fixed: ${testFile}::${testName}`);
    await this.notifySlack(`<� Flaky test fixed: \`${testFile}::${testName}\` - ${fixDescription}`);
  }

  /**
   * Generate stability report
   */
  generateStabilityReport(testResults: TestResult[]): StabilityMetrics {
    const killList = this.loadKillList();
    const testStats = this.aggregateTestStats(testResults);

    const totalTests = testStats.size;
    const flakyTests = Array.from(testStats.values()).filter(stats => this.isFlakyTest(stats)).length;
    const quarantinedTests = killList.quarantined_tests?.length || 0;
    const recentlyFixed = killList.recently_fixed?.length || 0;

    const overallStability = totalTests > 0
      ? ((totalTests - flakyTests) / totalTests) * 100
      : 100;

    return {
      overallStability,
      totalTests,
      flakyTests,
      quarantinedTests,
      recentlyFixed,
      trendDirection: this.calculateTrend(testResults)
    };
  }

  /**
   * Run flaky test detection on recent test results
   */
  async runDetection(): Promise<void> {
    console.log('🔍 Running flaky test detection...');

    const testResults = await this.loadRecentTestResults();
    console.log(`=� Analyzing ${testResults.length} test results`);

    const flakyTests = await this.detectFlaky(testResults);
    console.log(`=� Found ${flakyTests.length} potentially flaky tests`);

    // Auto-quarantine severely flaky tests
    const killList = this.loadKillList();
    const autoQuarantineThreshold = 0.2; // 20% failure rate

    for (const test of flakyTests) {
      if (test.failureRate >= autoQuarantineThreshold) {
        const isAlreadyQuarantined = killList.quarantined_tests?.some(
          q => q.test_file === test.testFile && q.test_name === test.testName
        );

        if (!isAlreadyQuarantined) {
          console.log(`=� Auto-quarantining severely flaky test: ${test.testFile}::${test.testName}`);
          await this.quarantineTest(test);
        }
      }
    }

    // Generate report
    const stability = this.generateStabilityReport(testResults);
    console.log(`=� Overall test stability: ${stability.overallStability.toFixed(2)}%`);

    if (stability.overallStability < 99.0) {
      console.log('�  Test stability below target (99%)');
      await this.notifySlack(`� Test stability below target: ${stability.overallStability.toFixed(2)}% (${stability.flakyTests} flaky tests)`);
    }
  }

  /**
   * Validate that a previously flaky test is now stable
   */
  async validateFix(testFile: string, testName: string, runs = 50): Promise<boolean> {
    console.log(`>� Validating fix for ${testFile}::${testName} over ${runs} runs...`);

    let failures = 0;
    for (let i = 0; i < runs; i++) {
      try {
        const result = execSync(`npm test -- --testPathPattern="${testFile}" --testNamePattern="${testName}"`,
          { encoding: 'utf8', stdio: 'pipe' });
        process.stdout.write(i % 10 === 9 ? `${i + 1}\n` : '.');
      } catch (error) {
        failures++;
        process.stdout.write('F');
      }
    }

    const failureRate = failures / runs;
    const isStable = failureRate < this.flakyThreshold;

    console.log(`\n=� Validation results: ${failures}/${runs} failures (${(failureRate * 100).toFixed(1)}%)`);
    console.log(isStable ? '✅ Test is now stable!' : '❌ Test is still flaky');

    return isStable;
  }

  private aggregateTestStats(testResults: TestResult[]): Map<string, any> {
    const stats = new Map();

    for (const result of testResults) {
      const key = `${result.testFile}::${result.testName}`;

      if (!stats.has(key)) {
        stats.set(key, {
          totalRuns: 0,
          failures: 0,
          passes: 0,
          durations: [],
          errors: [],
          lastFailure: null,
          firstSeen: result.timestamp,
          environments: new Set()
        });
      }

      const stat = stats.get(key);
      stat.totalRuns++;
      stat.environments.add(result.environment);
      stat.durations.push(result.duration);

      if (result.status === 'failed') {
        stat.failures++;
        stat.lastFailure = result.timestamp;
        if (result.error) {
          stat.errors.push(result.error);
        }
      } else if (result.status === 'passed') {
        stat.passes++;
      }
    }

    return stats;
  }

  private isFlakyTest(stats: any): boolean {
    return stats.totalRuns >= this.minimumRuns &&
           stats.failures > 0 &&
           (stats.failures / stats.totalRuns) >= this.flakyThreshold &&
           (stats.failures / stats.totalRuns) < 1.0; // Not completely broken
  }

  private detectPattern(stats: any): string {
    const failureRate = stats.failures / stats.totalRuns;

    if (failureRate > 0.5) return 'highly_unstable';
    if (failureRate > 0.2) return 'moderately_flaky';
    if (failureRate > 0.1) return 'occasionally_flaky';
    return 'rarely_flaky';
  }

  private calculateSeverity(stats: any): 'low' | 'medium' | 'high' | 'critical' {
    const failureRate = stats.failures / stats.totalRuns;

    if (failureRate > 0.5) return 'critical';
    if (failureRate > 0.2) return 'high';
    if (failureRate > 0.1) return 'medium';
    return 'low';
  }

  private detectReason(stats: any): string {
    const errors = stats.errors.join(' ').toLowerCase();

    if (errors.includes('timeout')) return 'Test timeout - likely timing dependency';
    if (errors.includes('network') || errors.includes('connection')) return 'Network dependency causing failures';
    if (errors.includes('race') || errors.includes('concurrent')) return 'Race condition detected';
    if (errors.includes('file') || errors.includes('directory')) return 'File system timing issue';
    if (errors.includes('database') || errors.includes('db')) return 'Database state dependency';

    return 'Unknown flaky pattern - requires investigation';
  }

  private calculateTrend(testResults: TestResult[]): 'improving' | 'stable' | 'degrading' {
    // Simple trend calculation based on recent failure rates
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentResults = testResults.filter(r => r.timestamp >= oneWeekAgo);
    const olderResults = testResults.filter(r => r.timestamp >= twoWeeksAgo && r.timestamp < oneWeekAgo);

    const recentFailureRate = recentResults.length > 0
      ? recentResults.filter(r => r.status === 'failed').length / recentResults.length
      : 0;

    const olderFailureRate = olderResults.length > 0
      ? olderResults.filter(r => r.status === 'failed').length / olderResults.length
      : 0;

    const difference = recentFailureRate - olderFailureRate;

    if (Math.abs(difference) < 0.01) return 'stable';
    return difference < 0 ? 'improving' : 'degrading';
  }

  private async loadRecentTestResults(): Promise<TestResult[]> {
    // In a real implementation, this would load from your test result storage
    // For now, return empty array
    return [];
  }

  private loadKillList(): any {
    try {
      const content = fs.readFileSync(this.killListPath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      return {
        metadata: {
          last_updated: new Date().toISOString(),
          total_quarantined: 0,
          total_fixed: 0,
          stability_target: 99.5
        },
        quarantined_tests: [],
        recently_fixed: []
      };
    }
  }

  private saveKillList(killList: any): void {
    const yamlContent = yaml.dump(killList, { indent: 2 });
    fs.writeFileSync(this.killListPath, yamlContent, 'utf8');
  }

  private async createGitHubIssue(test: FlakyTest): Promise<string> {
    // In a real implementation, this would create a GitHub issue
    return `#${Math.floor(Math.random() * 10000)}`;
  }

  private async notifySlack(message: string): Promise<void> {
    // In a real implementation, this would send to Slack
    console.log(`Slack notification: ${message}`);
  }

  private mapSeverityToPriority(severity: string): string {
    const mapping = {
      critical: 'high',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return mapping[severity] || 'medium';
  }

  private calculateEstimatedFixDate(severity: string): string {
    const daysToAdd = {
      critical: 1,
      high: 3,
      medium: 7,
      low: 14
    };

    const days = daysToAdd[severity] || 7;
    const fixDate = new Date();
    fixDate.setDate(fixDate.getDate() + days);

    return fixDate.toISOString().split('T')[0];
  }

  private calculateMonitoringDate(): string {
    const monitoringDate = new Date();
    monitoringDate.setDate(monitoringDate.getDate() + 30); // Monitor for 30 days
    return monitoringDate.toISOString().split('T')[0];
  }

  private ensureDirectoriesExist(): void {
    const dirs = [
      path.dirname(this.killListPath),
      this.testResultsPath
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const detector = new FlakyTestDetector();
  const command = process.argv[2];

  switch (command) {
    case 'detect':
      detector.runDetection();
      break;

    case 'validate':
      const [testFile, testName] = process.argv[3].split('::');
      detector.validateFix(testFile, testName);
      break;

    case 'quarantine':
      // Would need test file and name from command line
      console.log('Use: npm run test:quarantine -- --test-pattern="file::name"');
      break;

    case 'report':
      // Generate and display stability report
      console.log('Generating stability report...');
      break;

    default:
      console.log('Available commands: detect, validate, quarantine, report');
  }
}