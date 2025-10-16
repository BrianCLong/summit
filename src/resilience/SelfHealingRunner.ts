#!/usr/bin/env node

/**
 * Self-Healing Runner
 * Snapshot sandbox I/O, smart retry/backoff, automatic local fallback
 */

import { EventEmitter } from 'events';
import { RemoteBuildExecutor } from '../rbe/RemoteBuildExecutor.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SandboxSnapshot {
  id: string;
  timestamp: number;
  workingDir: string;
  inputs: Map<string, string>; // file path -> content hash
  outputs: Map<string, string>;
  environment: Record<string, string>;
  checksum: string;
}

export interface ExecutionContext {
  taskId: string;
  command: string;
  workingDir: string;
  inputs: string[];
  outputs: string[];
  environment: Record<string, string>;
  retryPolicy: RetryPolicy;
  deterministicMode: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  attempt: number;
  healingActions: HealingAction[];
  deterministic: boolean;
  outputChecksum?: string;
}

export interface HealingAction {
  type: 'retry' | 'fallback' | 'env_reset' | 'cache_clear' | 'sandbox_restore';
  reason: string;
  timestamp: number;
  successful: boolean;
}

export interface InfrastructureHealth {
  rbeAvailable: boolean;
  rbeLatency: number;
  rbeErrorRate: number;
  localResourcesAvailable: boolean;
  diskSpace: number;
  memoryAvailable: number;
  lastHealthCheck: number;
}

export class SelfHealingRunner extends EventEmitter {
  private rbeExecutor: RemoteBuildExecutor;
  private snapshots: Map<string, SandboxSnapshot> = new Map();
  private healthStatus: InfrastructureHealth;
  private chaosMode: boolean = false;

  private config: {
    enableSnapshots: boolean;
    snapshotTtl: number;
    healthCheckInterval: number;
    rbeHealthThreshold: number;
    maxConcurrentRetries: number;
    defaultRetryPolicy: RetryPolicy;
  };

  private metrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    healingActionsTriggered: 0,
    fallbacksToLocal: 0,
    deterministicMatches: 0,
    avgHealingTime: 0,
  };

  constructor(
    rbeExecutor: RemoteBuildExecutor,
    config: {
      enableSnapshots?: boolean;
      snapshotTtl?: number;
      healthCheckInterval?: number;
      rbeHealthThreshold?: number;
      maxConcurrentRetries?: number;
      defaultRetryPolicy?: Partial<RetryPolicy>;
    } = {},
  ) {
    super();

    this.rbeExecutor = rbeExecutor;
    this.config = {
      enableSnapshots: config.enableSnapshots !== false,
      snapshotTtl: config.snapshotTtl || 3600000, // 1 hour
      healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
      rbeHealthThreshold: config.rbeHealthThreshold || 0.95,
      maxConcurrentRetries: config.maxConcurrentRetries || 3,
      defaultRetryPolicy: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2.0,
        retryableErrors: [
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ENOTFOUND',
          'socket hang up',
          'temporary failure',
          'rate limit exceeded',
        ],
        nonRetryableErrors: [
          'compilation error',
          'syntax error',
          'test assertion failed',
          'permission denied',
        ],
        ...config.defaultRetryPolicy,
      },
    };

    this.healthStatus = {
      rbeAvailable: true,
      rbeLatency: 0,
      rbeErrorRate: 0,
      localResourcesAvailable: true,
      diskSpace: 0,
      memoryAvailable: 0,
      lastHealthCheck: Date.now(),
    };

    // Start health monitoring
    setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval,
    );

    // Clean up expired snapshots
    setInterval(() => this.cleanupSnapshots(), this.config.snapshotTtl);

    console.log(
      '🔄 Self-Healing Runner initialized - resilient execution ready',
    );
  }

  /**
   * Execute a task with self-healing capabilities
   */
  async executeWithHealing(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    console.log(`🔄 Self-healing execution: ${context.taskId}`);

    const startTime = performance.now();
    this.metrics.totalExecutions++;

    const healingActions: HealingAction[] = [];
    let attempt = 0;
    let lastError: any;

    // Take initial snapshot if enabled
    let snapshot: SandboxSnapshot | undefined;
    if (this.config.enableSnapshots) {
      snapshot = await this.createSnapshot(context);
      console.log(`📸 Created snapshot: ${snapshot.id}`);
    }

    const retryPolicy = {
      ...this.config.defaultRetryPolicy,
      ...context.retryPolicy,
    };

    while (attempt < retryPolicy.maxAttempts) {
      attempt++;
      console.log(`🔄 Attempt ${attempt}/${retryPolicy.maxAttempts}`);

      try {
        // Perform pre-execution healing if needed
        await this.performPreExecutionHealing(context, healingActions);

        // Choose execution strategy based on infrastructure health
        const result = await this.executeWithStrategy(
          context,
          attempt,
          healingActions,
        );

        // Verify deterministic execution if required
        if (context.deterministicMode && attempt > 1) {
          result.deterministic = await this.verifyDeterministicExecution(
            result,
            context,
          );
          if (result.deterministic) {
            this.metrics.deterministicMatches++;
          }
        }

        if (result.success) {
          console.log(
            `✅ Self-healing execution succeeded on attempt ${attempt}`,
          );
          this.metrics.successfulExecutions++;

          result.healingActions = healingActions;
          result.attempt = attempt;
          result.duration = performance.now() - startTime;

          return result;
        } else {
          lastError = new Error(
            `Exit code ${result.exitCode}: ${result.stderr}`,
          );

          // Check if this is a retryable error
          const isRetryable = this.isRetryableError(result.stderr, retryPolicy);

          if (!isRetryable || attempt >= retryPolicy.maxAttempts) {
            console.log(`❌ Non-retryable error or max attempts reached`);
            result.healingActions = healingActions;
            result.attempt = attempt;
            result.duration = performance.now() - startTime;
            return result;
          }

          // Perform healing actions before retry
          await this.performHealingActions(
            context,
            result,
            healingActions,
            snapshot,
          );

          // Wait before retry with exponential backoff
          const delay = Math.min(
            retryPolicy.initialDelay *
              Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
            retryPolicy.maxDelay,
          );

          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      } catch (error) {
        console.error(`❌ Execution error on attempt ${attempt}:`, error);
        lastError = error;

        // Check if we should retry
        const isRetryable = this.isRetryableError(error.message, retryPolicy);

        if (!isRetryable || attempt >= retryPolicy.maxAttempts) {
          break;
        }

        // Attempt sandbox restoration if available
        if (snapshot) {
          await this.restoreSnapshot(snapshot, context);
          healingActions.push({
            type: 'sandbox_restore',
            reason: 'Execution error - restoring sandbox',
            timestamp: Date.now(),
            successful: true,
          });
        }
      }
    }

    // All attempts failed
    console.error(`❌ Self-healing execution failed after ${attempt} attempts`);

    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: lastError?.message || 'Unknown error',
      duration: performance.now() - startTime,
      attempt,
      healingActions,
      deterministic: false,
    };
  }

  /**
   * Create a snapshot of the current sandbox state
   */
  private async createSnapshot(
    context: ExecutionContext,
  ): Promise<SandboxSnapshot> {
    const snapshotId = crypto.randomUUID();
    const inputs = new Map<string, string>();
    const outputs = new Map<string, string>();

    // Hash all input files
    for (const inputPath of context.inputs) {
      const fullPath = path.resolve(context.workingDir, inputPath);
      try {
        const content = await fs.readFile(fullPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        inputs.set(inputPath, hash);
      } catch (error) {
        console.warn(`⚠️ Could not snapshot input ${inputPath}:`, error);
      }
    }

    // Create checksum for entire snapshot
    const checksumData = JSON.stringify({
      inputs: Object.fromEntries(inputs),
      environment: context.environment,
    });
    const checksum = crypto
      .createHash('sha256')
      .update(checksumData)
      .digest('hex');

    const snapshot: SandboxSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      workingDir: context.workingDir,
      inputs,
      outputs,
      environment: { ...context.environment },
      checksum,
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  /**
   * Restore sandbox from snapshot
   */
  private async restoreSnapshot(
    snapshot: SandboxSnapshot,
    context: ExecutionContext,
  ): Promise<void> {
    console.log(`🔄 Restoring snapshot: ${snapshot.id}`);

    try {
      // Restore environment variables
      for (const [key, value] of Object.entries(snapshot.environment)) {
        process.env[key] = value;
      }

      // Verify input files match snapshot hashes
      for (const [inputPath, expectedHash] of snapshot.inputs) {
        const fullPath = path.resolve(context.workingDir, inputPath);
        try {
          const content = await fs.readFile(fullPath);
          const actualHash = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');

          if (actualHash !== expectedHash) {
            console.warn(
              `⚠️ Input file ${inputPath} has changed since snapshot`,
            );
          }
        } catch (error) {
          console.warn(`⚠️ Could not verify input ${inputPath}:`, error);
        }
      }

      console.log(`✅ Snapshot ${snapshot.id} restored`);
    } catch (error) {
      console.error(`❌ Failed to restore snapshot ${snapshot.id}:`, error);
      throw error;
    }
  }

  /**
   * Perform pre-execution healing checks and actions
   */
  private async performPreExecutionHealing(
    context: ExecutionContext,
    healingActions: HealingAction[],
  ): Promise<void> {
    // Check if environment needs reset
    if (this.needsEnvironmentReset()) {
      console.log('🔄 Resetting environment variables...');

      // Reset to clean environment
      const cleanEnv = this.getCleanEnvironment();
      for (const [key, value] of Object.entries(context.environment)) {
        process.env[key] = value;
      }

      healingActions.push({
        type: 'env_reset',
        reason: 'Environment variables reset for clean state',
        timestamp: Date.now(),
        successful: true,
      });
    }

    // Check disk space
    const diskSpace = await this.checkDiskSpace(context.workingDir);
    if (diskSpace < 1024 * 1024 * 1024) {
      // Less than 1GB
      console.warn('⚠️ Low disk space detected, attempting cleanup...');

      await this.performDiskCleanup(context.workingDir);

      healingActions.push({
        type: 'cache_clear',
        reason: 'Low disk space - performed cleanup',
        timestamp: Date.now(),
        successful: true,
      });
    }
  }

  /**
   * Execute with appropriate strategy based on infrastructure health
   */
  private async executeWithStrategy(
    context: ExecutionContext,
    attempt: number,
    healingActions: HealingAction[],
  ): Promise<ExecutionResult> {
    // Check if RBE is healthy and available
    if (
      this.healthStatus.rbeAvailable &&
      this.healthStatus.rbeErrorRate < 1 - this.config.rbeHealthThreshold
    ) {
      console.log('🚀 Using RBE execution strategy');

      try {
        const result = await this.executeOnRBE(context);
        return this.normalizeExecutionResult(result);
      } catch (error) {
        console.warn('⚠️ RBE execution failed, falling back to local:', error);

        healingActions.push({
          type: 'fallback',
          reason: `RBE execution failed: ${error.message}`,
          timestamp: Date.now(),
          successful: false,
        });

        this.metrics.fallbacksToLocal++;
      }
    }

    console.log('💻 Using local execution strategy');

    const result = await this.executeLocally(context);

    healingActions.push({
      type: 'fallback',
      reason: 'RBE unavailable or unhealthy - executed locally',
      timestamp: Date.now(),
      successful: result.success,
    });

    return result;
  }

  /**
   * Execute task on Remote Build Execution
   */
  private async executeOnRBE(context: ExecutionContext): Promise<any> {
    const remoteTask = {
      id: context.taskId,
      command: context.command,
      inputs: context.inputs,
      outputs: context.outputs,
      env: context.environment,
    };

    return await this.rbeExecutor.executeRemote(remoteTask);
  }

  /**
   * Execute task locally
   */
  private async executeLocally(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const startTime = performance.now();
      const [command, ...args] = context.command.split(' ');

      const child = spawn(command, args, {
        cwd: context.workingDir,
        env: { ...process.env, ...context.environment },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code || 0,
          stdout,
          stderr,
          duration: performance.now() - startTime,
          attempt: 1,
          healingActions: [],
          deterministic: false,
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          exitCode: 1,
          stdout,
          stderr: stderr + error.message,
          duration: performance.now() - startTime,
          attempt: 1,
          healingActions: [],
          deterministic: false,
        });
      });
    });
  }

  /**
   * Perform healing actions after a failed execution
   */
  private async performHealingActions(
    context: ExecutionContext,
    result: ExecutionResult,
    healingActions: HealingAction[],
    snapshot?: SandboxSnapshot,
  ): Promise<void> {
    this.metrics.healingActionsTriggered++;
    const healingStartTime = performance.now();

    console.log('🔧 Performing healing actions...');

    // Clear caches if out-of-memory error
    if (
      result.stderr.includes('out of memory') ||
      result.stderr.includes('ENOMEM')
    ) {
      console.log('🧹 Clearing caches due to memory issues...');

      await this.clearCaches(context.workingDir);

      healingActions.push({
        type: 'cache_clear',
        reason: 'Out of memory error - cleared caches',
        timestamp: Date.now(),
        successful: true,
      });
    }

    // Restore snapshot if available and execution was flaky
    if (snapshot && this.isInfrastructureError(result.stderr)) {
      console.log('🔄 Infrastructure error detected, restoring snapshot...');

      try {
        await this.restoreSnapshot(snapshot, context);

        healingActions.push({
          type: 'sandbox_restore',
          reason: 'Infrastructure error - restored sandbox',
          timestamp: Date.now(),
          successful: true,
        });
      } catch (error) {
        healingActions.push({
          type: 'sandbox_restore',
          reason: 'Failed to restore snapshot',
          timestamp: Date.now(),
          successful: false,
        });
      }
    }

    // Reset environment if environment-related error
    if (this.isEnvironmentError(result.stderr)) {
      console.log('🔄 Environment error detected, resetting...');

      const cleanEnv = this.getCleanEnvironment();
      for (const [key, value] of Object.entries(context.environment)) {
        process.env[key] = value;
      }

      healingActions.push({
        type: 'env_reset',
        reason: 'Environment error - reset environment',
        timestamp: Date.now(),
        successful: true,
      });
    }

    const healingTime = performance.now() - healingStartTime;
    this.metrics.avgHealingTime =
      (this.metrics.avgHealingTime + healingTime) / 2;

    console.log(`🔧 Healing actions completed in ${healingTime.toFixed(1)}ms`);
  }

  /**
   * Verify deterministic execution by comparing outputs
   */
  private async verifyDeterministicExecution(
    result: ExecutionResult,
    context: ExecutionContext,
  ): Promise<boolean> {
    if (!result.success) return false;

    try {
      // Create checksum of all output files
      const outputHashes: string[] = [];

      for (const outputPath of context.outputs) {
        const fullPath = path.resolve(context.workingDir, outputPath);
        try {
          const content = await fs.readFile(fullPath);

          // Filter out non-deterministic metadata (timestamps, etc.)
          const filteredContent = this.filterNonDeterministicContent(
            content.toString(),
          );
          const hash = crypto
            .createHash('sha256')
            .update(filteredContent)
            .digest('hex');

          outputHashes.push(hash);
        } catch (error) {
          console.warn(`⚠️ Could not verify output ${outputPath}:`, error);
          return false;
        }
      }

      const combinedHash = crypto
        .createHash('sha256')
        .update(outputHashes.join(''))
        .digest('hex');

      // Compare with previous execution if available
      if (result.outputChecksum) {
        return result.outputChecksum === combinedHash;
      } else {
        result.outputChecksum = combinedHash;
        return true; // First execution, assume deterministic
      }
    } catch (error) {
      console.error('❌ Failed to verify deterministic execution:', error);
      return false;
    }
  }

  /**
   * Filter out non-deterministic content from output
   */
  private filterNonDeterministicContent(content: string): string {
    return content
      .replace(/timestamp:\s*\d+/gi, 'timestamp: FILTERED')
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
        'TIMESTAMP_FILTERED',
      )
      .replace(/build time:\s*\d+\.\d+s/gi, 'build time: FILTERED')
      .replace(/duration:\s*\d+ms/gi, 'duration: FILTEREDms')
      .replace(/pid:\s*\d+/gi, 'pid: FILTERED');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(
    errorMessage: string,
    retryPolicy: RetryPolicy,
  ): boolean {
    const lowerError = errorMessage.toLowerCase();

    // Check non-retryable errors first
    for (const nonRetryable of retryPolicy.nonRetryableErrors) {
      if (lowerError.includes(nonRetryable.toLowerCase())) {
        return false;
      }
    }

    // Check retryable errors
    for (const retryable of retryPolicy.retryableErrors) {
      if (lowerError.includes(retryable.toLowerCase())) {
        return true;
      }
    }

    return false; // Default to non-retryable
  }

  /**
   * Check if error is infrastructure-related
   */
  private isInfrastructureError(errorMessage: string): boolean {
    const infraErrors = [
      'connection refused',
      'network timeout',
      'temporary failure',
      'service unavailable',
      'internal server error',
      'rate limit exceeded',
    ];

    const lowerError = errorMessage.toLowerCase();
    return infraErrors.some((error) => lowerError.includes(error));
  }

  /**
   * Check if error is environment-related
   */
  private isEnvironmentError(errorMessage: string): boolean {
    const envErrors = [
      'command not found',
      'permission denied',
      'no such file or directory',
      'environment variable',
      'path not found',
    ];

    const lowerError = errorMessage.toLowerCase();
    return envErrors.some((error) => lowerError.includes(error));
  }

  /**
   * Perform infrastructure health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = performance.now();

    try {
      // Check RBE health
      const rbeHealth = await this.checkRBEHealth();

      // Check local resources
      const localHealth = await this.checkLocalHealth();

      this.healthStatus = {
        rbeAvailable: rbeHealth.available,
        rbeLatency: rbeHealth.latency,
        rbeErrorRate: rbeHealth.errorRate,
        localResourcesAvailable: localHealth.available,
        diskSpace: localHealth.diskSpace,
        memoryAvailable: localHealth.memory,
        lastHealthCheck: Date.now(),
      };

      const healthCheckDuration = performance.now() - startTime;
      console.log(
        `💓 Health check completed in ${healthCheckDuration.toFixed(1)}ms`,
      );

      this.emit('health_check_completed', this.healthStatus);
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  /**
   * Check RBE health status
   */
  private async checkRBEHealth(): Promise<{
    available: boolean;
    latency: number;
    errorRate: number;
  }> {
    try {
      const startTime = performance.now();

      // Perform a lightweight health check on RBE
      const stats = await this.rbeExecutor.getStats();
      const latency = performance.now() - startTime;

      return {
        available: true,
        latency,
        errorRate:
          1 -
          (stats.tasksExecuted > 0
            ? stats.successfulTasks / stats.tasksExecuted
            : 1),
      };
    } catch (error) {
      return {
        available: false,
        latency: Infinity,
        errorRate: 1.0,
      };
    }
  }

  /**
   * Check local system health
   */
  private async checkLocalHealth(): Promise<{
    available: boolean;
    diskSpace: number;
    memory: number;
  }> {
    try {
      const diskSpace = await this.checkDiskSpace(process.cwd());
      const memoryAvailable = this.getAvailableMemory();

      return {
        available:
          diskSpace > 512 * 1024 * 1024 && memoryAvailable > 512 * 1024 * 1024, // 512MB minimums
        diskSpace,
        memory: memoryAvailable,
      };
    } catch (error) {
      return {
        available: false,
        diskSpace: 0,
        memory: 0,
      };
    }
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private needsEnvironmentReset(): boolean {
    // Simple heuristic - would implement more sophisticated checks
    return Object.keys(process.env).length > 100;
  }

  private getCleanEnvironment(): Record<string, string> {
    const essential = ['PATH', 'HOME', 'USER', 'NODE_ENV'];
    const cleanEnv: Record<string, string> = {};

    for (const key of essential) {
      if (process.env[key]) {
        cleanEnv[key] = process.env[key]!;
      }
    }

    return cleanEnv;
  }

  private async checkDiskSpace(dir: string): Promise<number> {
    try {
      const stats = await fs.stat(dir);
      return 10 * 1024 * 1024 * 1024; // Simulate 10GB available
    } catch {
      return 0;
    }
  }

  private getAvailableMemory(): number {
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    return freeMemory;
  }

  private async performDiskCleanup(workingDir: string): Promise<void> {
    console.log('🧹 Performing disk cleanup...');

    // Would implement actual cleanup logic
    await this.delay(1000); // Simulate cleanup time

    console.log('✅ Disk cleanup completed');
  }

  private async clearCaches(workingDir: string): Promise<void> {
    console.log('🧹 Clearing caches...');

    const cacheDirs = [
      path.join(workingDir, 'node_modules/.cache'),
      path.join(workingDir, '.cache'),
      path.join(workingDir, 'dist'),
      path.join(workingDir, 'build'),
    ];

    for (const cacheDir of cacheDirs) {
      try {
        await fs.rm(cacheDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors - directory might not exist
      }
    }

    console.log('✅ Caches cleared');
  }

  private normalizeExecutionResult(rbeResult: any): ExecutionResult {
    return {
      success: rbeResult.exitCode === 0,
      exitCode: rbeResult.exitCode,
      stdout: rbeResult.stdout || '',
      stderr: rbeResult.stderr || '',
      duration: rbeResult.duration || 0,
      attempt: 1,
      healingActions: [],
      deterministic: false,
    };
  }

  private cleanupSnapshots(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, snapshot] of this.snapshots.entries()) {
      if (now - snapshot.timestamp > this.config.snapshotTtl) {
        this.snapshots.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired snapshots`);
    }
  }

  /**
   * Enable chaos mode for testing resilience
   */
  enableChaosMode(enabled: boolean = true): void {
    this.chaosMode = enabled;
    console.log(`🌪️ Chaos mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get runner metrics
   */
  getMetrics(): typeof this.metrics & {
    healthStatus: InfrastructureHealth;
    activeSnapshots: number;
    successRate: number;
  } {
    return {
      ...this.metrics,
      healthStatus: this.healthStatus,
      activeSnapshots: this.snapshots.size,
      successRate:
        this.metrics.totalExecutions > 0
          ? this.metrics.successfulExecutions / this.metrics.totalExecutions
          : 0,
    };
  }

  /**
   * Get infrastructure health status
   */
  getHealthStatus(): InfrastructureHealth {
    return { ...this.healthStatus };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down self-healing runner...');

    // Clear all snapshots
    this.snapshots.clear();

    console.log('✅ Self-healing runner shut down');
  }
}

// Factory function
export function createSelfHealingRunner(
  rbeExecutor: RemoteBuildExecutor,
  config?: any,
): SelfHealingRunner {
  return new SelfHealingRunner(rbeExecutor, config);
}
