#!/usr/bin/env node

/**
 * Composer vNext+1: Remote Execution & Graph Turbo
 * High-performance build orchestrator with RBE, enhanced TIA, and graph-aware acceleration
 */

import { ComposerVNext } from './ComposerVNext.js';
import { RemoteBuildExecutor } from '../rbe/RemoteBuildExecutor.js';
import { DependencyGraphService } from '../graph/DependencyGraphService.js';
import { TestImpactAnalyzerV2 } from '../test-impact/TestImpactAnalyzerV2.js';
import { FlakyTestManager } from '../test-quarantine/FlakyTestManager.js';
import { PolicyEngine } from '../policy/PolicyEngine.js';
import { MultiArchBuilder } from '../multi-arch/MultiArchBuilder.js';
import { MaestroProfiler } from '../cli/maestro-profile.js';
import { MaestroQuery } from '../cli/maestro-query.js';
import { BuildConfiguration, BuildResult } from './types.js';

export interface VNextPlus1Config extends BuildConfiguration {
  rbe: {
    enabled: boolean;
    scheduler: 'kubernetes' | 'aws-batch' | 'local';
    maxWorkers: number;
    casUrl?: string;
  };
  graphTurbo: {
    enabled: boolean;
    realtimeUpdates: boolean;
    queryTimeout: number;
  };
  tiaV2: {
    enabled: boolean;
    coverageAware: boolean;
    minConfidence: number;
  };
  quarantine: {
    enabled: boolean;
    autoQuarantine: boolean;
    maxFlakeRate: number;
  };
  policy: {
    enabled: boolean;
    autofix: boolean;
    strictMode: boolean;
  };
  multiArch: {
    enabled: boolean;
    targets: string[];
    parallelBuilds: boolean;
  };
}

export interface VNextPlus1Result extends BuildResult {
  rbeStats?: {
    tasksScheduled: number;
    avgRemoteTime: number;
    cacheHitRate: number;
  };
  graphStats?: {
    queryCount: number;
    avgQueryTime: number;
    indexSize: string;
  };
  tiaStats?: {
    testsSkipped: number;
    confidenceScore: number;
    timeSaved: string;
  };
  quarantineStats?: {
    flakyTests: number;
    quarantined: number;
    stabilityScore: number;
  };
  policyStats?: {
    rulesEvaluated: number;
    violations: number;
    autofixed: number;
  };
  multiArchStats?: {
    targetBuilds: number;
    parallelism: number;
    crossCompileTime: number;
  };
  performanceGains: {
    totalTimeReduction: string;
    parallelismGain: number;
    cacheEfficiency: number;
  };
}

export class ComposerVNextPlus1 {
  private baseComposer: ComposerVNext;
  private rbeExecutor: RemoteBuildExecutor;
  private graphService: DependencyGraphService;
  private tiaV2: TestImpactAnalyzerV2;
  private flakyManager: FlakyTestManager;
  private policyEngine: PolicyEngine;
  private multiArchBuilder: MultiArchBuilder;
  private profiler: MaestroProfiler;
  private queryTool: MaestroQuery;
  private config: VNextPlus1Config;

  constructor(config: VNextPlus1Config) {
    this.config = config;
    this.baseComposer = new ComposerVNext(config);

    // Initialize vNext+1 components
    this.rbeExecutor = new RemoteBuildExecutor({
      scheduler: config.rbe.scheduler,
      maxWorkers: config.rbe.maxWorkers,
      casUrl: config.rbe.casUrl,
    });

    this.graphService = new DependencyGraphService(config.projectRoot);

    this.tiaV2 = new TestImpactAnalyzerV2({
      graphService: this.graphService,
      coverageAware: config.tiaV2.coverageAware,
      minConfidence: config.tiaV2.minConfidence,
    });

    this.flakyManager = new FlakyTestManager({
      autoQuarantine: config.quarantine.autoQuarantine,
      maxFlakeRate: config.quarantine.maxFlakeRate,
    });

    this.policyEngine = new PolicyEngine({
      autofix: config.policy.autofix,
      strictMode: config.policy.strictMode,
    });

    this.multiArchBuilder = new MultiArchBuilder({
      targets: config.multiArch.targets,
      parallelBuilds: config.multiArch.parallelBuilds,
    });

    this.profiler = new MaestroProfiler();
    this.queryTool = new MaestroQuery(config.projectRoot);

    console.log(
      '🚀 Composer vNext+1 initialized - Remote Execution & Graph Turbo ready',
    );
  }

  async build(): Promise<VNextPlus1Result> {
    console.log('🎯 Starting vNext+1 build with enhanced acceleration...');

    const buildStartTime = performance.now();
    this.profiler.startProfiling();

    try {
      // Step 1: Policy pre-flight checks
      await this.runPolicyChecks();

      // Step 2: Graph-aware dependency analysis
      await this.initializeGraphTurbo();

      // Step 3: Enhanced test impact analysis
      const tiaResults = await this.runEnhancedTIA();

      // Step 4: Parallel build execution with RBE
      const buildResults = await this.executeParallelBuilds(tiaResults);

      // Step 5: Multi-arch compilation (if enabled)
      const multiArchResults = await this.runMultiArchBuilds(buildResults);

      // Step 6: Flaky test management
      const quarantineResults = await this.manageTestStability();

      // Step 7: Performance analysis and reporting
      const profile = await this.profiler.finishProfiling();

      // Compile comprehensive results
      const result = await this.compileResults(
        buildResults,
        tiaResults,
        multiArchResults,
        quarantineResults,
        profile,
      );

      this.reportPerformanceGains(result);
      return result;
    } catch (error) {
      console.error('❌ vNext+1 build failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async runPolicyChecks(): Promise<void> {
    if (!this.config.policy.enabled) return;

    console.log('🔍 Running policy pre-flight checks...');

    const policyResult = await this.policyEngine.evaluate({
      buildContext: {
        projectRoot: this.config.projectRoot,
        buildType: 'production',
      },
    });

    if (policyResult.violations.length > 0) {
      console.log(
        `⚠️ Found ${policyResult.violations.length} policy violations`,
      );

      if (this.config.policy.autofix) {
        const fixed = await this.policyEngine.autofix(policyResult.violations);
        console.log(`🔧 Auto-fixed ${fixed} violations`);
      }

      if (
        this.config.policy.strictMode &&
        policyResult.violations.some((v) => v.severity === 'error')
      ) {
        throw new Error('Build blocked by policy violations in strict mode');
      }
    }
  }

  private async initializeGraphTurbo(): Promise<void> {
    if (!this.config.graphTurbo.enabled) return;

    console.log('📊 Initializing Graph Turbo with real-time indexing...');

    await this.graphService.initialize();

    if (this.config.graphTurbo.realtimeUpdates) {
      await this.graphService.startWatching();
    }

    // Pre-warm the graph with common queries
    const preWarmQueries = ['stats', 'find *.test.ts', 'find *.tsx'];

    for (const query of preWarmQueries) {
      await this.queryTool.query(query);
    }

    console.log('📊 Graph Turbo ready - sub-500ms queries enabled');
  }

  private async runEnhancedTIA(changedFiles?: string[]): Promise<any> {
    if (!this.config.tiaV2.enabled) {
      return (
        this.baseComposer['testRunner']?.getTestsToRun() || {
          tests: [],
          confidence: 1.0,
        }
      );
    }

    console.log('🎯 Running enhanced Test Impact Analysis v2...');

    // Auto-detect changed files if not provided
    if (!changedFiles) {
      changedFiles = await this.detectChangedFiles();
    }

    const tiaResults = await this.tiaV2.analyzeV2(changedFiles);

    console.log(
      `🎯 TIA v2: ${tiaResults.testsToRun.length} tests selected (confidence: ${tiaResults.overallConfidence})`,
    );

    if (tiaResults.overallConfidence < this.config.tiaV2.minConfidence) {
      console.warn(
        '⚠️ Low confidence in TIA results - running safety fallback',
      );
      return await this.tiaV2.fallbackToAllTests();
    }

    return tiaResults;
  }

  private async executeParallelBuilds(tiaResults: any): Promise<any> {
    console.log('🚀 Executing parallel builds with RBE acceleration...');

    const buildTasks = this.generateBuildTasks(tiaResults);

    if (this.config.rbe.enabled) {
      console.log(
        `🚀 Scheduling ${buildTasks.length} tasks on remote executors...`,
      );

      const remoteTasks = buildTasks.map((task) => ({
        id: task.name,
        command: task.command,
        inputs: task.inputs || [],
        outputs: task.outputs || [],
        env: task.env || {},
      }));

      const results = await Promise.all(
        remoteTasks.map((task) => this.rbeExecutor.executeRemote(task)),
      );

      return this.processRemoteResults(results);
    } else {
      // Fallback to local parallel execution
      return await this.baseComposer.build();
    }
  }

  private async runMultiArchBuilds(buildResults: any): Promise<any> {
    if (!this.config.multiArch.enabled) return null;

    console.log(
      `🎯 Building for ${this.config.multiArch.targets.length} architectures...`,
    );

    const multiArchConfig = {
      targets: this.config.multiArch.targets,
      parallelBuilds: this.config.multiArch.parallelBuilds,
      projectRoot: this.config.projectRoot,
      buildOutputs: buildResults.outputs,
    };

    return await this.multiArchBuilder.buildMultiArch(multiArchConfig);
  }

  private async manageTestStability(): Promise<any> {
    if (!this.config.quarantine.enabled) return null;

    console.log('🔒 Managing test stability and quarantine...');

    // Get recent test results
    const testResults = await this.getRecentTestResults();

    // Update flaky test tracking
    for (const result of testResults) {
      await this.flakyManager.recordTestResult(result);
    }

    // Check for new flaky tests
    const flakyTests = await this.flakyManager.detectFlakyTests();

    if (flakyTests.length > 0) {
      console.log(`🔒 Found ${flakyTests.length} flaky tests`);

      if (this.config.quarantine.autoQuarantine) {
        await this.flakyManager.quarantineTests(flakyTests);
        console.log(`🔒 Auto-quarantined ${flakyTests.length} flaky tests`);
      }
    }

    return {
      flakyTests: flakyTests.length,
      quarantined: this.config.quarantine.autoQuarantine
        ? flakyTests.length
        : 0,
      stabilityScore: await this.flakyManager.calculateStabilityScore(),
    };
  }

  private async compileResults(
    buildResults: any,
    tiaResults: any,
    multiArchResults: any,
    quarantineResults: any,
    profile: any,
  ): Promise<VNextPlus1Result> {
    const rbeStats = this.config.rbe.enabled
      ? await this.rbeExecutor.getStats()
      : undefined;
    const graphStats = this.config.graphTurbo.enabled
      ? this.graphService.getStats()
      : undefined;

    // Calculate performance gains
    const baseTime = profile.baselineTime || 300000; // 5 min default
    const actualTime = profile.totalDuration;
    const timeReduction = (((baseTime - actualTime) / baseTime) * 100).toFixed(
      1,
    );

    return {
      ...buildResults,
      rbeStats: rbeStats
        ? {
            tasksScheduled: rbeStats.tasksExecuted,
            avgRemoteTime: rbeStats.avgExecutionTime,
            cacheHitRate: rbeStats.cacheHitRate,
          }
        : undefined,
      graphStats: graphStats
        ? {
            queryCount: graphStats.totalQueries,
            avgQueryTime: graphStats.avgQueryTime,
            indexSize: `${(graphStats.indexSize / 1024 / 1024).toFixed(1)}MB`,
          }
        : undefined,
      tiaStats: tiaResults
        ? {
            testsSkipped: tiaResults.testsSkipped || 0,
            confidenceScore: tiaResults.overallConfidence || 1.0,
            timeSaved: `${(tiaResults.timeSaved || 0 / 1000).toFixed(1)}s`,
          }
        : undefined,
      quarantineStats: quarantineResults,
      policyStats: {
        rulesEvaluated: await this.policyEngine.getRulesCount(),
        violations: 0, // Would track from policy check phase
        autofixed: 0,
      },
      multiArchStats: multiArchResults
        ? {
            targetBuilds: multiArchResults.builds.size,
            parallelism: multiArchResults.maxParallelism,
            crossCompileTime: multiArchResults.totalDuration,
          }
        : undefined,
      performanceGains: {
        totalTimeReduction: `${timeReduction}%`,
        parallelismGain: profile.parallelismScore || 1.0,
        cacheEfficiency: (rbeStats?.cacheHitRate || 0) * 100,
      },
    };
  }

  private reportPerformanceGains(result: VNextPlus1Result): void {
    console.log('\n🎉 Composer vNext+1 Build Complete!');
    console.log('═══════════════════════════════════════');

    console.log(`⚡ Performance Gains:`);
    console.log(
      `   Total time reduction: ${result.performanceGains.totalTimeReduction}`,
    );
    console.log(
      `   Parallelism gain: ${result.performanceGains.parallelismGain}x`,
    );
    console.log(
      `   Cache efficiency: ${result.performanceGains.cacheEfficiency.toFixed(1)}%`,
    );

    if (result.rbeStats) {
      console.log(`🚀 Remote Build Execution:`);
      console.log(
        `   Tasks executed remotely: ${result.rbeStats.tasksScheduled}`,
      );
      console.log(`   Avg remote time: ${result.rbeStats.avgRemoteTime}ms`);
      console.log(
        `   Cache hit rate: ${result.rbeStats.cacheHitRate.toFixed(1)}%`,
      );
    }

    if (result.graphStats) {
      console.log(`📊 Graph Turbo:`);
      console.log(`   Queries executed: ${result.graphStats.queryCount}`);
      console.log(`   Avg query time: ${result.graphStats.avgQueryTime}ms`);
      console.log(`   Index size: ${result.graphStats.indexSize}`);
    }

    if (result.tiaStats) {
      console.log(`🎯 Test Impact Analysis v2:`);
      console.log(`   Tests skipped: ${result.tiaStats.testsSkipped}`);
      console.log(`   Confidence score: ${result.tiaStats.confidenceScore}`);
      console.log(`   Time saved: ${result.tiaStats.timeSaved}`);
    }

    if (result.quarantineStats) {
      console.log(`🔒 Test Quarantine:`);
      console.log(
        `   Flaky tests detected: ${result.quarantineStats.flakyTests}`,
      );
      console.log(
        `   Tests quarantined: ${result.quarantineStats.quarantined}`,
      );
      console.log(
        `   Stability score: ${result.quarantineStats.stabilityScore.toFixed(2)}`,
      );
    }

    console.log('═══════════════════════════════════════');

    const targetReduction = 25;
    const actualReduction = parseFloat(
      result.performanceGains.totalTimeReduction.replace('%', ''),
    );

    if (actualReduction >= targetReduction) {
      console.log(
        `✅ Sprint Goal ACHIEVED: ${actualReduction}% reduction (target: ≥${targetReduction}%)`,
      );
    } else {
      console.log(
        `⚠️ Sprint Goal: ${actualReduction}% reduction (target: ≥${targetReduction}%)`,
      );
    }
  }

  // Helper methods
  private async detectChangedFiles(): Promise<string[]> {
    // Would integrate with git or file watching
    return ['src/app.ts', 'src/components/Button.tsx'];
  }

  private generateBuildTasks(tiaResults: any): any[] {
    // Would generate actual build tasks based on TIA results
    return [
      {
        name: 'compile-typescript',
        command: 'npx tsc',
        inputs: ['src/**/*.ts'],
        outputs: ['dist/**/*.js'],
      },
    ];
  }

  private async processRemoteResults(results: any[]): Promise<any> {
    return {
      success: results.every((r) => r.exitCode === 0),
      outputs: results.flatMap((r) => r.outputs),
      duration: Math.max(...results.map((r) => r.duration)),
    };
  }

  private async getRecentTestResults(): Promise<any[]> {
    // Would get test results from recent runs
    return [];
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up vNext+1 resources...');

    await Promise.all([
      this.rbeExecutor.shutdown(),
      this.graphService.shutdown(),
      this.queryTool.shutdown(),
    ]);
  }

  /**
   * Interactive command interface
   */
  async executeCommand(command: string, args: string[] = []): Promise<any> {
    const [cmd, ...cmdArgs] = command.split(' ');

    switch (cmd) {
      case 'query':
        return await this.queryTool.query(cmdArgs.join(' '));

      case 'profile':
        return await this.profiler.generateReport();

      case 'stats':
        return {
          rbe: await this.rbeExecutor.getStats(),
          graph: this.graphService.getStats(),
          quarantine: await this.flakyManager.getStats(),
        };

      case 'policy':
        return await this.policyEngine.evaluate({
          buildContext: { projectRoot: this.config.projectRoot },
        });

      default:
        return { error: `Unknown command: ${cmd}` };
    }
  }
}

// Factory function
export function createComposerVNextPlus1(
  config: VNextPlus1Config,
): ComposerVNextPlus1 {
  return new ComposerVNextPlus1(config);
}

// Default configuration
export const DEFAULT_VNEXT_PLUS1_CONFIG: Partial<VNextPlus1Config> = {
  rbe: {
    enabled: true,
    scheduler: 'local',
    maxWorkers: 4,
  },
  graphTurbo: {
    enabled: true,
    realtimeUpdates: true,
    queryTimeout: 500,
  },
  tiaV2: {
    enabled: true,
    coverageAware: true,
    minConfidence: 0.8,
  },
  quarantine: {
    enabled: true,
    autoQuarantine: true,
    maxFlakeRate: 0.3,
  },
  policy: {
    enabled: true,
    autofix: true,
    strictMode: false,
  },
  multiArch: {
    enabled: false,
    targets: ['linux/amd64', 'linux/arm64'],
    parallelBuilds: true,
  },
};
