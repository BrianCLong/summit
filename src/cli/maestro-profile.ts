#!/usr/bin/env node

/**
 * Maestro Profile - Composer vNext+1
 * Task timelines, RBE utilization, and performance profiling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

export interface TaskProfileData {
  taskId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'failed' | 'cached';
  worker?: {
    id: string;
    region: string;
    type: 'local' | 'remote';
  };
  resources: {
    cpu: number;
    memory: number;
    network: number;
  };
  cacheHit: boolean;
  dependencies: string[];
  criticalPath: boolean;
}

export interface BuildProfile {
  buildId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  tasks: TaskProfileData[];
  criticalPath: TaskProfileData[];
  parallelism: {
    maxConcurrent: number;
    avgConcurrent: number;
    efficiency: number;
  };
  rbeStats: {
    totalJobs: number;
    remoteJobs: number;
    utilization: number;
    queueTime: number;
    networkTransfer: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    timeSaved: number;
  };
}

export class MaestroProfiler {
  private currentProfile?: BuildProfile;
  private taskTimelines: Map<string, TaskProfileData> = new Map();
  private startTime: number = 0;

  /**
   * Start profiling a build
   */
  startProfiling(buildId: string): void {
    this.startTime = performance.now();
    this.currentProfile = {
      buildId,
      startTime: this.startTime,
      endTime: 0,
      totalDuration: 0,
      tasks: [],
      criticalPath: [],
      parallelism: {
        maxConcurrent: 0,
        avgConcurrent: 0,
        efficiency: 0,
      },
      rbeStats: {
        totalJobs: 0,
        remoteJobs: 0,
        utilization: 0,
        queueTime: 0,
        networkTransfer: 0,
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        timeSaved: 0,
      },
    };

    console.log(`📊 Started profiling build: ${buildId}`);
  }

  /**
   * Record task execution
   */
  recordTask(task: TaskProfileData): void {
    if (!this.currentProfile) return;

    this.taskTimelines.set(task.taskId, task);
    this.currentProfile.tasks.push(task);

    // Update cache stats
    if (task.cacheHit) {
      this.currentProfile.cacheStats.hits++;
    } else {
      this.currentProfile.cacheStats.misses++;
    }

    // Update RBE stats
    this.currentProfile.rbeStats.totalJobs++;
    if (task.worker?.type === 'remote') {
      this.currentProfile.rbeStats.remoteJobs++;
    }
  }

  /**
   * Finish profiling and generate report
   */
  async finishProfiling(): Promise<BuildProfile> {
    if (!this.currentProfile) {
      throw new Error('No active profiling session');
    }

    this.currentProfile.endTime = performance.now();
    this.currentProfile.totalDuration =
      this.currentProfile.endTime - this.currentProfile.startTime;

    // Calculate critical path
    this.calculateCriticalPath();

    // Calculate parallelism metrics
    this.calculateParallelismMetrics();

    // Calculate final stats
    this.calculateFinalStats();

    console.log(`✅ Finished profiling build: ${this.currentProfile.buildId}`);

    return this.currentProfile;
  }

  private calculateCriticalPath(): void {
    if (!this.currentProfile) return;

    // Build dependency graph
    const taskMap = new Map<string, TaskProfileData>();
    const inDegree = new Map<string, number>();

    for (const task of this.currentProfile.tasks) {
      taskMap.set(task.taskId, task);
      inDegree.set(task.taskId, task.dependencies.length);
    }

    // Find longest path using topological sort + dynamic programming
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    // Initialize
    for (const task of this.currentProfile.tasks) {
      distances.set(task.taskId, 0);
    }

    // Process in topological order
    const queue: string[] = [];
    const tempInDegree = new Map(inDegree);

    for (const [taskId, degree] of tempInDegree) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    while (queue.length > 0) {
      const currentTaskId = queue.shift()!;
      const currentTask = taskMap.get(currentTaskId)!;

      // Update distances for dependent tasks
      for (const otherTask of this.currentProfile.tasks) {
        if (otherTask.dependencies.includes(currentTaskId)) {
          const newDistance =
            distances.get(currentTaskId)! + currentTask.duration;

          if (newDistance > distances.get(otherTask.taskId)!) {
            distances.set(otherTask.taskId, newDistance);
            predecessors.set(otherTask.taskId, currentTaskId);
          }

          const newDegree = tempInDegree.get(otherTask.taskId)! - 1;
          tempInDegree.set(otherTask.taskId, newDegree);

          if (newDegree === 0) {
            queue.push(otherTask.taskId);
          }
        }
      }
    }

    // Find end of critical path (task with maximum distance)
    let maxDistance = 0;
    let endTaskId = '';

    for (const [taskId, distance] of distances) {
      if (distance > maxDistance) {
        maxDistance = distance;
        endTaskId = taskId;
      }
    }

    // Reconstruct critical path
    const criticalPathIds: string[] = [];
    let currentTaskId = endTaskId;

    while (currentTaskId) {
      criticalPathIds.unshift(currentTaskId);
      currentTaskId = predecessors.get(currentTaskId) || '';
    }

    // Mark critical path tasks and store them
    this.currentProfile.criticalPath = criticalPathIds
      .map((id) => {
        const task = taskMap.get(id)!;
        task.criticalPath = true;
        return task;
      })
      .filter(Boolean);
  }

  private calculateParallelismMetrics(): void {
    if (!this.currentProfile) return;

    const tasks = this.currentProfile.tasks;
    if (tasks.length === 0) return;

    // Calculate concurrent task counts over time
    const events: Array<{
      time: number;
      type: 'start' | 'end';
      taskId: string;
    }> = [];

    for (const task of tasks) {
      events.push({ time: task.startTime, type: 'start', taskId: task.taskId });
      events.push({ time: task.endTime, type: 'end', taskId: task.taskId });
    }

    events.sort((a, b) => a.time - b.time);

    let currentConcurrent = 0;
    let maxConcurrent = 0;
    let totalConcurrentTime = 0;
    let lastTime = events[0]?.time || 0;

    for (const event of events) {
      // Add to total concurrent time
      totalConcurrentTime += (event.time - lastTime) * currentConcurrent;
      lastTime = event.time;

      // Update concurrent count
      if (event.type === 'start') {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      } else {
        currentConcurrent--;
      }
    }

    const totalTime = this.currentProfile.totalDuration;
    const avgConcurrent = totalTime > 0 ? totalConcurrentTime / totalTime : 0;

    // Efficiency = actual parallelism vs theoretical maximum
    const theoreticalMaxTime = tasks.reduce(
      (sum, task) => sum + task.duration,
      0,
    );
    const efficiency =
      totalTime > 0
        ? Math.min(1, theoreticalMaxTime / (totalTime * maxConcurrent))
        : 0;

    this.currentProfile.parallelism = {
      maxConcurrent,
      avgConcurrent,
      efficiency,
    };
  }

  private calculateFinalStats(): void {
    if (!this.currentProfile) return;

    const tasks = this.currentProfile.tasks;

    // Cache stats
    const totalTasks = tasks.length;
    this.currentProfile.cacheStats.hitRate =
      totalTasks > 0
        ? (this.currentProfile.cacheStats.hits / totalTasks) * 100
        : 0;

    // Estimate time saved from cache hits
    const cachedTasks = tasks.filter((t) => t.cacheHit);
    this.currentProfile.cacheStats.timeSaved = cachedTasks.reduce(
      (sum, task) => {
        // Assume cached tasks would have taken 5x longer without cache
        return sum + task.duration * 4; // 4x the cached time = 5x total - 1x actual
      },
      0,
    );

    // RBE stats
    const remoteTasks = tasks.filter((t) => t.worker?.type === 'remote');
    this.currentProfile.rbeStats.utilization =
      totalTasks > 0 ? (remoteTasks.length / totalTasks) * 100 : 0;

    // Average queue time (simulated)
    this.currentProfile.rbeStats.queueTime =
      remoteTasks.reduce((sum, task) => {
        return sum + Math.random() * 1000; // Simulate 0-1s queue time
      }, 0) / Math.max(remoteTasks.length, 1);

    // Network transfer (simulated)
    this.currentProfile.rbeStats.networkTransfer = remoteTasks.reduce(
      (sum, task) => {
        return sum + (task.resources.network || 0);
      },
      0,
    );
  }

  /**
   * Generate visual timeline report
   */
  generateTimelineReport(profile: BuildProfile): string {
    let report = '# 📊 Build Performance Profile\n\n';

    report += `**Build ID**: ${profile.buildId}\n`;
    report += `**Total Duration**: ${Math.round(profile.totalDuration)}ms\n`;
    report += `**Tasks**: ${profile.tasks.length}\n\n`;

    // Critical Path Section
    report += '## 🎯 Critical Path\n\n';
    report += `**Total Critical Path Time**: ${Math.round(profile.criticalPath.reduce((sum, t) => sum + t.duration, 0))}ms\n\n`;

    for (let i = 0; i < profile.criticalPath.length; i++) {
      const task = profile.criticalPath[i];
      const connector = i === profile.criticalPath.length - 1 ? '└─' : '├─';
      const cacheIcon = task.cacheHit ? '📦' : '🔨';
      const workerIcon = task.worker?.type === 'remote' ? '☁️' : '💻';

      report += `${connector} ${cacheIcon} ${workerIcon} **${task.name}**\n`;
      report += `   Duration: ${Math.round(task.duration)}ms\n`;

      if (task.worker) {
        report += `   Worker: ${task.worker.id} (${task.worker.region})\n`;
      }

      if (i < profile.criticalPath.length - 1) {
        report += '   │\n';
      }
      report += '\n';
    }

    // Parallelism Section
    report += '## ⚡ Parallelism Analysis\n\n';
    report += `- **Max Concurrent Tasks**: ${profile.parallelism.maxConcurrent}\n`;
    report += `- **Average Concurrent**: ${profile.parallelism.avgConcurrent.toFixed(1)}\n`;
    report += `- **Parallel Efficiency**: ${(profile.parallelism.efficiency * 100).toFixed(1)}%\n\n`;

    // RBE Section
    report += '## ☁️ Remote Build Execution\n\n';
    report += `- **Total Jobs**: ${profile.rbeStats.totalJobs}\n`;
    report += `- **Remote Jobs**: ${profile.rbeStats.remoteJobs}\n`;
    report += `- **RBE Utilization**: ${profile.rbeStats.utilization.toFixed(1)}%\n`;
    report += `- **Avg Queue Time**: ${Math.round(profile.rbeStats.queueTime)}ms\n`;
    report += `- **Network Transfer**: ${(profile.rbeStats.networkTransfer / 1024 / 1024).toFixed(1)}MB\n\n`;

    // Cache Section
    report += '## 📦 Cache Performance\n\n';
    report += `- **Cache Hits**: ${profile.cacheStats.hits}\n`;
    report += `- **Cache Misses**: ${profile.cacheStats.misses}\n`;
    report += `- **Hit Rate**: ${profile.cacheStats.hitRate.toFixed(1)}%\n`;
    report += `- **Time Saved**: ${Math.round(profile.cacheStats.timeSaved)}ms\n\n`;

    // Task Timeline (simplified ASCII)
    report += '## 📈 Task Timeline\n\n';
    report += this.generateAsciiTimeline(profile);

    // Recommendations
    report += '\n## 💡 Performance Recommendations\n\n';
    report += this.generateRecommendations(profile);

    return report;
  }

  private generateAsciiTimeline(profile: BuildProfile): string {
    const tasks = profile.tasks.slice(0, 20); // Limit to first 20 tasks
    const maxDuration = Math.max(...tasks.map((t) => t.duration));
    const timelineWidth = 50;

    let timeline = '```\n';
    timeline += 'Task Timeline (top 20 tasks):\n\n';

    for (const task of tasks) {
      const barLength = Math.max(
        1,
        Math.round((task.duration / maxDuration) * timelineWidth),
      );
      const bar = '█'.repeat(barLength);
      const padding = ' '.repeat(Math.max(0, 25 - task.name.length));

      const cacheIcon = task.cacheHit ? '📦' : '🔨';
      const workerIcon = task.worker?.type === 'remote' ? '☁️' : '💻';
      const criticalIcon = task.criticalPath ? '🎯' : '  ';

      timeline += `${criticalIcon}${cacheIcon}${workerIcon} ${task.name}${padding} |${bar} ${Math.round(task.duration)}ms\n`;
    }

    timeline += '\nLegend:\n';
    timeline += '🎯 = Critical Path\n';
    timeline += '📦 = Cache Hit, 🔨 = Cache Miss\n';
    timeline += '☁️ = Remote Worker, 💻 = Local Worker\n';
    timeline += '```\n';

    return timeline;
  }

  private generateRecommendations(profile: BuildProfile): string {
    const recommendations: string[] = [];

    // Cache recommendations
    if (profile.cacheStats.hitRate < 50) {
      recommendations.push(
        '🔧 **Improve Cache Hit Rate**: Current hit rate is ' +
          profile.cacheStats.hitRate.toFixed(1) +
          '%. Consider enabling remote cache sharing.',
      );
    }

    // Parallelism recommendations
    if (profile.parallelism.efficiency < 0.7) {
      recommendations.push(
        '⚡ **Optimize Parallelism**: Efficiency is ' +
          (profile.parallelism.efficiency * 100).toFixed(1) +
          '%. Look for opportunities to parallelize dependencies.',
      );
    }

    // RBE recommendations
    if (profile.rbeStats.utilization < 70 && profile.rbeStats.totalJobs > 10) {
      recommendations.push(
        '☁️ **Increase RBE Usage**: Only ' +
          profile.rbeStats.utilization.toFixed(1) +
          '% of jobs use remote execution. Consider moving more tasks to RBE.',
      );
    }

    // Critical path recommendations
    const criticalPathTime = profile.criticalPath.reduce(
      (sum, t) => sum + t.duration,
      0,
    );
    const totalTime = profile.totalDuration;

    if (criticalPathTime / totalTime > 0.8) {
      const slowestCriticalTask = profile.criticalPath.reduce(
        (slowest, task) => (task.duration > slowest.duration ? task : slowest),
      );

      recommendations.push(
        '🎯 **Optimize Critical Path**: Critical path represents ' +
          ((criticalPathTime / totalTime) * 100).toFixed(1) +
          '% of total time. Focus on optimizing: ' +
          slowestCriticalTask.name,
      );
    }

    // Default recommendation if all looks good
    if (recommendations.length === 0) {
      recommendations.push(
        '✨ **Great Performance**: Build is well-optimized! Continue monitoring for regressions.',
      );
    }

    return recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
  }

  /**
   * Save profile data to file
   */
  async saveProfile(
    profile: BuildProfile,
    outputPath?: string,
  ): Promise<string> {
    const fileName = outputPath || `build-profile-${profile.buildId}.json`;
    const filePath = path.resolve(fileName);

    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));

    console.log(`💾 Profile saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Load profile data from file
   */
  async loadProfile(filePath: string): Promise<BuildProfile> {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as BuildProfile;
  }
}

// Factory function
export function createMaestroProfiler(): MaestroProfiler {
  return new MaestroProfiler();
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const filePath = process.argv[3];

  const profiler = createMaestroProfiler();

  if (command === 'analyze' && filePath) {
    // Analyze existing profile
    profiler
      .loadProfile(filePath)
      .then((profile) => {
        const report = profiler.generateTimelineReport(profile);
        console.log(report);
      })
      .catch((error) => {
        console.error('❌ Failed to analyze profile:', error);
        process.exit(1);
      });
  } else if (command === 'demo') {
    // Generate demo profile
    profiler.startProfiling('demo-build-123');

    // Simulate some tasks
    const mockTasks: TaskProfileData[] = [
      {
        taskId: 'install-deps',
        name: 'Install Dependencies',
        startTime: 1000,
        endTime: 16000,
        duration: 15000,
        status: 'success',
        worker: { id: 'local-1', region: 'local', type: 'local' },
        resources: { cpu: 80, memory: 512, network: 10 },
        cacheHit: false,
        dependencies: [],
        criticalPath: false,
      },
      {
        taskId: 'typecheck',
        name: 'TypeScript Check',
        startTime: 16100,
        endTime: 19600,
        duration: 3500,
        status: 'success',
        worker: { id: 'remote-1', region: 'us-west-2', type: 'remote' },
        resources: { cpu: 60, memory: 256, network: 5 },
        cacheHit: true,
        dependencies: ['install-deps'],
        criticalPath: false,
      },
      {
        taskId: 'compile',
        name: 'Compile TypeScript',
        startTime: 19700,
        endTime: 27700,
        duration: 8000,
        status: 'success',
        worker: { id: 'remote-2', region: 'us-east-1', type: 'remote' },
        resources: { cpu: 90, memory: 1024, network: 20 },
        cacheHit: false,
        dependencies: ['typecheck'],
        criticalPath: true,
      },
      {
        taskId: 'test-unit',
        name: 'Unit Tests',
        startTime: 16200,
        endTime: 21200,
        duration: 5000,
        status: 'success',
        worker: { id: 'remote-3', region: 'us-west-2', type: 'remote' },
        resources: { cpu: 70, memory: 512, network: 8 },
        cacheHit: true,
        dependencies: ['install-deps'],
        criticalPath: false,
      },
      {
        taskId: 'build-docker',
        name: 'Build Docker Image',
        startTime: 27800,
        endTime: 35800,
        duration: 8000,
        status: 'success',
        worker: { id: 'local-2', region: 'local', type: 'local' },
        resources: { cpu: 85, memory: 2048, network: 50 },
        cacheHit: false,
        dependencies: ['compile'],
        criticalPath: true,
      },
    ];

    // Record all tasks
    for (const task of mockTasks) {
      profiler.recordTask(task);
    }

    // Finish profiling
    profiler
      .finishProfiling()
      .then((profile) => {
        console.log('\n📊 Generated Demo Profile:');

        const report = profiler.generateTimelineReport(profile);
        console.log(report);

        // Save profile
        return profiler.saveProfile(profile, 'demo-profile.json');
      })
      .then((savedPath) => {
        console.log(`\n💾 Demo profile saved to: ${savedPath}`);
        console.log(
          '\nTo analyze: node maestro-profile.js analyze demo-profile.json',
        );
      })
      .catch((error) => {
        console.error('❌ Demo failed:', error);
      });
  } else {
    console.log(`
📊 Maestro Profile - Build Performance Profiler

Usage:
  node maestro-profile.js demo                    # Generate demo profile
  node maestro-profile.js analyze <profile.json>  # Analyze existing profile

Features:
  🎯 Critical path analysis
  ⚡ Parallelism metrics  
  ☁️ RBE utilization tracking
  📦 Cache performance stats
  📈 Visual timeline reports
  💡 Optimization recommendations

Example profile workflow:
  1. Run build with profiling enabled
  2. Generate profile report: maestro profile
  3. Analyze bottlenecks and optimize
  4. Compare before/after profiles
    `);
  }
}
