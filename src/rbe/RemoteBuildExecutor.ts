/**
 * Remote Build Execution (RBE) - Composer vNext+1
 * Pluggable executor with sandboxed workers and CAS-backed I/O
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface RBEConfig {
  schedulerEndpoint: string;
  workerPool: 'kubernetes' | 'aws-batch' | 'local';
  maxConcurrentJobs: number;
  timeout: number;
  casEndpoint: string;
  regions: string[];
  affinity?: {
    architecture?: 'amd64' | 'arm64';
    zone?: string;
    instanceType?: string;
  };
}

export interface RemoteTask {
  id: string;
  command: string[];
  workingDir: string;
  inputs: InputSpec[];
  outputs: OutputSpec[];
  environment: Record<string, string>;
  platform: {
    arch: 'amd64' | 'arm64';
    os: 'linux' | 'darwin' | 'windows';
  };
  resources: {
    cpu: number;
    memory: string; // e.g., "2Gi"
    disk?: string;
  };
  timeout: number;
  retries: number;
}

export interface InputSpec {
  path: string;
  digest: string;
  size: number;
  executable?: boolean;
}

export interface OutputSpec {
  path: string;
  required: boolean;
}

export interface RemoteResult {
  taskId: string;
  success: boolean;
  exitCode: number;
  duration: number;
  stdout: string;
  stderr: string;
  outputs: Array<{
    path: string;
    digest: string;
    size: number;
  }>;
  worker: {
    id: string;
    region: string;
    instanceType: string;
  };
  cacheHit: boolean;
  retries: number;
}

export interface WorkerStats {
  id: string;
  region: string;
  status: 'idle' | 'busy' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  totalRuntime: number;
  avgTaskDuration: number;
  cpuUtilization: number;
  memoryUtilization: number;
}

export class RemoteBuildExecutor extends EventEmitter {
  private config: RBEConfig;
  private runningTasks = new Map<string, RemoteTask>();
  private workerStats = new Map<string, WorkerStats>();
  private taskQueue: RemoteTask[] = [];
  private isProcessing = false;

  constructor(config: RBEConfig) {
    super();
    this.config = config;
    this.initializeScheduler();
  }

  private async initializeScheduler(): Promise<void> {
    console.log('🏗️ Initializing RBE Scheduler...');
    console.log(`   Pool: ${this.config.workerPool}`);
    console.log(`   Max concurrent: ${this.config.maxConcurrentJobs}`);
    console.log(`   CAS: ${this.config.casEndpoint}`);

    // Initialize worker pool based on backend
    switch (this.config.workerPool) {
      case 'kubernetes':
        await this.initializeK8sWorkers();
        break;
      case 'aws-batch':
        await this.initializeAWSBatch();
        break;
      case 'local':
        await this.initializeLocalWorkers();
        break;
    }

    console.log('✅ RBE Scheduler initialized');
  }

  /**
   * Execute task remotely with CAS input/output handling
   */
  async executeRemote(task: RemoteTask): Promise<RemoteResult> {
    console.log(`🚀 Scheduling remote task: ${task.id}`);

    // Upload inputs to CAS
    const inputUploads = await this.uploadInputsToCAS(task.inputs);
    console.log(`📦 Uploaded ${inputUploads.length} inputs to CAS`);

    // Check for cached result first
    const cacheKey = this.generateCacheKey(task);
    const cachedResult = await this.checkCachedResult(cacheKey);

    if (cachedResult) {
      console.log(`📦 Cache hit for task ${task.id}`);
      return {
        ...cachedResult,
        taskId: task.id,
        cacheHit: true,
      };
    }

    // Find available worker
    const worker = await this.allocateWorker(task);
    if (!worker) {
      throw new Error(`No available workers for task ${task.id}`);
    }

    const startTime = performance.now();

    try {
      // Execute on remote worker
      const result = await this.executeOnWorker(worker, task, inputUploads);

      // Download outputs from CAS
      await this.downloadOutputsFromCAS(result.outputs);

      // Cache successful result
      if (result.success) {
        await this.cacheResult(cacheKey, result);
      }

      const duration = performance.now() - startTime;
      result.duration = duration;

      this.emit('taskCompleted', result);
      console.log(
        `✅ Remote task completed: ${task.id} (${Math.round(duration)}ms)`,
      );

      return result;
    } catch (error) {
      console.error(`❌ Remote task failed: ${task.id}`, error);

      const failedResult: RemoteResult = {
        taskId: task.id,
        success: false,
        exitCode: 1,
        duration: performance.now() - startTime,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        outputs: [],
        worker: {
          id: worker.id,
          region: worker.region,
          instanceType: worker.instanceType || 'unknown',
        },
        cacheHit: false,
        retries: 0,
      };

      this.emit('taskFailed', failedResult);
      return failedResult;
    }
  }

  /**
   * Get real-time worker utilization stats
   */
  getWorkerUtilization(): {
    totalWorkers: number;
    busyWorkers: number;
    utilization: number;
    avgTaskDuration: number;
    queueDepth: number;
    regionStats: Record<string, { workers: number; busy: number }>;
  } {
    const totalWorkers = this.workerStats.size;
    const busyWorkers = Array.from(this.workerStats.values()).filter(
      (w) => w.status === 'busy',
    ).length;

    const utilization =
      totalWorkers > 0 ? (busyWorkers / totalWorkers) * 100 : 0;

    const avgTaskDuration =
      Array.from(this.workerStats.values()).reduce(
        (sum, w) => sum + w.avgTaskDuration,
        0,
      ) / totalWorkers;

    // Region breakdown
    const regionStats: Record<string, { workers: number; busy: number }> = {};
    for (const worker of this.workerStats.values()) {
      if (!regionStats[worker.region]) {
        regionStats[worker.region] = { workers: 0, busy: 0 };
      }
      regionStats[worker.region].workers++;
      if (worker.status === 'busy') {
        regionStats[worker.region].busy++;
      }
    }

    return {
      totalWorkers,
      busyWorkers,
      utilization,
      avgTaskDuration,
      queueDepth: this.taskQueue.length,
      regionStats,
    };
  }

  /**
   * Scale worker pool based on demand
   */
  async scaleWorkers(targetCount: number): Promise<void> {
    const currentCount = this.workerStats.size;

    console.log(`📈 Scaling workers: ${currentCount} -> ${targetCount}`);

    if (targetCount > currentCount) {
      // Scale up
      const toAdd = targetCount - currentCount;
      await this.addWorkers(toAdd);
    } else if (targetCount < currentCount) {
      // Scale down
      const toRemove = currentCount - targetCount;
      await this.removeWorkers(toRemove);
    }
  }

  private async uploadInputsToCAS(
    inputs: InputSpec[],
  ): Promise<Array<{ path: string; casUrl: string }>> {
    const uploads: Array<{ path: string; casUrl: string }> = [];

    for (const input of inputs) {
      // In real implementation, this would upload to remote CAS
      // For demo, we simulate with local file operations
      const casUrl = `${this.config.casEndpoint}/blobs/${input.digest}`;

      // Simulate upload
      console.log(`📤 Uploading ${input.path} to CAS (${input.size} bytes)`);

      uploads.push({
        path: input.path,
        casUrl,
      });
    }

    return uploads;
  }

  private async downloadOutputsFromCAS(
    outputs: Array<{ path: string; digest: string; size: number }>,
  ): Promise<void> {
    for (const output of outputs) {
      console.log(
        `📥 Downloading ${output.path} from CAS (${output.size} bytes)`,
      );
      // In real implementation, download from remote CAS
      // For demo, simulate local file creation
      await fs.writeFile(
        output.path,
        `simulated-output-${output.digest}`,
        'utf8',
      );
    }
  }

  private generateCacheKey(task: RemoteTask): string {
    const hasher = crypto.createHash('sha256');
    hasher.update(
      JSON.stringify({
        command: task.command,
        inputs: task.inputs.map((i) => ({ path: i.path, digest: i.digest })),
        environment: task.environment,
        platform: task.platform,
      }),
    );
    return hasher.digest('hex');
  }

  private async checkCachedResult(
    cacheKey: string,
  ): Promise<RemoteResult | null> {
    // In real implementation, check CAS for cached result
    // For demo, simulate cache miss most of the time
    return Math.random() > 0.8 ? null : null; // Always miss for demo
  }

  private async cacheResult(
    cacheKey: string,
    result: RemoteResult,
  ): Promise<void> {
    // In real implementation, store result in CAS
    console.log(`💾 Caching result for key: ${cacheKey.substring(0, 8)}...`);
  }

  private async allocateWorker(task: RemoteTask): Promise<WorkerStats | null> {
    // Find best worker based on affinity and availability
    const availableWorkers = Array.from(this.workerStats.values()).filter(
      (w) => w.status === 'idle',
    );

    if (availableWorkers.length === 0) {
      // Auto-scale if needed
      if (this.workerStats.size < this.config.maxConcurrentJobs) {
        await this.addWorkers(1);
        // Return the newly created worker (simulated)
        return this.createSimulatedWorker();
      }
      return null;
    }

    // Simple round-robin allocation
    const worker = availableWorkers[0];
    worker.status = 'busy';
    worker.currentTask = task.id;

    return worker;
  }

  private async executeOnWorker(
    worker: WorkerStats,
    task: RemoteTask,
    inputs: Array<{ path: string; casUrl: string }>,
  ): Promise<RemoteResult> {
    const startTime = performance.now();

    // Simulate remote execution
    const executionTime = Math.random() * 5000 + 1000; // 1-6 seconds
    await new Promise((resolve) => setTimeout(resolve, executionTime));

    // Update worker stats
    worker.tasksCompleted++;
    worker.totalRuntime += executionTime;
    worker.avgTaskDuration = worker.totalRuntime / worker.tasksCompleted;
    worker.status = 'idle';
    worker.currentTask = undefined;

    // Simulate outputs
    const outputs = task.outputs.map((output) => ({
      path: output.path,
      digest: crypto.randomBytes(16).toString('hex'),
      size: Math.floor(Math.random() * 10000) + 1000,
    }));

    return {
      taskId: task.id,
      success: Math.random() > 0.05, // 95% success rate
      exitCode: 0,
      duration: executionTime,
      stdout: `Task ${task.id} completed successfully`,
      stderr: '',
      outputs,
      worker: {
        id: worker.id,
        region: worker.region,
        instanceType: 'c5.large',
      },
      cacheHit: false,
      retries: 0,
    };
  }

  private async initializeK8sWorkers(): Promise<void> {
    console.log('🚢 Initializing Kubernetes workers...');

    // Create initial worker pool
    for (let i = 0; i < 3; i++) {
      const worker = this.createSimulatedWorker();
      this.workerStats.set(worker.id, worker);
    }
  }

  private async initializeAWSBatch(): Promise<void> {
    console.log('☁️ Initializing AWS Batch workers...');

    // Create initial worker pool
    for (let i = 0; i < 3; i++) {
      const worker = this.createSimulatedWorker();
      this.workerStats.set(worker.id, worker);
    }
  }

  private async initializeLocalWorkers(): Promise<void> {
    console.log('💻 Initializing local workers...');

    // Create local worker pool
    for (let i = 0; i < 2; i++) {
      const worker = this.createSimulatedWorker();
      worker.region = 'local';
      this.workerStats.set(worker.id, worker);
    }
  }

  private createSimulatedWorker(): WorkerStats {
    const regions =
      this.config.regions.length > 0
        ? this.config.regions
        : ['us-west-2', 'us-east-1'];
    const region = regions[Math.floor(Math.random() * regions.length)];

    return {
      id: `worker-${crypto.randomBytes(4).toString('hex')}`,
      region,
      status: 'idle',
      tasksCompleted: 0,
      totalRuntime: 0,
      avgTaskDuration: 0,
      cpuUtilization: Math.random() * 20 + 10, // 10-30%
      memoryUtilization: Math.random() * 30 + 20, // 20-50%
    };
  }

  private async addWorkers(count: number): Promise<void> {
    console.log(`➕ Adding ${count} workers...`);

    for (let i = 0; i < count; i++) {
      const worker = this.createSimulatedWorker();
      this.workerStats.set(worker.id, worker);
    }

    console.log(`✅ Added ${count} workers`);
  }

  private async removeWorkers(count: number): Promise<void> {
    console.log(`➖ Removing ${count} workers...`);

    const idleWorkers = Array.from(this.workerStats.entries())
      .filter(([_, w]) => w.status === 'idle')
      .slice(0, count);

    for (const [workerId] of idleWorkers) {
      this.workerStats.delete(workerId);
    }

    console.log(`✅ Removed ${idleWorkers.length} workers`);
  }

  /**
   * Shutdown RBE gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down RBE...');

    // Wait for running tasks to complete
    while (this.runningTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Clean up workers
    this.workerStats.clear();

    console.log('✅ RBE shutdown complete');
  }
}

// Factory function
export function createRemoteBuildExecutor(
  config: RBEConfig,
): RemoteBuildExecutor {
  return new RemoteBuildExecutor(config);
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: RBEConfig = {
    schedulerEndpoint: 'http://localhost:8080',
    workerPool: 'local',
    maxConcurrentJobs: 4,
    timeout: 300000,
    casEndpoint: 'http://localhost:9000',
    regions: ['us-west-2', 'us-east-1'],
  };

  const rbe = createRemoteBuildExecutor(config);

  // Test task
  const testTask: RemoteTask = {
    id: 'test-compile-1',
    command: ['gcc', '-c', 'main.c', '-o', 'main.o'],
    workingDir: '/tmp/build',
    inputs: [{ path: 'main.c', digest: 'abc123', size: 1024 }],
    outputs: [{ path: 'main.o', required: true }],
    environment: { CC: 'gcc' },
    platform: { arch: 'amd64', os: 'linux' },
    resources: { cpu: 1, memory: '1Gi' },
    timeout: 30000,
    retries: 2,
  };

  // Execute test task
  rbe
    .executeRemote(testTask)
    .then((result) => {
      console.log('✅ Test task completed:', result);

      // Show utilization stats
      const stats = rbe.getWorkerUtilization();
      console.log('\n📊 Worker Utilization:');
      console.log(`   Total workers: ${stats.totalWorkers}`);
      console.log(`   Utilization: ${stats.utilization.toFixed(1)}%`);
      console.log(`   Queue depth: ${stats.queueDepth}`);

      rbe.shutdown();
    })
    .catch((error) => {
      console.error('❌ Test task failed:', error);
      process.exit(1);
    });
}
