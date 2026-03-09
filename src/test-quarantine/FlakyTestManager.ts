/**
 * Flaky Test Quarantine System - Composer vNext+1
 * Detect, isolate, and manage flaky tests with owner assignment and reporting
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';

export interface TestResult {
  name: string;
  path: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  retries: number;
  error?: string;
  timestamp: number;
}

export interface FlakyTestRecord {
  testName: string;
  testPath: string;
  firstDetected: number;
  lastSeen: number;
  totalRuns: number;
  failures: number;
  flakeRate: number;
  quarantineReason: string;
  owner?: string;
  assignedDate?: number;
  status: 'quarantined' | 'investigating' | 'fixed' | 'permanent_quarantine';
  failurePatterns: Array<{
    error: string;
    count: number;
    lastSeen: number;
  }>;
  retryPatterns: {
    passAfterRetry: number;
    failAfterRetry: number;
    maxRetriesNeeded: number;
  };
}

export interface QuarantineConfig {
  flakeThreshold: number; // 0.0-1.0, rate to trigger quarantine
  minRunsForDetection: number;
  retryIndicatesFlake: boolean;
  quarantineAfterConsecutiveFlakes: number;
  ownerAssignmentEnabled: boolean;
  notificationWebhook?: string;
  reportSchedule: 'daily' | 'weekly';
}

export interface QuarantineStats {
  totalQuarantined: number;
  activeQuarantined: number;
  fixedThisWeek: number;
  topFlakeReasons: Array<{ reason: string; count: number }>;
  ownerAssignmentRate: number;
  avgTimeToFix: number;
}

export class FlakyTestManager extends EventEmitter {
  private testHistory = new Map<string, TestResult[]>();
  private quarantinedTests = new Map<string, FlakyTestRecord>();
  private ownersMap = new Map<string, string>();
  private reportData: Array<{
    date: number;
    totalTests: number;
    flakyTests: number;
    quarantinedTests: number;
  }> = [];

  constructor(
    private config: QuarantineConfig,
    private projectRoot: string = process.cwd(),
  ) {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔬 Initializing Flaky Test Manager...');

    await this.loadHistoricalData();
    await this.loadOwnersMap();

    // Schedule periodic reports
    this.scheduleReports();

    console.log(
      `✅ Flaky Test Manager initialized: ${this.quarantinedTests.size} tests in quarantine`,
    );
  }

  /**
   * Process test results and detect flaky tests
   */
  async processTestResults(results: TestResult[]): Promise<void> {
    console.log(`🧪 Processing ${results.length} test results...`);

    let newlyQuarantined = 0;
    let newlyFixed = 0;

    for (const result of results) {
      const testKey = `${result.path}::${result.name}`;

      // Update test history
      if (!this.testHistory.has(testKey)) {
        this.testHistory.set(testKey, []);
      }

      const history = this.testHistory.get(testKey)!;
      history.push(result);

      // Keep only recent history
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
      const recentHistory = history.filter((h) => h.timestamp > cutoff);
      this.testHistory.set(testKey, recentHistory);

      // Analyze for flakiness
      const flakeAnalysis = this.analyzeFlakiness(testKey, recentHistory);

      if (flakeAnalysis.isFlaky) {
        if (!this.quarantinedTests.has(testKey)) {
          // New flaky test detected
          await this.quarantineTest(testKey, result, flakeAnalysis);
          newlyQuarantined++;
        } else {
          // Update existing quarantine record
          await this.updateQuarantineRecord(testKey, result, flakeAnalysis);
        }
      } else if (this.quarantinedTests.has(testKey)) {
        // Check if previously flaky test is now stable
        const quarantineRecord = this.quarantinedTests.get(testKey)!;

        if (this.isTestStabilized(testKey, recentHistory)) {
          await this.releaseFromQuarantine(testKey, 'stabilized');
          newlyFixed++;
        }
      }
    }

    if (newlyQuarantined > 0 || newlyFixed > 0) {
      console.log(
        `📊 Quarantine update: +${newlyQuarantined} quarantined, +${newlyFixed} fixed`,
      );

      // Send notifications if enabled
      if (newlyQuarantined > 0) {
        await this.notifyNewQuarantines(newlyQuarantined);
      }
    }

    // Save updated data
    await this.saveQuarantineData();
  }

  private analyzeFlakiness(
    testKey: string,
    history: TestResult[],
  ): {
    isFlaky: boolean;
    flakeRate: number;
    reason: string;
    patterns: any;
  } {
    if (history.length < this.config.minRunsForDetection) {
      return {
        isFlaky: false,
        flakeRate: 0,
        reason: 'insufficient_data',
        patterns: {},
      };
    }

    const totalRuns = history.length;
    const failures = history.filter((h) => h.status === 'failed').length;
    const retryPasses = history.filter(
      (h) => h.retries > 0 && h.status === 'passed',
    ).length;

    // Calculate basic flake rate
    let flakeRate = 0;
    let reason = 'stable';

    // Pattern 1: Pass-after-retry (strong flake indicator)
    if (this.config.retryIndicatesFlake && retryPasses > 0) {
      flakeRate = Math.max(flakeRate, retryPasses / totalRuns);
      reason = 'pass_after_retry';
    }

    // Pattern 2: Intermittent failures
    const intermittentFailures = this.detectIntermittentFailures(history);
    if (intermittentFailures.count > 0) {
      flakeRate = Math.max(flakeRate, intermittentFailures.count / totalRuns);
      reason = 'intermittent_failures';
    }

    // Pattern 3: Environment-dependent failures
    const environmentFailures = this.detectEnvironmentFailures(history);
    if (environmentFailures.rate > 0) {
      flakeRate = Math.max(flakeRate, environmentFailures.rate);
      reason = 'environment_dependent';
    }

    // Pattern 4: Timing-based failures
    const timingFailures = this.detectTimingFailures(history);
    if (timingFailures.rate > 0) {
      flakeRate = Math.max(flakeRate, timingFailures.rate);
      reason = 'timing_dependent';
    }

    const isFlaky = flakeRate >= this.config.flakeThreshold;

    return {
      isFlaky,
      flakeRate,
      reason,
      patterns: {
        retryPasses,
        intermittentFailures,
        environmentFailures,
        timingFailures,
      },
    };
  }

  private detectIntermittentFailures(history: TestResult[]): {
    count: number;
    pattern: string;
  } {
    let intermittentCount = 0;
    let pattern = 'none';

    // Look for pass-fail-pass patterns
    for (let i = 1; i < history.length - 1; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const next = history[i + 1];

      if (
        prev.status === 'passed' &&
        curr.status === 'failed' &&
        next.status === 'passed'
      ) {
        intermittentCount++;
        pattern = 'pass_fail_pass';
      }
    }

    return { count: intermittentCount, pattern };
  }

  private detectEnvironmentFailures(history: TestResult[]): {
    rate: number;
    environments: string[];
  } {
    // Simplified environment detection based on error patterns
    const environmentErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'cannot connect to Docker',
      'port already in use',
      'database connection failed',
      'network unreachable',
    ];

    const envFailures = history.filter(
      (h) =>
        h.status === 'failed' &&
        h.error &&
        environmentErrors.some((pattern) => h.error!.includes(pattern)),
    );

    return {
      rate: envFailures.length / history.length,
      environments: ['docker', 'network', 'database'],
    };
  }

  private detectTimingFailures(history: TestResult[]): {
    rate: number;
    avgDurationVariance: number;
  } {
    const durations = history.map((h) => h.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
      durations.length;

    // High variance + timeouts indicate timing issues
    const timeoutFailures = history.filter(
      (h) =>
        h.status === 'failed' &&
        h.error &&
        (h.error.includes('timeout') || h.error.includes('exceeded')),
    );

    const timingRate =
      variance > avgDuration * 0.5 && timeoutFailures.length > 0
        ? timeoutFailures.length / history.length
        : 0;

    return {
      rate: timingRate,
      avgDurationVariance: variance,
    };
  }

  private async quarantineTest(
    testKey: string,
    result: TestResult,
    analysis: ReturnType<typeof FlakyTestManager.prototype.analyzeFlakiness>,
  ): Promise<void> {
    console.log(
      `🚨 Quarantining flaky test: ${testKey} (${(analysis.flakeRate * 100).toFixed(1)}% flake rate)`,
    );

    const owner = await this.assignOwner(result.path);

    const quarantineRecord: FlakyTestRecord = {
      testName: result.name,
      testPath: result.path,
      firstDetected: Date.now(),
      lastSeen: result.timestamp,
      totalRuns: this.testHistory.get(testKey)?.length || 1,
      failures:
        this.testHistory.get(testKey)?.filter((h) => h.status === 'failed')
          .length || 0,
      flakeRate: analysis.flakeRate,
      quarantineReason: analysis.reason,
      owner,
      assignedDate: owner ? Date.now() : undefined,
      status: 'quarantined',
      failurePatterns: this.extractFailurePatterns(testKey),
      retryPatterns: this.extractRetryPatterns(testKey),
    };

    this.quarantinedTests.set(testKey, quarantineRecord);

    // Emit event for external listeners
    this.emit('testQuarantined', {
      testKey,
      record: quarantineRecord,
      owner,
    });

    // Notify owner if configured
    if (owner && this.config.notificationWebhook) {
      await this.notifyOwner(owner, quarantineRecord);
    }
  }

  private async updateQuarantineRecord(
    testKey: string,
    result: TestResult,
    analysis: ReturnType<typeof FlakyTestManager.prototype.analyzeFlakiness>,
  ): Promise<void> {
    const record = this.quarantinedTests.get(testKey)!;

    record.lastSeen = result.timestamp;
    record.totalRuns =
      this.testHistory.get(testKey)?.length || record.totalRuns + 1;
    record.failures =
      this.testHistory.get(testKey)?.filter((h) => h.status === 'failed')
        .length || record.failures;
    record.flakeRate = analysis.flakeRate;

    // Update failure patterns
    record.failurePatterns = this.extractFailurePatterns(testKey);
    record.retryPatterns = this.extractRetryPatterns(testKey);

    this.quarantinedTests.set(testKey, record);
  }

  private isTestStabilized(
    testKey: string,
    recentHistory: TestResult[],
  ): boolean {
    // Consider test stable if it has consecutive passes and low failure rate
    const recentRuns = recentHistory.slice(-10); // Last 10 runs
    const consecutivePasses = this.getConsecutivePasses(recentRuns);
    const recentFailureRate =
      recentRuns.filter((h) => h.status === 'failed').length /
      recentRuns.length;

    return consecutivePasses >= 5 && recentFailureRate < 0.1;
  }

  private getConsecutivePasses(history: TestResult[]): number {
    let consecutivePasses = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'passed') {
        consecutivePasses++;
      } else {
        break;
      }
    }

    return consecutivePasses;
  }

  private async releaseFromQuarantine(
    testKey: string,
    reason: string,
  ): Promise<void> {
    const record = this.quarantinedTests.get(testKey);
    if (!record) return;

    console.log(`✅ Releasing test from quarantine: ${testKey} (${reason})`);

    record.status = 'fixed';

    // Keep record for reporting but remove from active quarantine
    this.quarantinedTests.set(testKey, record);

    this.emit('testReleased', {
      testKey,
      record,
      reason,
    });
  }

  private extractFailurePatterns(
    testKey: string,
  ): FlakyTestRecord['failurePatterns'] {
    const history = this.testHistory.get(testKey) || [];
    const failures = history.filter((h) => h.status === 'failed' && h.error);

    const patternMap = new Map<string, { count: number; lastSeen: number }>();

    for (const failure of failures) {
      if (!failure.error) continue;

      // Normalize error message to detect patterns
      const normalizedError = this.normalizeErrorMessage(failure.error);

      if (!patternMap.has(normalizedError)) {
        patternMap.set(normalizedError, { count: 0, lastSeen: 0 });
      }

      const pattern = patternMap.get(normalizedError)!;
      pattern.count++;
      pattern.lastSeen = Math.max(pattern.lastSeen, failure.timestamp);
    }

    return Array.from(patternMap.entries())
      .map(([error, data]) => ({ error, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  private extractRetryPatterns(
    testKey: string,
  ): FlakyTestRecord['retryPatterns'] {
    const history = this.testHistory.get(testKey) || [];

    const retryResults = history.filter((h) => h.retries > 0);
    const passAfterRetry = retryResults.filter(
      (h) => h.status === 'passed',
    ).length;
    const failAfterRetry = retryResults.filter(
      (h) => h.status === 'failed',
    ).length;
    const maxRetriesNeeded = Math.max(...retryResults.map((h) => h.retries), 0);

    return {
      passAfterRetry,
      failAfterRetry,
      maxRetriesNeeded,
    };
  }

  private normalizeErrorMessage(error: string): string {
    // Normalize error messages to detect common patterns
    return error
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        'UUID',
      ) // Replace UUIDs
      .replace(/\/.*\//, '/PATH/') // Replace file paths
      .replace(/at .*:\d+:\d+/, 'at LOCATION') // Replace stack trace locations
      .substring(0, 200); // Truncate long errors
  }

  private async assignOwner(testPath: string): Promise<string | undefined> {
    if (!this.config.ownerAssignmentEnabled) {
      return undefined;
    }

    // Try to find owner from OWNERS/CODEOWNERS files
    let owner = this.ownersMap.get(testPath);

    if (!owner) {
      // Try git blame to find recent contributors
      try {
        const blameOutput = execSync(
          `git log -1 --format="%ae" -- "${testPath}"`,
          {
            encoding: 'utf8',
            cwd: this.projectRoot,
          },
        ).trim();

        owner = blameOutput;
      } catch (error) {
        // Fallback to directory-based ownership
        owner = this.findDirectoryOwner(path.dirname(testPath));
      }
    }

    return owner;
  }

  private findDirectoryOwner(directory: string): string | undefined {
    // Walk up directory tree looking for ownership info
    const parts = directory.split('/');

    while (parts.length > 0) {
      const dirPath = parts.join('/');
      const owner = this.ownersMap.get(dirPath);

      if (owner) return owner;

      parts.pop();
    }

    return undefined;
  }

  private async loadOwnersMap(): Promise<void> {
    const ownersFiles = ['.github/CODEOWNERS', 'OWNERS', '.owners'];

    for (const ownersFile of ownersFiles) {
      const fullPath = path.join(this.projectRoot, ownersFile);

      try {
        const content = await fs.readFile(fullPath, 'utf8');
        this.parseOwnersFile(content);
        console.log(`📋 Loaded owners from ${ownersFile}`);
        break;
      } catch (error) {
        // Try next file
      }
    }
  }

  private parseOwnersFile(content: string): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const pattern = parts[0];
        const owners = parts.slice(1).join(' ');

        // Convert glob pattern to simple mapping
        if (pattern.includes('*')) {
          // Handle glob patterns (simplified)
          const prefix = pattern.replace(/\*.*/, '');
          this.ownersMap.set(prefix, owners);
        } else {
          this.ownersMap.set(pattern, owners);
        }
      }
    }
  }

  private async notifyOwner(
    owner: string,
    record: FlakyTestRecord,
  ): Promise<void> {
    if (!this.config.notificationWebhook) return;

    const message = {
      text: `🚨 Flaky Test Quarantined`,
      attachments: [
        {
          color: 'warning',
          fields: [
            { title: 'Test', value: record.testName, short: true },
            { title: 'Owner', value: owner, short: true },
            {
              title: 'Flake Rate',
              value: `${(record.flakeRate * 100).toFixed(1)}%`,
              short: true,
            },
            { title: 'Reason', value: record.quarantineReason, short: true },
            { title: 'Path', value: record.testPath, short: false },
          ],
        },
      ],
    };

    try {
      // Send webhook notification (implementation depends on webhook service)
      console.log(
        `📧 Notifying ${owner} about quarantined test: ${record.testName}`,
      );
    } catch (error) {
      console.warn('⚠️ Failed to send notification:', error);
    }
  }

  private async notifyNewQuarantines(count: number): Promise<void> {
    console.log(`📊 ${count} new tests quarantined`);
    // Implementation for team notifications
  }

  private scheduleReports(): void {
    const interval =
      this.config.reportSchedule === 'daily'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    setInterval(() => {
      this.generateReport();
    }, interval);
  }

  /**
   * Generate weekly flake report
   */
  async generateReport(): Promise<{
    summary: QuarantineStats;
    detailedReport: string;
  }> {
    console.log('📊 Generating flaky test report...');

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const activeQuarantined = Array.from(this.quarantinedTests.values()).filter(
      (r) => r.status === 'quarantined',
    );

    const recentlyFixed = Array.from(this.quarantinedTests.values()).filter(
      (r) =>
        r.status === 'fixed' && (r.assignedDate || r.firstDetected) > weekAgo,
    );

    const topReasons = this.getTopFlakeReasons();
    const ownerAssignmentRate = this.calculateOwnerAssignmentRate();
    const avgTimeToFix = this.calculateAvgTimeToFix();

    const summary: QuarantineStats = {
      totalQuarantined: this.quarantinedTests.size,
      activeQuarantined: activeQuarantined.length,
      fixedThisWeek: recentlyFixed.length,
      topFlakeReasons: topReasons,
      ownerAssignmentRate,
      avgTimeToFix,
    };

    const detailedReport = this.formatDetailedReport(
      summary,
      activeQuarantined,
    );

    this.emit('reportGenerated', { summary, detailedReport });

    return { summary, detailedReport };
  }

  private getTopFlakeReasons(): Array<{ reason: string; count: number }> {
    const reasonCounts = new Map<string, number>();

    for (const record of this.quarantinedTests.values()) {
      const count = reasonCounts.get(record.quarantineReason) || 0;
      reasonCounts.set(record.quarantineReason, count + 1);
    }

    return Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateOwnerAssignmentRate(): number {
    const total = this.quarantinedTests.size;
    const assigned = Array.from(this.quarantinedTests.values()).filter(
      (r) => r.owner,
    ).length;

    return total > 0 ? (assigned / total) * 100 : 0;
  }

  private calculateAvgTimeToFix(): number {
    const fixedTests = Array.from(this.quarantinedTests.values()).filter(
      (r) => r.status === 'fixed',
    );

    if (fixedTests.length === 0) return 0;

    const totalTime = fixedTests.reduce((sum, test) => {
      const timeToFix = test.lastSeen - test.firstDetected;
      return sum + timeToFix;
    }, 0);

    return totalTime / fixedTests.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private formatDetailedReport(
    summary: QuarantineStats,
    activeTests: FlakyTestRecord[],
  ): string {
    let report = '# 🧪 Flaky Test Quarantine Report\n\n';

    report += '## Summary\n\n';
    report += `- **Total Quarantined**: ${summary.totalQuarantined}\n`;
    report += `- **Currently Active**: ${summary.activeQuarantined}\n`;
    report += `- **Fixed This Week**: ${summary.fixedThisWeek}\n`;
    report += `- **Owner Assignment Rate**: ${summary.ownerAssignmentRate.toFixed(1)}%\n`;
    report += `- **Avg Time to Fix**: ${summary.avgTimeToFix.toFixed(1)} days\n\n`;

    report += '## Top Flake Reasons\n\n';
    for (const { reason, count } of summary.topFlakeReasons) {
      report += `- **${reason}**: ${count} tests\n`;
    }

    report += '\n## Active Quarantined Tests\n\n';
    for (const test of activeTests.slice(0, 10)) {
      // Top 10
      report += `### ${test.testName}\n`;
      report += `- **Path**: ${test.testPath}\n`;
      report += `- **Flake Rate**: ${(test.flakeRate * 100).toFixed(1)}%\n`;
      report += `- **Owner**: ${test.owner || 'Unassigned'}\n`;
      report += `- **Reason**: ${test.quarantineReason}\n`;
      report += `- **Days in Quarantine**: ${Math.floor((Date.now() - test.firstDetected) / (1000 * 60 * 60 * 24))}\n\n`;
    }

    return report;
  }

  private async loadHistoricalData(): Promise<void> {
    const quarantineFile = path.join(
      this.projectRoot,
      '.maestro-quarantine.json',
    );

    try {
      const content = await fs.readFile(quarantineFile, 'utf8');
      const data = JSON.parse(content);

      // Load quarantined tests
      for (const [key, record] of Object.entries(
        data.quarantined as Record<string, FlakyTestRecord>,
      )) {
        this.quarantinedTests.set(key, record);
      }

      // Load test history
      for (const [key, history] of Object.entries(
        data.history as Record<string, TestResult[]>,
      )) {
        this.testHistory.set(key, history);
      }

      console.log(
        `📚 Loaded quarantine data: ${this.quarantinedTests.size} quarantined tests`,
      );
    } catch (error) {
      console.log('📄 No existing quarantine data found');
    }
  }

  private async saveQuarantineData(): Promise<void> {
    const quarantineFile = path.join(
      this.projectRoot,
      '.maestro-quarantine.json',
    );

    const data = {
      quarantined: Object.fromEntries(this.quarantinedTests),
      history: Object.fromEntries(this.testHistory),
      lastUpdated: Date.now(),
    };

    await fs.writeFile(quarantineFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get current quarantine statistics
   */
  getStats(): QuarantineStats {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyFixed = Array.from(this.quarantinedTests.values()).filter(
      (r) =>
        r.status === 'fixed' && (r.assignedDate || r.firstDetected) > weekAgo,
    );

    return {
      totalQuarantined: this.quarantinedTests.size,
      activeQuarantined: Array.from(this.quarantinedTests.values()).filter(
        (r) => r.status === 'quarantined',
      ).length,
      fixedThisWeek: recentlyFixed.length,
      topFlakeReasons: this.getTopFlakeReasons(),
      ownerAssignmentRate: this.calculateOwnerAssignmentRate(),
      avgTimeToFix: this.calculateAvgTimeToFix(),
    };
  }

  /**
   * Get tests that should run in main suite (non-quarantined)
   */
  getActiveTestSuite(allTests: string[]): string[] {
    const quarantinedPaths = new Set(
      Array.from(this.quarantinedTests.values())
        .filter((r) => r.status === 'quarantined')
        .map((r) => r.testPath),
    );

    return allTests.filter((testPath) => !quarantinedPaths.has(testPath));
  }

  /**
   * Get tests that should run in quarantine suite
   */
  getQuarantineTestSuite(): string[] {
    return Array.from(this.quarantinedTests.values())
      .filter((r) => r.status === 'quarantined')
      .map((r) => r.testPath);
  }

  /**
   * Shutdown manager gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Flaky Test Manager...');

    await this.saveQuarantineData();

    this.removeAllListeners();

    console.log('✅ Flaky Test Manager shutdown complete');
  }
}

// Factory function
export function createFlakyTestManager(
  config: QuarantineConfig,
  projectRoot?: string,
): FlakyTestManager {
  return new FlakyTestManager(config, projectRoot);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: QuarantineConfig = {
    flakeThreshold: 0.2, // 20% flake rate
    minRunsForDetection: 5,
    retryIndicatesFlake: true,
    quarantineAfterConsecutiveFlakes: 3,
    ownerAssignmentEnabled: true,
    reportSchedule: 'weekly',
  };

  const manager = createFlakyTestManager(config);

  // Simulate some test results
  setTimeout(async () => {
    const mockResults: TestResult[] = [
      {
        name: 'should handle async operations',
        path: 'src/async.test.ts',
        status: 'failed',
        duration: 5000,
        retries: 1,
        error: 'Timeout: operation exceeded 4000ms',
        timestamp: Date.now(),
      },
      {
        name: 'should handle async operations',
        path: 'src/async.test.ts',
        status: 'passed',
        duration: 2000,
        retries: 1,
        timestamp: Date.now(),
      },
      {
        name: 'should validate user input',
        path: 'src/validation.test.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        timestamp: Date.now(),
      },
    ];

    await manager.processTestResults(mockResults);

    const stats = manager.getStats();
    console.log('\n📊 Quarantine Stats:');
    console.log(`   Active quarantined: ${stats.activeQuarantined}`);
    console.log(
      `   Owner assignment rate: ${stats.ownerAssignmentRate.toFixed(1)}%`,
    );
    console.log(`   Fixed this week: ${stats.fixedThisWeek}`);

    // Generate report
    const { summary, detailedReport } = await manager.generateReport();
    console.log('\n📋 Weekly Report Generated');
    console.log(detailedReport.substring(0, 500) + '...');
  }, 1000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    manager.shutdown().then(() => process.exit(0));
  });
}
