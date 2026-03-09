import { CriticAgent } from './critic';
import { FixerAgent } from './fixer';
import { promisify } from 'util';
import { exec } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

interface ReflectiveLoopResult {
  iterations: LoopIteration[];
  finalState: 'success' | 'partial' | 'failed';
  totalTime: number;
  recommendations: string[];
  metrics: LoopMetrics;
}

interface LoopIteration {
  iteration: number;
  criticResult: any;
  fixerResult: any;
  improvement: number;
  timestamp: string;
  action: 'analyze' | 'fix' | 'verify' | 'escalate';
}

interface LoopMetrics {
  issuesResolved: number;
  issuesRemaining: number;
  riskReduction: number;
  cycleEfficiency: number;
  convergenceRate: number;
}

export class ReflectiveLoop {
  private critic: CriticAgent;
  private fixer: FixerAgent;
  private projectRoot: string;
  private maxIterations: number;
  private convergenceThreshold: number;

  constructor(
    projectRoot: string = process.cwd(),
    maxIterations: number = 5,
    convergenceThreshold: number = 5,
  ) {
    this.projectRoot = projectRoot;
    this.critic = new CriticAgent(projectRoot);
    this.fixer = new FixerAgent(projectRoot);
    this.maxIterations = maxIterations;
    this.convergenceThreshold = convergenceThreshold;
  }

  async execute(): Promise<ReflectiveLoopResult> {
    console.log('🔄 Starting reflective improvement loop...');

    const startTime = Date.now();
    const iterations: LoopIteration[] = [];
    let previousRiskScore = 100;
    let stagnationCount = 0;

    for (let i = 1; i <= this.maxIterations; i++) {
      console.log(`\n--- Iteration ${i}/${this.maxIterations} ---`);

      const iteration: LoopIteration = {
        iteration: i,
        criticResult: null,
        fixerResult: null,
        improvement: 0,
        timestamp: new Date().toISOString(),
        action: 'analyze',
      };

      // Phase 1: Analyze
      console.log('🔍 Phase 1: Analysis');
      iteration.criticResult = await this.critic.analyze();
      const currentRiskScore = iteration.criticResult.riskScore;

      console.log(
        `Risk Score: ${currentRiskScore} (previous: ${previousRiskScore})`,
      );

      // Check for convergence
      if (currentRiskScore <= 10) {
        console.log('✅ Convergence achieved: Risk score acceptable');
        iteration.action = 'verify';
        iterations.push(iteration);
        break;
      }

      // Check for stagnation
      const improvement = previousRiskScore - currentRiskScore;
      iteration.improvement = improvement;

      if (improvement < this.convergenceThreshold) {
        stagnationCount++;
        console.log(
          `⚠️ Limited improvement detected (${improvement}). Stagnation count: ${stagnationCount}`,
        );
      } else {
        stagnationCount = 0;
      }

      if (stagnationCount >= 2) {
        console.log('🛑 Stagnation detected: Escalating for manual review');
        iteration.action = 'escalate';
        iterations.push(iteration);
        break;
      }

      // Phase 2: Fix
      if (iteration.criticResult.staticCheckResults.some((r) => !r.passed)) {
        console.log('🔧 Phase 2: Applying fixes');
        iteration.action = 'fix';
        iteration.fixerResult = await this.fixer.applyFixes(
          iteration.criticResult,
        );

        console.log(
          `Fixes applied: ${iteration.fixerResult.fixesApplied.length}`,
        );
        console.log(
          `Remaining issues: ${iteration.fixerResult.remainingIssues.length}`,
        );

        // Phase 3: Verify fixes
        if (iteration.fixerResult.fixesApplied.some((f) => f.applied)) {
          console.log('🧪 Phase 3: Verifying fixes');
          await this.runVerificationSuite();
        }
      } else {
        iteration.action = 'verify';
        console.log('✅ No fixable issues found, verifying overall state');
      }

      iterations.push(iteration);
      previousRiskScore = currentRiskScore;

      // Brief pause between iterations
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const totalTime = Date.now() - startTime;
    const finalIteration = iterations[iterations.length - 1];
    const finalState = this.determineFinalState(finalIteration);
    const metrics = this.calculateMetrics(iterations);
    const recommendations = this.generateFinalRecommendations(
      iterations,
      finalState,
    );

    const result: ReflectiveLoopResult = {
      iterations,
      finalState,
      totalTime,
      recommendations,
      metrics,
    };

    await this.persistLoopResult(result);
    this.logSummary(result);

    return result;
  }

  private async runVerificationSuite(): Promise<void> {
    try {
      // Run tests to verify fixes don't break functionality
      console.log('Running verification tests...');

      const commands = [
        'npm run test:quick',
        'npm run lint',
        'npm run typecheck',
      ];

      for (const cmd of commands) {
        try {
          await execAsync(cmd, {
            cwd: this.projectRoot,
            timeout: 30000, // 30 second timeout
          });
          console.log(`✅ ${cmd} passed`);
        } catch (error) {
          console.log(`⚠️ ${cmd} failed: ${error.message}`);
          // Continue with other checks
        }
      }
    } catch (error) {
      console.log(`Verification suite error: ${error.message}`);
    }
  }

  private determineFinalState(
    finalIteration: LoopIteration,
  ): 'success' | 'partial' | 'failed' {
    if (!finalIteration.criticResult) {
      return 'failed';
    }

    const riskScore = finalIteration.criticResult.riskScore;
    const hasErrors = finalIteration.criticResult.staticCheckResults.some((r) =>
      r.issues.some((i) => i.severity === 'error'),
    );

    if (riskScore <= 10 && !hasErrors) {
      return 'success';
    } else if (riskScore <= 30 || finalIteration.improvement > 0) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  private calculateMetrics(iterations: LoopIteration[]): LoopMetrics {
    const firstIteration = iterations[0];
    const lastIteration = iterations[iterations.length - 1];

    const initialIssues =
      firstIteration.criticResult?.staticCheckResults.reduce(
        (sum, r) => sum + r.issues.length,
        0,
      ) || 0;

    const finalIssues =
      lastIteration.criticResult?.staticCheckResults.reduce(
        (sum, r) => sum + r.issues.length,
        0,
      ) || 0;

    const initialRisk = firstIteration.criticResult?.riskScore || 100;
    const finalRisk = lastIteration.criticResult?.riskScore || 100;

    const totalFixes = iterations.reduce(
      (sum, iter) =>
        sum +
        (iter.fixerResult?.fixesApplied.filter((f) => f.applied).length || 0),
      0,
    );

    const improvements = iterations
      .map((iter) => iter.improvement)
      .filter((imp) => imp > 0);
    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;

    return {
      issuesResolved: Math.max(0, initialIssues - finalIssues),
      issuesRemaining: finalIssues,
      riskReduction: Math.max(0, initialRisk - finalRisk),
      cycleEfficiency: totalFixes / iterations.length,
      convergenceRate: avgImprovement,
    };
  }

  private generateFinalRecommendations(
    iterations: LoopIteration[],
    finalState: string,
  ): string[] {
    const recommendations: string[] = [];
    const lastIteration = iterations[iterations.length - 1];

    switch (finalState) {
      case 'success':
        recommendations.push(
          '✅ All critical issues resolved - ready for merge',
        );
        recommendations.push(
          'Consider running extended test suite before deployment',
        );
        break;

      case 'partial':
        recommendations.push('⚠️ Partial success - some issues remain');
        recommendations.push('Manual review recommended for remaining issues');
        if (lastIteration.criticResult.riskScore > 20) {
          recommendations.push('Consider breaking change into smaller PRs');
        }
        break;

      case 'failed':
        recommendations.push('❌ Automatic fixes insufficient');
        recommendations.push('Manual intervention required');
        recommendations.push(
          'Consider reverting changes and redesigning approach',
        );
        break;
    }

    // Performance recommendations
    const avgTime =
      iterations.reduce(
        (sum, iter, idx, arr) =>
          sum +
          (idx > 0
            ? new Date(iter.timestamp).getTime() -
              new Date(arr[idx - 1].timestamp).getTime()
            : 0),
        0,
      ) / Math.max(1, iterations.length - 1);

    if (avgTime > 60000) {
      recommendations.push(
        'Consider optimizing fix strategies for faster cycles',
      );
    }

    // Pattern-based recommendations
    const stuckPatterns = iterations.filter((iter) => iter.improvement < 0);
    if (stuckPatterns.length > 1) {
      recommendations.push(
        'Detected regression patterns - review fix strategies',
      );
    }

    return recommendations;
  }

  private logSummary(result: ReflectiveLoopResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 REFLECTIVE LOOP SUMMARY');
    console.log('='.repeat(60));

    console.log(`Final State: ${result.finalState.toUpperCase()}`);
    console.log(`Total Time: ${(result.totalTime / 1000).toFixed(1)}s`);
    console.log(
      `Iterations: ${result.iterations.length}/${this.maxIterations}`,
    );

    console.log('\n📊 Metrics:');
    console.log(`  Issues Resolved: ${result.metrics.issuesResolved}`);
    console.log(`  Issues Remaining: ${result.metrics.issuesRemaining}`);
    console.log(`  Risk Reduction: ${result.metrics.riskReduction}%`);
    console.log(
      `  Cycle Efficiency: ${result.metrics.cycleEfficiency.toFixed(2)}`,
    );
    console.log(
      `  Convergence Rate: ${result.metrics.convergenceRate.toFixed(2)}`,
    );

    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec) => console.log(`  ${rec}`));

    console.log('\n📋 Iteration History:');
    result.iterations.forEach((iter) => {
      const riskScore = iter.criticResult?.riskScore || 'N/A';
      const fixCount =
        iter.fixerResult?.fixesApplied.filter((f) => f.applied).length || 0;
      console.log(
        `  ${iter.iteration}: ${iter.action} | Risk: ${riskScore} | Fixes: ${fixCount} | Δ: ${iter.improvement}`,
      );
    });

    console.log('='.repeat(60));
  }

  private async persistLoopResult(result: ReflectiveLoopResult): Promise<void> {
    const analysisDir = join(this.projectRoot, '.maestro', 'loops');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reflective-loop-${timestamp}.json`;

    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(analysisDir, { recursive: true });
      await writeFile(
        join(analysisDir, filename),
        JSON.stringify(result, null, 2),
      );
      console.log(`📄 Loop results saved to: ${join(analysisDir, filename)}`);
    } catch (error) {
      console.warn('Failed to persist loop results:', error);
    }
  }
}
