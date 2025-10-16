#!/usr/bin/env node

/**
 * Speculative Prefetch & Execution Engine
 * Predictor warms cache keys and schedules likely-to-be-needed targets
 */

import { EventEmitter } from 'events';
import { RemoteBuildExecutor } from '../rbe/RemoteBuildExecutor.js';

export interface BuildHistoryEntry {
  timestamp: number;
  triggers: string[]; // Files that triggered this build
  targets: string[]; // Build targets that were executed
  duration: number;
  success: boolean;
  userId?: string;
  branch?: string;
  commitHash?: string;
}

export interface SpeculationPrediction {
  target: string;
  probability: number;
  reasoning: string[];
  estimatedDuration: number;
  dependencies: string[];
  priority: number;
}

export interface SpeculativeTask {
  id: string;
  target: string;
  command: string;
  inputs: string[];
  outputs: string[];
  prediction: SpeculationPrediction;
  startTime: number;
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';
  actuallyNeeded?: boolean;
  cancellationReason?: string;
}

export interface SpeculationMetrics {
  totalSpeculated: number;
  tasksUsed: number;
  tasksCancelled: number;
  wastedCompute: number; // CPU-seconds
  savedTime: number; // seconds
  hitRate: number; // percentage
  cancellationOverhead: number; // percentage of total compute
  avgPredictionAccuracy: number;
}

export interface PathHeuristic {
  pattern: RegExp;
  likelyTargets: string[];
  confidence: number;
  description: string;
}

export class SpeculativeExecutor extends EventEmitter {
  private buildHistory: BuildHistoryEntry[] = [];
  private activeSpeculations: Map<string, SpeculativeTask> = new Map();
  private completedSpeculations: Map<string, SpeculativeTask> = new Map();
  private pathHeuristics: PathHeuristic[] = [];
  private maxConcurrentSpeculations: number;
  private maxSpeculationDuration: number = 300000; // 5 minutes max
  private cancellationThreshold: number = 0.05; // Cancel if overhead > 5%

  private metrics: SpeculationMetrics = {
    totalSpeculated: 0,
    tasksUsed: 0,
    tasksCancelled: 0,
    wastedCompute: 0,
    savedTime: 0,
    hitRate: 0,
    cancellationOverhead: 0,
    avgPredictionAccuracy: 0,
  };

  constructor(
    private rbeExecutor: RemoteBuildExecutor,
    private config: {
      maxConcurrentSpeculations?: number;
      maxSpeculationDuration?: number;
      cancellationThreshold?: number;
      historyRetentionDays?: number;
      enableMachineLearning?: boolean;
    } = {},
  ) {
    super();

    this.maxConcurrentSpeculations = config.maxConcurrentSpeculations || 3;
    this.maxSpeculationDuration = config.maxSpeculationDuration || 300000;
    this.cancellationThreshold = config.cancellationThreshold || 0.05;

    this.initializePathHeuristics();

    console.log(
      '🔮 Speculative Executor initialized - predictive prefetch ready',
    );
  }

  /**
   * Record a build execution for learning
   */
  recordBuildExecution(entry: BuildHistoryEntry): void {
    this.buildHistory.push(entry);

    // Limit history retention
    const retentionDays = this.config.historyRetentionDays || 30;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    this.buildHistory = this.buildHistory.filter((e) => e.timestamp > cutoff);

    console.log(
      `📊 Recorded build execution: ${entry.targets.length} targets, ${entry.duration}ms`,
    );

    // Update any active speculations that match
    this.updateSpeculationAccuracy(entry);

    this.emit('build_recorded', entry);
  }

  /**
   * Generate speculative predictions based on current changes
   */
  async generatePredictions(
    changedFiles: string[],
    context: {
      userId?: string;
      branch?: string;
      timeOfDay?: number;
      recentBuilds?: BuildHistoryEntry[];
    } = {},
  ): Promise<SpeculationPrediction[]> {
    console.log(
      `🔮 Generating predictions for ${changedFiles.length} changed files...`,
    );

    const predictions: SpeculationPrediction[] = [];

    // Historical pattern analysis
    const historicalPredictions = await this.analyzeHistoricalPatterns(
      changedFiles,
      context,
    );
    predictions.push(...historicalPredictions);

    // Path-based heuristics
    const heuristicPredictions = await this.applyPathHeuristics(changedFiles);
    predictions.push(...heuristicPredictions);

    // Dependency graph analysis
    const dependencyPredictions =
      await this.analyzeDependencyPatterns(changedFiles);
    predictions.push(...dependencyPredictions);

    // Temporal patterns (time of day, user patterns)
    const temporalPredictions = await this.analyzeTemporalPatterns(
      changedFiles,
      context,
    );
    predictions.push(...temporalPredictions);

    // Merge and rank predictions
    const rankedPredictions = this.rankAndMergePredictions(predictions);

    console.log(
      `🔮 Generated ${rankedPredictions.length} predictions (avg probability: ${this.avgProbability(rankedPredictions).toFixed(2)})`,
    );

    return rankedPredictions.slice(0, this.maxConcurrentSpeculations);
  }

  /**
   * Start speculative execution based on predictions
   */
  async startSpeculativeExecution(
    predictions: SpeculationPrediction[],
  ): Promise<SpeculativeTask[]> {
    console.log(
      `🚀 Starting speculative execution for ${predictions.length} predictions...`,
    );

    const speculativeTasks: SpeculativeTask[] = [];

    for (const prediction of predictions) {
      // Check if we're at concurrent limit
      if (this.activeSpeculations.size >= this.maxConcurrentSpeculations) {
        console.log(
          '⚠️ Max concurrent speculations reached, queuing remaining',
        );
        break;
      }

      // Check if already speculating this target
      if (
        Array.from(this.activeSpeculations.values()).some(
          (t) => t.target === prediction.target,
        )
      ) {
        continue;
      }

      const task = await this.createSpeculativeTask(prediction);
      this.activeSpeculations.set(task.id, task);
      speculativeTasks.push(task);

      // Start the speculative execution
      this.executeSpeculativeTask(task);
    }

    this.metrics.totalSpeculated += speculativeTasks.length;

    console.log(`🚀 Started ${speculativeTasks.length} speculative tasks`);
    return speculativeTasks;
  }

  /**
   * Confirm that a speculative task was actually needed
   */
  confirmSpeculation(target: string): SpeculativeTask | null {
    // Find active speculation for this target
    for (const [taskId, task] of this.activeSpeculations) {
      if (task.target === target) {
        task.actuallyNeeded = true;
        console.log(`✅ Speculation confirmed for ${target} - cache hit!`);

        if (task.status === 'completed') {
          this.metrics.tasksUsed++;
          this.metrics.savedTime += task.prediction.estimatedDuration;
          this.moveToCompleted(taskId);
        }

        this.emit('speculation_confirmed', task);
        return task;
      }
    }

    // Check recently completed speculations
    for (const [taskId, task] of this.completedSpeculations) {
      if (task.target === target && !task.actuallyNeeded) {
        task.actuallyNeeded = true;
        this.metrics.tasksUsed++;
        this.metrics.savedTime += task.prediction.estimatedDuration;

        console.log(
          `✅ Speculation confirmed for ${target} (recently completed) - cache hit!`,
        );
        this.emit('speculation_confirmed', task);
        return task;
      }
    }

    return null;
  }

  /**
   * Cancel speculative tasks that are no longer likely to be needed
   */
  async cancelUnneededSpeculations(actualTargets: string[]): Promise<number> {
    console.log('🛑 Evaluating speculations for cancellation...');

    let cancelledCount = 0;
    const targetsSet = new Set(actualTargets);

    for (const [taskId, task] of this.activeSpeculations) {
      // Don't cancel if target is in actual build
      if (targetsSet.has(task.target)) {
        continue;
      }

      // Cancel if running too long or low probability
      const runningTime = Date.now() - task.startTime;
      const shouldCancel =
        runningTime > this.maxSpeculationDuration ||
        task.prediction.probability < 0.3 ||
        this.calculateCurrentOverhead() > this.cancellationThreshold;

      if (shouldCancel && task.status === 'running') {
        await this.cancelSpeculativeTask(taskId, 'no_longer_needed');
        cancelledCount++;
      }
    }

    console.log(`🛑 Cancelled ${cancelledCount} speculative tasks`);
    return cancelledCount;
  }

  /**
   * Get current speculation metrics
   */
  getMetrics(): SpeculationMetrics {
    // Update hit rate
    if (this.metrics.totalSpeculated > 0) {
      this.metrics.hitRate =
        (this.metrics.tasksUsed / this.metrics.totalSpeculated) * 100;
    }

    // Update cancellation overhead
    const totalCompute =
      this.metrics.wastedCompute + this.metrics.tasksUsed * 60; // Assume 60s avg for used tasks
    if (totalCompute > 0) {
      this.metrics.cancellationOverhead =
        (this.metrics.wastedCompute / totalCompute) * 100;
    }

    return { ...this.metrics };
  }

  private async analyzeHistoricalPatterns(
    changedFiles: string[],
    context: any,
  ): Promise<SpeculationPrediction[]> {
    const predictions: SpeculationPrediction[] = [];

    // Find builds that had similar file changes
    const relevantBuilds = this.buildHistory.filter((build) =>
      build.triggers.some((trigger) =>
        changedFiles.some(
          (file) => file.includes(trigger) || trigger.includes(file),
        ),
      ),
    );

    if (relevantBuilds.length === 0) {
      return predictions;
    }

    // Count target frequency
    const targetFrequency = new Map<string, number>();
    const targetDurations = new Map<string, number[]>();

    for (const build of relevantBuilds) {
      for (const target of build.targets) {
        targetFrequency.set(target, (targetFrequency.get(target) || 0) + 1);

        if (!targetDurations.has(target)) {
          targetDurations.set(target, []);
        }
        targetDurations
          .get(target)!
          .push(build.duration / build.targets.length);
      }
    }

    // Create predictions
    for (const [target, frequency] of targetFrequency) {
      const probability = frequency / relevantBuilds.length;

      if (probability > 0.2) {
        // Only predict if >20% likelihood
        const durations = targetDurations.get(target) || [30000];
        const estimatedDuration =
          durations.reduce((a, b) => a + b) / durations.length;

        predictions.push({
          target,
          probability,
          reasoning: [
            `Historical pattern: ${frequency}/${relevantBuilds.length} builds`,
            `Similar file changes in ${relevantBuilds.length} past builds`,
          ],
          estimatedDuration,
          dependencies: [],
          priority: probability * 100,
        });
      }
    }

    return predictions;
  }

  private async applyPathHeuristics(
    changedFiles: string[],
  ): Promise<SpeculationPrediction[]> {
    const predictions: SpeculationPrediction[] = [];

    for (const file of changedFiles) {
      for (const heuristic of this.pathHeuristics) {
        if (heuristic.pattern.test(file)) {
          for (const target of heuristic.likelyTargets) {
            predictions.push({
              target,
              probability: heuristic.confidence,
              reasoning: [
                `Path heuristic: ${heuristic.description}`,
                `File ${file} matches pattern ${heuristic.pattern.source}`,
              ],
              estimatedDuration: 45000, // Default 45s
              dependencies: [],
              priority: heuristic.confidence * 50,
            });
          }
        }
      }
    }

    return predictions;
  }

  private async analyzeDependencyPatterns(
    changedFiles: string[],
  ): Promise<SpeculationPrediction[]> {
    const predictions: SpeculationPrediction[] = [];

    // Simple dependency heuristics based on file types and paths
    for (const file of changedFiles) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        // TypeScript/JavaScript changes often trigger compilation and testing
        predictions.push({
          target: 'compile-typescript',
          probability: 0.8,
          reasoning: ['TypeScript file changed - compilation likely needed'],
          estimatedDuration: 30000,
          dependencies: [file],
          priority: 80,
        });

        if (file.includes('src/') && !file.includes('.test.')) {
          predictions.push({
            target: 'run-tests',
            probability: 0.6,
            reasoning: ['Source file changed - tests likely needed'],
            estimatedDuration: 60000,
            dependencies: [file],
            priority: 60,
          });
        }
      }

      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        predictions.push({
          target: 'build-ui',
          probability: 0.7,
          reasoning: ['React component changed - UI build likely needed'],
          estimatedDuration: 40000,
          dependencies: [file],
          priority: 70,
        });
      }

      if (file === 'package.json' || file === 'yarn.lock') {
        predictions.push({
          target: 'install-dependencies',
          probability: 0.9,
          reasoning: ['Package dependencies changed - install needed'],
          estimatedDuration: 90000,
          dependencies: [file],
          priority: 90,
        });
      }
    }

    return predictions;
  }

  private async analyzeTemporalPatterns(
    changedFiles: string[],
    context: any,
  ): Promise<SpeculationPrediction[]> {
    const predictions: SpeculationPrediction[] = [];

    const currentHour = new Date().getHours();

    // Business hours heuristics
    if (currentHour >= 9 && currentHour <= 17) {
      // During business hours, more likely to run full test suites
      predictions.push({
        target: 'run-integration-tests',
        probability: 0.4,
        reasoning: ['Business hours - integration tests more likely'],
        estimatedDuration: 120000,
        dependencies: [],
        priority: 40,
      });
    }

    // User-specific patterns
    if (context.userId) {
      const userBuilds = this.buildHistory.filter(
        (b) => b.userId === context.userId,
      );
      if (userBuilds.length > 0) {
        const userTargets = new Map<string, number>();
        for (const build of userBuilds.slice(-10)) {
          // Last 10 builds
          for (const target of build.targets) {
            userTargets.set(target, (userTargets.get(target) || 0) + 1);
          }
        }

        for (const [target, frequency] of userTargets) {
          if (frequency >= 3) {
            // User uses this target frequently
            predictions.push({
              target,
              probability: Math.min(0.5, frequency / 10),
              reasoning: [
                `User pattern: ${frequency}/10 recent builds used ${target}`,
              ],
              estimatedDuration: 45000,
              dependencies: [],
              priority: frequency * 5,
            });
          }
        }
      }
    }

    return predictions;
  }

  private rankAndMergePredictions(
    predictions: SpeculationPrediction[],
  ): SpeculationPrediction[] {
    // Merge predictions for same target
    const targetMap = new Map<string, SpeculationPrediction>();

    for (const prediction of predictions) {
      const existing = targetMap.get(prediction.target);
      if (existing) {
        // Combine probabilities (max + bonus for multiple sources)
        const combinedProb = Math.min(
          0.95,
          Math.max(existing.probability, prediction.probability) + 0.1,
        );
        existing.probability = combinedProb;
        existing.reasoning.push(...prediction.reasoning);
        existing.priority = Math.max(existing.priority, prediction.priority);
      } else {
        targetMap.set(prediction.target, { ...prediction });
      }
    }

    // Sort by priority (probability * base priority)
    return Array.from(targetMap.values()).sort(
      (a, b) => b.probability * b.priority - a.probability * a.priority,
    );
  }

  private avgProbability(predictions: SpeculationPrediction[]): number {
    if (predictions.length === 0) return 0;
    return (
      predictions.reduce((sum, p) => sum + p.probability, 0) /
      predictions.length
    );
  }

  private async createSpeculativeTask(
    prediction: SpeculationPrediction,
  ): Promise<SpeculativeTask> {
    const taskId = `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: taskId,
      target: prediction.target,
      command: this.getCommandForTarget(prediction.target),
      inputs: prediction.dependencies,
      outputs: this.getOutputsForTarget(prediction.target),
      prediction,
      startTime: Date.now(),
      status: 'queued',
    };
  }

  private async executeSpeculativeTask(task: SpeculativeTask): Promise<void> {
    console.log(
      `🔮 Executing speculative task: ${task.target} (${task.prediction.probability.toFixed(2)} probability)`,
    );

    task.status = 'running';
    this.emit('speculation_started', task);

    try {
      // Execute via RBE
      const remoteTask = {
        id: task.id,
        command: task.command,
        inputs: task.inputs,
        outputs: task.outputs,
        env: { SPECULATIVE: 'true' },
      };

      const result = await this.rbeExecutor.executeRemote(remoteTask);

      if (result.exitCode === 0) {
        task.status = 'completed';
        console.log(`✅ Speculative task completed: ${task.target}`);
      } else {
        task.status = 'failed';
        console.log(`❌ Speculative task failed: ${task.target}`);
      }
    } catch (error) {
      task.status = 'failed';
      console.error(`❌ Speculative task error: ${task.target}`, error);
    }

    this.emit('speculation_completed', task);

    // Move to completed if not cancelled
    if (task.status !== 'cancelled') {
      setTimeout(() => {
        if (!task.actuallyNeeded) {
          this.moveToCompleted(task.id);
          this.metrics.tasksCancelled++;
          this.metrics.wastedCompute += (Date.now() - task.startTime) / 1000;
        }
      }, 30000); // Wait 30s before considering it waste
    }
  }

  private async cancelSpeculativeTask(
    taskId: string,
    reason: string,
  ): Promise<void> {
    const task = this.activeSpeculations.get(taskId);
    if (!task) return;

    task.status = 'cancelled';
    task.cancellationReason = reason;

    console.log(`🛑 Cancelled speculative task: ${task.target} (${reason})`);

    // Update metrics
    this.metrics.tasksCancelled++;
    this.metrics.wastedCompute += (Date.now() - task.startTime) / 1000;

    this.moveToCompleted(taskId);
    this.emit('speculation_cancelled', task);
  }

  private moveToCompleted(taskId: string): void {
    const task = this.activeSpeculations.get(taskId);
    if (task) {
      this.activeSpeculations.delete(taskId);
      this.completedSpeculations.set(taskId, task);

      // Limit completed task history
      if (this.completedSpeculations.size > 100) {
        const oldest = Array.from(this.completedSpeculations.keys())[0];
        this.completedSpeculations.delete(oldest);
      }
    }
  }

  private updateSpeculationAccuracy(buildEntry: BuildHistoryEntry): void {
    // Check if any active speculations match this build
    for (const [taskId, task] of this.activeSpeculations) {
      if (buildEntry.targets.includes(task.target)) {
        this.confirmSpeculation(task.target);
      }
    }
  }

  private calculateCurrentOverhead(): number {
    const totalActive = this.activeSpeculations.size;
    const totalCompute = Array.from(this.activeSpeculations.values()).reduce(
      (sum, task) => sum + (Date.now() - task.startTime),
      0,
    );

    return totalActive > 0
      ? (this.metrics.wastedCompute * 1000) /
          (totalCompute + this.metrics.wastedCompute * 1000)
      : 0;
  }

  private getCommandForTarget(target: string): string {
    const commandMap: Record<string, string> = {
      'compile-typescript': 'npx tsc',
      'run-tests': 'npm run test',
      'run-integration-tests': 'npm run test:integration',
      'build-ui': 'npm run build:ui',
      'install-dependencies': 'npm install',
      'lint-code': 'npm run lint',
      'build-docker': 'docker build .',
      'run-e2e-tests': 'npm run test:e2e',
    };

    return commandMap[target] || `echo "Unknown target: ${target}"`;
  }

  private getOutputsForTarget(target: string): string[] {
    const outputMap: Record<string, string[]> = {
      'compile-typescript': ['dist/**/*.js'],
      'run-tests': ['coverage/**/*'],
      'build-ui': ['build/**/*'],
      'install-dependencies': ['node_modules/**/*'],
      'lint-code': ['.eslint-cache'],
      'build-docker': ['docker-build.log'],
    };

    return outputMap[target] || [];
  }

  private initializePathHeuristics(): void {
    this.pathHeuristics = [
      {
        pattern: /src\/.*\.ts$/,
        likelyTargets: ['compile-typescript', 'run-tests'],
        confidence: 0.8,
        description:
          'TypeScript source files usually need compilation and testing',
      },
      {
        pattern: /.*\.test\.(ts|js)$/,
        likelyTargets: ['run-tests'],
        confidence: 0.9,
        description: 'Test files trigger test runs',
      },
      {
        pattern: /src\/components\/.*\.tsx$/,
        likelyTargets: ['compile-typescript', 'build-ui', 'run-tests'],
        confidence: 0.7,
        description: 'React components need compilation, UI build, and testing',
      },
      {
        pattern: /package\.json$/,
        likelyTargets: ['install-dependencies'],
        confidence: 0.95,
        description: 'Package.json changes require dependency installation',
      },
      {
        pattern: /Dockerfile$/,
        likelyTargets: ['build-docker'],
        confidence: 0.8,
        description: 'Dockerfile changes trigger container builds',
      },
      {
        pattern: /.*\.(css|scss|less)$/,
        likelyTargets: ['build-ui'],
        confidence: 0.6,
        description: 'Style changes trigger UI builds',
      },
    ];
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down speculative executor...');

    // Cancel all active speculations
    const activeTasks = Array.from(this.activeSpeculations.keys());
    await Promise.all(
      activeTasks.map((taskId) =>
        this.cancelSpeculativeTask(taskId, 'shutdown'),
      ),
    );

    console.log('✅ Speculative executor shut down');
  }
}

// Factory function
export function createSpeculativeExecutor(
  rbeExecutor: RemoteBuildExecutor,
  config?: any,
): SpeculativeExecutor {
  return new SpeculativeExecutor(rbeExecutor, config);
}
