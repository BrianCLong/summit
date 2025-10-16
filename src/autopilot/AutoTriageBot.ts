#!/usr/bin/env node

/**
 * Auto-Triage & Bisect Bot
 * Isolate culprit commit/target/test with cached replays + binary search
 */

import { EventEmitter } from 'events';
import { TestImpactAnalyzerV2 } from '../test-impact/TestImpactAnalyzerV2.js';
import { FederatedGraphService } from '../federation/FederatedGraphService.js';

export interface BuildFailure {
  buildId: string;
  commitHash: string;
  branch: string;
  timestamp: number;
  failedTargets: string[];
  failedTests: string[];
  errorMessages: string[];
  buildLogs: string;
  prNumber?: number;
  author: string;
  commitMessage: string;
}

export interface TriageResult {
  buildId: string;
  culpritCommit?: string;
  culpritTarget?: string;
  culpritTest?: string;
  confidence: number;
  isolationMethod: 'bisect' | 'tia' | 'dependency_analysis' | 'log_analysis';
  timeToIsolate: number; // milliseconds
  reproSteps: string[];
  fixHints: string[];
  suspectedOwners: string[];
  relatedIssues: string[];
}

export interface BisectSession {
  id: string;
  buildFailure: BuildFailure;
  goodCommit: string;
  badCommit: string;
  candidates: string[];
  tested: Map<string, 'good' | 'bad' | 'skip'>;
  currentCandidate?: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
}

export interface ReplayCache {
  commitHash: string;
  target: string;
  result: 'pass' | 'fail';
  output: string;
  duration: number;
  timestamp: number;
  ttl: number;
}

export class AutoTriageBot extends EventEmitter {
  private activeSessions: Map<string, BisectSession> = new Map();
  private replayCache: Map<string, ReplayCache> = new Map();
  private tiaAnalyzer: TestImpactAnalyzerV2;
  private graphService: FederatedGraphService;

  private config: {
    maxConcurrentBisects: number;
    bisectTimeout: number;
    replayCacheTtl: number;
    maxBisectDepth: number;
    enableTiaGuided: boolean;
    costBudget: number; // USD per hour
    offPeakOnly: boolean;
  };

  private metrics = {
    totalTriages: 0,
    successfulIsolations: 0,
    avgTimeToIsolate: 0,
    bisectCacheHitRate: 0,
    computeCostSpent: 0,
  };

  constructor(
    tiaAnalyzer: TestImpactAnalyzerV2,
    graphService: FederatedGraphService,
    config: {
      maxConcurrentBisects?: number;
      bisectTimeout?: number;
      replayCacheTtl?: number;
      maxBisectDepth?: number;
      enableTiaGuided?: boolean;
      costBudget?: number;
      offPeakOnly?: boolean;
    } = {},
  ) {
    super();

    this.tiaAnalyzer = tiaAnalyzer;
    this.graphService = graphService;
    this.config = {
      maxConcurrentBisects: config.maxConcurrentBisects || 2,
      bisectTimeout: config.bisectTimeout || 1800000, // 30 minutes
      replayCacheTtl: config.replayCacheTtl || 86400000, // 24 hours
      maxBisectDepth: config.maxBisectDepth || 10,
      enableTiaGuided: config.enableTiaGuided !== false,
      costBudget: config.costBudget || 50, // $50/hour
      offPeakOnly: config.offPeakOnly || false,
    };

    // Clean up expired cache entries periodically
    setInterval(() => this.cleanupReplayCache(), 3600000); // hourly

    console.log(
      '🔍 Auto-Triage Bot initialized - intelligent failure isolation ready',
    );
  }

  /**
   * Start automatic triage for a build failure
   */
  async triageBuildFailure(failure: BuildFailure): Promise<TriageResult> {
    console.log(
      `🔍 Starting auto-triage for build ${failure.buildId} (commit: ${failure.commitHash.slice(0, 8)})`,
    );

    const startTime = performance.now();
    this.metrics.totalTriages++;

    // Check if we should defer to off-peak hours
    if (this.config.offPeakOnly && this.isPeakHours()) {
      console.log('⏰ Deferring bisect to off-peak hours');
      return {
        buildId: failure.buildId,
        confidence: 0.1,
        isolationMethod: 'log_analysis',
        timeToIsolate: 0,
        reproSteps: ['Build deferred to off-peak hours'],
        fixHints: ['Will auto-triage during off-peak hours (after 6 PM)'],
        suspectedOwners: [failure.author],
        relatedIssues: [],
      };
    }

    // Check concurrent session limits
    if (this.activeSessions.size >= this.config.maxConcurrentBisects) {
      console.log('⏳ Max concurrent bisects reached, queuing...');
      await this.waitForAvailableSlot();
    }

    try {
      // Step 1: Fast log-based analysis
      const quickAnalysis = await this.performQuickAnalysis(failure);

      if (quickAnalysis.confidence > 0.8) {
        console.log('✅ High confidence from quick analysis');
        return this.finalizeTriageResult(failure, quickAnalysis, startTime);
      }

      // Step 2: TIA-guided narrowing
      let narrowedTargets = failure.failedTargets;
      if (this.config.enableTiaGuided && failure.failedTargets.length > 3) {
        narrowedTargets = await this.narrowTargetsWithTIA(failure);
        console.log(
          `🎯 TIA narrowed targets: ${narrowedTargets.length}/${failure.failedTargets.length}`,
        );
      }

      // Step 3: Binary search bisection
      const bisectResult = await this.performBisectAnalysis(
        failure,
        narrowedTargets,
      );

      const result = this.finalizeTriageResult(
        failure,
        bisectResult,
        startTime,
      );

      // Step 4: Generate PR comment
      if (failure.prNumber) {
        await this.postTriageComment(failure.prNumber, result);
      }

      return result;
    } catch (error) {
      console.error(`❌ Triage failed for build ${failure.buildId}:`, error);

      return {
        buildId: failure.buildId,
        confidence: 0.1,
        isolationMethod: 'log_analysis',
        timeToIsolate: performance.now() - startTime,
        reproSteps: ['Triage failed - manual investigation required'],
        fixHints: [`Error: ${error}`],
        suspectedOwners: [failure.author],
        relatedIssues: [],
      };
    }
  }

  /**
   * Perform quick log-based analysis for obvious failures
   */
  private async performQuickAnalysis(
    failure: BuildFailure,
  ): Promise<Partial<TriageResult>> {
    console.log('🔍 Performing quick log analysis...');

    const errorPatterns = [
      {
        pattern: /Cannot resolve module ['"]([^'"]+)['"]/,
        type: 'missing_dependency',
        confidence: 0.9,
        hint: 'Add missing dependency to package.json or check import path',
      },
      {
        pattern: /Error: spawn ENOENT/,
        type: 'missing_binary',
        confidence: 0.85,
        hint: 'Required binary not found in PATH - check tool installation',
      },
      {
        pattern: /FATAL ERROR: Ineffective mark-compacts near heap limit/,
        type: 'memory_limit',
        confidence: 0.9,
        hint: 'Increase Node.js memory limit with --max-old-space-size',
      },
      {
        pattern: /TypeError: Cannot read propert(?:y|ies) .* of undefined/,
        type: 'null_reference',
        confidence: 0.7,
        hint: 'Add null/undefined checks before property access',
      },
      {
        pattern: /Port \d+ is already in use/,
        type: 'port_conflict',
        confidence: 0.95,
        hint: 'Use a different port or kill the process using this port',
      },
    ];

    for (const errorPattern of errorPatterns) {
      const match = failure.buildLogs.match(errorPattern.pattern);
      if (match) {
        console.log(
          `✅ Detected ${errorPattern.type} with ${errorPattern.confidence} confidence`,
        );

        return {
          confidence: errorPattern.confidence,
          isolationMethod: 'log_analysis',
          culpritTest: failure.failedTests[0],
          reproSteps: [
            'Run the same build command locally',
            `Look for: ${match[0]}`,
          ],
          fixHints: [errorPattern.hint],
          suspectedOwners: await this.findOwnersForFailure(failure),
        };
      }
    }

    // Check for flaky test patterns
    if (failure.failedTests.length > 0) {
      const flakyPatterns = [
        /timeout/i,
        /connection refused/i,
        /temporary failure/i,
        /race condition/i,
      ];

      for (const pattern of flakyPatterns) {
        if (pattern.test(failure.buildLogs)) {
          return {
            confidence: 0.6,
            isolationMethod: 'log_analysis',
            culpritTest: failure.failedTests[0],
            reproSteps: ['Re-run the failing test multiple times'],
            fixHints: [
              'This appears to be a flaky test - consider adding retry logic or fixing timing issues',
            ],
            suspectedOwners: await this.findOwnersForFailure(failure),
          };
        }
      }
    }

    return {
      confidence: 0.3,
      isolationMethod: 'log_analysis',
      reproSteps: ['Manual investigation required'],
      fixHints: ['No obvious pattern detected in logs'],
      suspectedOwners: [failure.author],
    };
  }

  /**
   * Use TIA to narrow down the targets that need bisection
   */
  private async narrowTargetsWithTIA(failure: BuildFailure): Promise<string[]> {
    try {
      // Get the commit diff
      const changedFiles = await this.getCommitDiff(failure.commitHash);

      // Use TIA to find potentially affected targets
      const impactAnalysis = await this.tiaAnalyzer.analyzeV2(changedFiles);

      // Intersect with failed targets
      const relevantTargets = failure.failedTargets.filter((target) =>
        impactAnalysis.testsToRun.some(
          (test) => test.includes(target) || target.includes(test),
        ),
      );

      return relevantTargets.length > 0
        ? relevantTargets
        : failure.failedTargets.slice(0, 3);
    } catch (error) {
      console.warn('⚠️ TIA narrowing failed, using all targets:', error);
      return failure.failedTargets;
    }
  }

  /**
   * Perform binary search bisection to isolate culprit commit
   */
  private async performBisectAnalysis(
    failure: BuildFailure,
    targetsList: string[],
  ): Promise<Partial<TriageResult>> {
    console.log('🔍 Starting bisect analysis...');

    // Find a good commit to bisect from
    const goodCommit = await this.findGoodCommit(
      failure.commitHash,
      failure.branch,
    );

    if (!goodCommit) {
      return {
        confidence: 0.2,
        isolationMethod: 'bisect',
        reproSteps: ['Could not find a recent good commit for bisection'],
        fixHints: [
          'Manual investigation required - no recent passing builds found',
        ],
        suspectedOwners: [failure.author],
      };
    }

    // Get commit range for bisection
    const commitRange = await this.getCommitRange(
      goodCommit,
      failure.commitHash,
    );

    if (commitRange.length <= 1) {
      return {
        confidence: 0.9,
        isolationMethod: 'bisect',
        culpritCommit: failure.commitHash,
        reproSteps: [
          `This is the only commit since last good build (${goodCommit.slice(0, 8)})`,
        ],
        fixHints: ['Review changes in this commit'],
        suspectedOwners: [failure.author],
      };
    }

    console.log(
      `🔍 Bisecting ${commitRange.length} commits between ${goodCommit.slice(0, 8)} (good) and ${failure.commitHash.slice(0, 8)} (bad)`,
    );

    // Create bisect session
    const session: BisectSession = {
      id: `bisect_${failure.buildId}`,
      buildFailure: failure,
      goodCommit,
      badCommit: failure.commitHash,
      candidates: commitRange,
      tested: new Map(),
      startTime: Date.now(),
      status: 'running',
    };

    this.activeSessions.set(session.id, session);

    try {
      const culpritCommit = await this.binarySearchCommits(
        session,
        targetsList,
      );

      session.status = 'completed';

      if (culpritCommit) {
        console.log(`✅ Bisect isolated culprit: ${culpritCommit.slice(0, 8)}`);

        const commitInfo = await this.getCommitInfo(culpritCommit);

        return {
          confidence: 0.85,
          isolationMethod: 'bisect',
          culpritCommit,
          reproSteps: [
            `Check out commit: git checkout ${culpritCommit}`,
            `Run failing targets: ${targetsList.join(', ')}`,
            'Compare with previous commit to see the difference',
          ],
          fixHints: [
            'Review the changes in this commit',
            'Check if any new dependencies or configuration changes were introduced',
            'Look for syntax errors or breaking changes',
          ],
          suspectedOwners: [commitInfo.author, failure.author],
          relatedIssues: await this.findRelatedIssues(culpritCommit),
        };
      } else {
        return {
          confidence: 0.4,
          isolationMethod: 'bisect',
          reproSteps: ['Bisect could not isolate a specific commit'],
          fixHints: [
            'The failure might be non-deterministic or infrastructure related',
          ],
          suspectedOwners: [failure.author],
        };
      }
    } catch (error) {
      console.error('❌ Bisect failed:', error);
      session.status = 'failed';

      return {
        confidence: 0.2,
        isolationMethod: 'bisect',
        reproSteps: ['Bisect analysis failed'],
        fixHints: [`Bisect error: ${error}`],
        suspectedOwners: [failure.author],
      };
    } finally {
      this.activeSessions.delete(session.id);
    }
  }

  /**
   * Binary search through commits to find the culprit
   */
  private async binarySearchCommits(
    session: BisectSession,
    targetsList: string[],
  ): Promise<string | null> {
    let left = 0;
    let right = session.candidates.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = session.candidates[mid];

      console.log(
        `🔍 Testing commit ${candidate.slice(0, 8)} (${mid + 1}/${session.candidates.length})`,
      );

      // Check if we've already tested this commit
      const cached = session.tested.get(candidate);
      let result: 'good' | 'bad' | 'skip';

      if (cached) {
        result = cached;
        console.log(`📦 Using cached result: ${result}`);
      } else {
        result = await this.testCommit(candidate, targetsList);
        session.tested.set(candidate, result);
      }

      if (result === 'good') {
        left = mid + 1;
      } else if (result === 'bad') {
        right = mid;
      } else {
        // Skip this commit, try the next one
        left = mid + 1;
      }

      // Check timeout
      if (Date.now() - session.startTime > this.config.bisectTimeout) {
        console.warn('⏰ Bisect timeout reached');
        session.status = 'timeout';
        break;
      }

      // Check depth limit
      if (session.tested.size > this.config.maxBisectDepth) {
        console.warn('⚠️ Max bisect depth reached');
        break;
      }
    }

    return left < session.candidates.length ? session.candidates[left] : null;
  }

  /**
   * Test a specific commit with replay caching
   */
  private async testCommit(
    commit: string,
    targets: string[],
  ): Promise<'good' | 'bad' | 'skip'> {
    for (const target of targets) {
      const cacheKey = `${commit}:${target}`;

      // Check replay cache first
      const cached = this.replayCache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.timestamp < this.config.replayCacheTtl
      ) {
        console.log(`📦 Replay cache hit for ${commit.slice(0, 8)}:${target}`);
        this.metrics.bisectCacheHitRate =
          (this.metrics.bisectCacheHitRate + 1) / 2; // Running average
        return cached.result === 'pass' ? 'good' : 'bad';
      }

      // Execute test
      console.log(`🧪 Testing ${target} at commit ${commit.slice(0, 8)}`);

      try {
        const startTime = performance.now();
        const testResult = await this.executeTest(commit, target);
        const duration = performance.now() - startTime;

        // Cache the result
        this.replayCache.set(cacheKey, {
          commitHash: commit,
          target,
          result: testResult.success ? 'pass' : 'fail',
          output: testResult.output,
          duration,
          timestamp: Date.now(),
          ttl: this.config.replayCacheTtl,
        });

        if (!testResult.success) {
          return 'bad';
        }
      } catch (error) {
        console.warn(
          `⚠️ Test execution failed for ${commit.slice(0, 8)}:${target}, skipping:`,
          error,
        );
        return 'skip';
      }
    }

    return 'good'; // All targets passed
  }

  /**
   * Execute a test at a specific commit
   */
  private async executeTest(
    commit: string,
    target: string,
  ): Promise<{ success: boolean; output: string }> {
    // This would integrate with the actual build system
    // For now, simulate with some realistic behavior

    await this.delay(2000 + Math.random() * 3000); // 2-5 second simulation

    // Simulate different outcomes based on commit hash
    const hash = this.hashString(`${commit}:${target}`);
    const success = hash % 10 < 7; // 70% success rate for simulation

    return {
      success,
      output: success
        ? 'All tests passed'
        : `Test failed: ${target} at ${commit.slice(0, 8)}`,
    };
  }

  /**
   * Find a recent good commit for bisection baseline
   */
  private async findGoodCommit(
    badCommit: string,
    branch: string,
  ): Promise<string | null> {
    // This would query the actual build history
    // For simulation, return a plausible good commit

    const commits = await this.getRecentCommits(branch, 10);

    // Find the first commit before badCommit that has a successful build
    for (const commit of commits) {
      if (commit === badCommit) continue;

      // Check if this commit has a successful build record
      if (await this.hasSuccessfulBuild(commit)) {
        return commit;
      }
    }

    return null;
  }

  /**
   * Get commit range for bisection
   */
  private async getCommitRange(
    goodCommit: string,
    badCommit: string,
  ): Promise<string[]> {
    // This would use git to get the actual commit range
    // For simulation, generate some commits

    const commits = [];
    for (let i = 0; i < 5; i++) {
      commits.push(
        `commit_${goodCommit.slice(0, 4)}_to_${badCommit.slice(0, 4)}_${i}`,
      );
    }

    return commits;
  }

  /**
   * Get information about a commit
   */
  private async getCommitInfo(
    commit: string,
  ): Promise<{ author: string; message: string }> {
    // This would query git for actual commit info
    return {
      author: 'developer-' + (this.hashString(commit) % 5),
      message: `Commit ${commit.slice(0, 8)} - simulated commit message`,
    };
  }

  /**
   * Find related issues for a commit
   */
  private async findRelatedIssues(commit: string): Promise<string[]> {
    // This would search for related GitHub issues, JIRA tickets, etc.
    const issues = [];

    if (this.hashString(commit) % 3 === 0) {
      issues.push(`ISSUE-${this.hashString(commit) % 1000}`);
    }

    return issues;
  }

  /**
   * Find owners for a failure based on changed files and CODEOWNERS
   */
  private async findOwnersForFailure(failure: BuildFailure): Promise<string[]> {
    const owners = [failure.author];

    // This would parse CODEOWNERS and find owners for changed files
    const changedFiles = await this.getCommitDiff(failure.commitHash);

    for (const file of changedFiles.slice(0, 3)) {
      // Check top 3 files
      if (file.startsWith('src/auth/')) {
        owners.push('auth-team');
      } else if (file.startsWith('src/api/')) {
        owners.push('api-team');
      } else if (file.endsWith('.test.ts')) {
        owners.push('qa-team');
      }
    }

    return [...new Set(owners)]; // Remove duplicates
  }

  /**
   * Get changed files for a commit
   */
  private async getCommitDiff(commit: string): Promise<string[]> {
    // This would use git to get actual changed files
    return [
      'src/app.ts',
      'src/components/Button.tsx',
      'src/utils/helpers.ts',
      'test/app.test.ts',
    ];
  }

  /**
   * Post triage results as a PR comment
   */
  private async postTriageComment(
    prNumber: number,
    result: TriageResult,
  ): Promise<void> {
    const comment = this.generateTriageComment(result);

    console.log(`📝 Posting triage comment to PR #${prNumber}:`);
    console.log(comment);

    // This would integrate with GitHub API to post the actual comment
    this.emit('triage_comment_posted', { prNumber, comment, result });
  }

  /**
   * Generate a markdown comment with triage results
   */
  private generateTriageComment(result: TriageResult): string {
    const confidence = Math.round(result.confidence * 100);
    const confidenceEmoji =
      confidence > 80 ? '🎯' : confidence > 60 ? '🔍' : '❓';

    let comment = `## ${confidenceEmoji} Auto-Triage Results\n\n`;
    comment += `**Confidence:** ${confidence}% (${result.isolationMethod})\n`;
    comment += `**Time to isolate:** ${(result.timeToIsolate / 1000).toFixed(1)}s\n\n`;

    if (result.culpritCommit) {
      comment += `### 🎯 Culprit Commit\n`;
      comment += `\`${result.culpritCommit.slice(0, 8)}\`\n\n`;
    }

    if (result.culpritTest) {
      comment += `### 🧪 Failing Test\n`;
      comment += `\`${result.culpritTest}\`\n\n`;
    }

    if (result.reproSteps.length > 0) {
      comment += `### 🔄 Repro Steps\n`;
      result.reproSteps.forEach((step, i) => {
        comment += `${i + 1}. ${step}\n`;
      });
      comment += '\n';
    }

    if (result.fixHints.length > 0) {
      comment += `### 💡 Fix Hints\n`;
      result.fixHints.forEach((hint) => {
        comment += `- ${hint}\n`;
      });
      comment += '\n';
    }

    if (result.suspectedOwners.length > 0) {
      comment += `### 👥 Suspected Owners\n`;
      result.suspectedOwners.forEach((owner) => {
        comment += `- @${owner}\n`;
      });
      comment += '\n';
    }

    if (result.relatedIssues.length > 0) {
      comment += `### 🔗 Related Issues\n`;
      result.relatedIssues.forEach((issue) => {
        comment += `- ${issue}\n`;
      });
    }

    comment += '\n---\n*Generated by Composer Auto-Triage Bot*';

    return comment;
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isPeakHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17; // 9 AM - 5 PM
  }

  private async waitForAvailableSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeSessions.size < this.config.maxConcurrentBisects) {
          resolve();
        } else {
          setTimeout(checkSlot, 5000); // Check every 5 seconds
        }
      };
      checkSlot();
    });
  }

  private async getRecentCommits(
    branch: string,
    count: number,
  ): Promise<string[]> {
    // Simulate getting recent commits
    const commits = [];
    for (let i = 0; i < count; i++) {
      commits.push(`commit_${branch}_${Date.now() - i * 86400000}_${i}`);
    }
    return commits;
  }

  private async hasSuccessfulBuild(commit: string): Promise<boolean> {
    // Simulate checking build history
    return this.hashString(commit) % 3 !== 0; // 67% success rate
  }

  private cleanupReplayCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cache] of this.replayCache.entries()) {
      if (now - cache.timestamp > cache.ttl) {
        this.replayCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired replay cache entries`);
    }
  }

  private finalizeTriageResult(
    failure: BuildFailure,
    partialResult: Partial<TriageResult>,
    startTime: number,
  ): TriageResult {
    const timeToIsolate = performance.now() - startTime;

    if (partialResult.confidence && partialResult.confidence > 0.7) {
      this.metrics.successfulIsolations++;
    }

    this.metrics.avgTimeToIsolate =
      (this.metrics.avgTimeToIsolate + timeToIsolate) / 2;

    return {
      buildId: failure.buildId,
      confidence: 0.1,
      isolationMethod: 'log_analysis',
      timeToIsolate,
      reproSteps: [],
      fixHints: [],
      suspectedOwners: [],
      relatedIssues: [],
      ...partialResult,
    };
  }

  /**
   * Get triage bot metrics
   */
  getMetrics(): typeof this.metrics & {
    activeBisects: number;
    cacheSize: number;
    successRate: number;
  } {
    return {
      ...this.metrics,
      activeBisects: this.activeSessions.size,
      cacheSize: this.replayCache.size,
      successRate:
        this.metrics.totalTriages > 0
          ? this.metrics.successfulIsolations / this.metrics.totalTriages
          : 0,
    };
  }

  /**
   * Get active bisect sessions
   */
  getActiveSessions(): BisectSession[] {
    return Array.from(this.activeSessions.values());
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down auto-triage bot...');

    // Cancel active sessions
    for (const session of this.activeSessions.values()) {
      session.status = 'failed';
    }

    this.activeSessions.clear();
    this.replayCache.clear();

    console.log('✅ Auto-triage bot shut down');
  }
}

// Factory function
export function createAutoTriageBot(
  tiaAnalyzer: TestImpactAnalyzerV2,
  graphService: FederatedGraphService,
  config?: any,
): AutoTriageBot {
  return new AutoTriageBot(tiaAnalyzer, graphService, config);
}
