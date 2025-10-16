#!/usr/bin/env node

/**
 * Maestro Explain - Composer vNext Sprint
 * Critical path analysis and cache statistics visualization
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface BuildTask {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  dependencies: string[];
  cacheHit: boolean;
  status: 'success' | 'failed' | 'skipped';
}

interface CriticalPathNode {
  taskId: string;
  name: string;
  duration: number;
  cumulativeDuration: number;
  cacheHit: boolean;
}

interface CacheStats {
  totalTasks: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  timeSaved: number;
}

export class MaestroExplain {
  private buildTasks: BuildTask[] = [];
  private criticalPath: CriticalPathNode[] = [];
  private cacheStats: CacheStats;

  constructor() {
    this.cacheStats = {
      totalTasks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      timeSaved: 0,
    };
  }

  /**
   * Analyze build from logs or live execution
   */
  async analyzeBuild(buildLogPath?: string): Promise<void> {
    console.log('🔍 Analyzing build execution...\n');

    if (buildLogPath) {
      await this.parseBuildLog(buildLogPath);
    } else {
      await this.generateSampleBuildData();
    }

    this.calculateCriticalPath();
    this.calculateCacheStats();

    this.renderAnalysis();
  }

  /**
   * Generate build graph in various formats
   */
  async generateBuildGraph(
    format: 'text' | 'html' | 'dot' | 'json' = 'text',
  ): Promise<void> {
    switch (format) {
      case 'text':
        this.renderTextGraph();
        break;
      case 'html':
        await this.generateHtmlGraph();
        break;
      case 'dot':
        await this.generateDotGraph();
        break;
      case 'json':
        await this.exportJsonData();
        break;
    }
  }

  private async parseBuildLog(logPath: string): Promise<void> {
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n');

      // Parse log lines to extract build tasks
      // This is a simplified parser - in production it would be more sophisticated
      for (const line of lines) {
        const taskMatch = line.match(
          /(\w+): (\w+) \((\d+)ms\) (cache-hit|cache-miss)?/,
        );
        if (taskMatch) {
          const [, status, taskName, duration, cacheStatus] = taskMatch;

          this.buildTasks.push({
            id: `task-${this.buildTasks.length}`,
            name: taskName,
            duration: parseInt(duration),
            startTime: 0, // Would be parsed from timestamps
            endTime: parseInt(duration),
            dependencies: [], // Would be inferred
            cacheHit: cacheStatus === 'cache-hit',
            status: status as 'success' | 'failed' | 'skipped',
          });
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not parse build log, generating sample data');
      await this.generateSampleBuildData();
    }
  }

  private async generateSampleBuildData(): Promise<void> {
    // Generate realistic sample build tasks for demonstration
    const tasks = [
      { name: 'install-deps', duration: 15000, deps: [], cache: false },
      {
        name: 'lint-check',
        duration: 2000,
        deps: ['install-deps'],
        cache: true,
      },
      {
        name: 'type-check',
        duration: 3500,
        deps: ['install-deps'],
        cache: false,
      },
      {
        name: 'compile-ts',
        duration: 8000,
        deps: ['type-check'],
        cache: false,
      },
      {
        name: 'bundle-client',
        duration: 12000,
        deps: ['compile-ts'],
        cache: true,
      },
      {
        name: 'bundle-server',
        duration: 6000,
        deps: ['compile-ts'],
        cache: false,
      },
      {
        name: 'run-tests',
        duration: 15000,
        deps: ['compile-ts'],
        cache: false,
      },
      {
        name: 'build-docker',
        duration: 25000,
        deps: ['bundle-server'],
        cache: true,
      },
      {
        name: 'security-scan',
        duration: 8000,
        deps: ['build-docker'],
        cache: true,
      },
    ];

    let currentTime = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      this.buildTasks.push({
        id: `task-${i}`,
        name: task.name,
        duration: task.duration,
        startTime: currentTime,
        endTime: currentTime + task.duration,
        dependencies: task.deps,
        cacheHit: task.cache,
        status: 'success',
      });

      currentTime += task.duration;
    }
  }

  private calculateCriticalPath(): void {
    // Topological sort to find critical path
    const taskMap = new Map<string, BuildTask>();
    const inDegree = new Map<string, number>();

    // Build task map and calculate in-degrees
    for (const task of this.buildTasks) {
      taskMap.set(task.name, task);
      inDegree.set(task.name, task.dependencies.length);
    }

    // Find longest path (critical path)
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    // Initialize distances
    for (const task of this.buildTasks) {
      distances.set(task.name, 0);
    }

    // Process in topological order
    const queue: string[] = [];
    const tempInDegree = new Map(inDegree);

    // Find nodes with no dependencies
    for (const [taskName, degree] of tempInDegree) {
      if (degree === 0) {
        queue.push(taskName);
      }
    }

    while (queue.length > 0) {
      const currentTask = queue.shift()!;
      const task = taskMap.get(currentTask)!;

      // Update distances for dependent tasks
      for (const otherTask of this.buildTasks) {
        if (otherTask.dependencies.includes(currentTask)) {
          const newDistance = distances.get(currentTask)! + task.duration;
          if (newDistance > distances.get(otherTask.name)!) {
            distances.set(otherTask.name, newDistance);
            predecessors.set(otherTask.name, currentTask);
          }

          // Reduce in-degree
          const degree = tempInDegree.get(otherTask.name)! - 1;
          tempInDegree.set(otherTask.name, degree);

          if (degree === 0) {
            queue.push(otherTask.name);
          }
        }
      }
    }

    // Find the task with maximum distance (end of critical path)
    let maxDistance = 0;
    let endTask = '';

    for (const [taskName, distance] of distances) {
      if (distance > maxDistance) {
        maxDistance = distance;
        endTask = taskName;
      }
    }

    // Reconstruct critical path
    const path: string[] = [];
    let current = endTask;

    while (current) {
      path.unshift(current);
      current = predecessors.get(current) || '';
    }

    // Build critical path with cumulative durations
    let cumulativeDuration = 0;
    this.criticalPath = path.map((taskName) => {
      const task = taskMap.get(taskName)!;
      const node: CriticalPathNode = {
        taskId: task.id,
        name: taskName,
        duration: task.duration,
        cumulativeDuration: cumulativeDuration + task.duration,
        cacheHit: task.cacheHit,
      };
      cumulativeDuration += task.duration;
      return node;
    });
  }

  private calculateCacheStats(): void {
    const cacheHits = this.buildTasks.filter((t) => t.cacheHit);
    const cacheMisses = this.buildTasks.filter((t) => !t.cacheHit);

    // Estimate time saved from cache hits (assuming 80% time saving)
    const timeSaved = cacheHits.reduce(
      (total, task) => total + task.duration * 0.8,
      0,
    );

    this.cacheStats = {
      totalTasks: this.buildTasks.length,
      cacheHits: cacheHits.length,
      cacheMisses: cacheMisses.length,
      hitRate: (cacheHits.length / this.buildTasks.length) * 100,
      timeSaved,
    };
  }

  private renderAnalysis(): void {
    console.log('📊 BUILD PERFORMANCE ANALYSIS');
    console.log('='.repeat(60));

    this.renderExecutionSummary();
    this.renderCriticalPath();
    this.renderCacheAnalysis();
    this.renderRecommendations();
  }

  private renderExecutionSummary(): void {
    const totalDuration = Math.max(...this.buildTasks.map((t) => t.endTime));
    const parallelDuration =
      this.criticalPath[this.criticalPath.length - 1]?.cumulativeDuration || 0;
    const parallelEfficiency = (
      ((totalDuration - parallelDuration) / totalDuration) *
      100
    ).toFixed(1);

    console.log('\n🏃‍♂️ EXECUTION SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total tasks: ${this.buildTasks.length}`);
    console.log(`Total execution time: ${this.formatDuration(totalDuration)}`);
    console.log(`Critical path time: ${this.formatDuration(parallelDuration)}`);
    console.log(`Parallel efficiency: ${parallelEfficiency}%`);
  }

  private renderCriticalPath(): void {
    console.log('\n🎯 CRITICAL PATH (Longest dependency chain)');
    console.log('-'.repeat(50));

    this.criticalPath.forEach((node, index) => {
      const isLast = index === this.criticalPath.length - 1;
      const connector = isLast ? '└─' : '├─';
      const cacheIcon = node.cacheHit ? '📦' : '🔨';
      const duration = this.formatDuration(node.duration);
      const cumulative = this.formatDuration(node.cumulativeDuration);

      console.log(`${connector} ${cacheIcon} ${node.name}`);
      console.log(`   Duration: ${duration} | Cumulative: ${cumulative}`);

      if (!isLast) {
        console.log('   │');
      }
    });

    const totalCritical =
      this.criticalPath[this.criticalPath.length - 1]?.cumulativeDuration || 0;
    console.log(
      `\n💡 Critical path total: ${this.formatDuration(totalCritical)}`,
    );
  }

  private renderCacheAnalysis(): void {
    console.log('\n📦 CACHE PERFORMANCE');
    console.log('-'.repeat(30));
    console.log(`Cache hit rate: ${this.cacheStats.hitRate.toFixed(1)}%`);
    console.log(
      `Cache hits: ${this.cacheStats.cacheHits}/${this.cacheStats.totalTasks}`,
    );
    console.log(
      `Time saved: ${this.formatDuration(this.cacheStats.timeSaved)}`,
    );

    // Cache hit breakdown
    const hitTasks = this.buildTasks.filter((t) => t.cacheHit);
    const missedTasks = this.buildTasks.filter((t) => !t.cacheHit);

    if (hitTasks.length > 0) {
      console.log('\n✅ Cache hits:');
      hitTasks.forEach((task) => {
        console.log(
          `   📦 ${task.name} (${this.formatDuration(task.duration)})`,
        );
      });
    }

    if (missedTasks.length > 0) {
      console.log('\n❌ Cache misses:');
      missedTasks.forEach((task) => {
        console.log(
          `   🔨 ${task.name} (${this.formatDuration(task.duration)})`,
        );
      });
    }
  }

  private renderRecommendations(): void {
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS');
    console.log('-'.repeat(40));

    const recommendations: string[] = [];

    // Cache optimization
    if (this.cacheStats.hitRate < 50) {
      recommendations.push(
        '🔧 Improve cache hit rate by enabling remote cache',
      );
    }

    // Critical path optimization
    const longestTasks = [...this.buildTasks]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .filter((t) => !t.cacheHit);

    if (longestTasks.length > 0) {
      recommendations.push(
        `🚀 Focus on optimizing: ${longestTasks.map((t) => t.name).join(', ')}`,
      );
    }

    // Parallel execution
    const serialTasks = this.buildTasks.filter(
      (t) => t.dependencies.length === 0,
    ).length;
    if (serialTasks < this.buildTasks.length * 0.3) {
      recommendations.push('⚡ Add more parallel execution opportunities');
    }

    if (recommendations.length === 0) {
      console.log('✨ Build performance looks optimal!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  private renderTextGraph(): void {
    console.log('\n🕸️  BUILD DEPENDENCY GRAPH');
    console.log('-'.repeat(40));

    // Simple text representation of build graph
    const levels = this.organizeBuildLevels();

    levels.forEach((level, index) => {
      console.log(`\nLevel ${index + 1}:`);
      level.forEach((task) => {
        const cacheIcon = task.cacheHit ? '📦' : '🔨';
        const duration = this.formatDuration(task.duration);
        console.log(`  ${cacheIcon} ${task.name} (${duration})`);
      });
    });
  }

  private async generateHtmlGraph(): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Maestro Build Graph</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .stats { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .mermaid { text-align: center; }
    </style>
</head>
<body>
    <h1>🏗️ Maestro Build Analysis</h1>
    
    <div class="stats">
        <h2>📊 Build Statistics</h2>
        <p><strong>Total Duration:</strong> ${this.formatDuration(Math.max(...this.buildTasks.map((t) => t.endTime)))}</p>
        <p><strong>Cache Hit Rate:</strong> ${this.cacheStats.hitRate.toFixed(1)}%</p>
        <p><strong>Time Saved:</strong> ${this.formatDuration(this.cacheStats.timeSaved)}</p>
    </div>
    
    <h2>🎯 Build Dependency Graph</h2>
    <div class="mermaid">
        graph TD
        ${this.generateMermaidGraph()}
    </div>
    
    <script>
        mermaid.initialize({startOnLoad:true});
    </script>
</body>
</html>`;

    await fs.writeFile('build-graph.html', html);
    console.log('📄 HTML graph saved to build-graph.html');
  }

  private async generateDotGraph(): Promise<void> {
    let dot = 'digraph BuildGraph {\n';
    dot += '  rankdir=TD;\n';
    dot += '  node [shape=rectangle, style=rounded];\n\n';

    // Add nodes
    for (const task of this.buildTasks) {
      const color = task.cacheHit ? 'lightgreen' : 'lightblue';
      const label = `${task.name}\\n${this.formatDuration(task.duration)}`;
      dot += `  "${task.name}" [label="${label}", fillcolor=${color}, style=filled];\n`;
    }

    dot += '\n';

    // Add edges
    for (const task of this.buildTasks) {
      for (const dep of task.dependencies) {
        dot += `  "${dep}" -> "${task.name}";\n`;
      }
    }

    dot += '}\n';

    await fs.writeFile('build-graph.dot', dot);
    console.log('📄 DOT graph saved to build-graph.dot');
    console.log(
      '   Generate image with: dot -Tpng build-graph.dot -o build-graph.png',
    );
  }

  private async exportJsonData(): Promise<void> {
    const exportData = {
      summary: {
        totalTasks: this.buildTasks.length,
        totalDuration: Math.max(...this.buildTasks.map((t) => t.endTime)),
        criticalPathDuration:
          this.criticalPath[this.criticalPath.length - 1]?.cumulativeDuration ||
          0,
      },
      cacheStats: this.cacheStats,
      criticalPath: this.criticalPath,
      tasks: this.buildTasks,
    };

    await fs.writeFile(
      'build-analysis.json',
      JSON.stringify(exportData, null, 2),
    );
    console.log('📄 Analysis data saved to build-analysis.json');
  }

  private generateMermaidGraph(): string {
    let mermaid = '';

    for (const task of this.buildTasks) {
      const cacheClass = task.cacheHit ? 'cached' : 'uncached';
      mermaid += `    ${task.name}["${task.name}<br/>${this.formatDuration(task.duration)}"]:::${cacheClass}\n`;

      for (const dep of task.dependencies) {
        mermaid += `    ${dep} --> ${task.name}\n`;
      }
    }

    mermaid += `
    classDef cached fill:#90EE90
    classDef uncached fill:#87CEEB`;

    return mermaid;
  }

  private organizeBuildLevels(): BuildTask[][] {
    const levels: BuildTask[][] = [];
    const taskMap = new Map<string, BuildTask>();

    for (const task of this.buildTasks) {
      taskMap.set(task.name, task);
    }

    const visited = new Set<string>();

    const getLevelForTask = (taskName: string): number => {
      if (visited.has(taskName)) return 0;

      const task = taskMap.get(taskName);
      if (!task || task.dependencies.length === 0) return 0;

      visited.add(taskName);
      const maxDepLevel = Math.max(
        ...task.dependencies.map((dep) => getLevelForTask(dep)),
      );
      return maxDepLevel + 1;
    };

    // Organize tasks by levels
    for (const task of this.buildTasks) {
      const level = getLevelForTask(task.name);

      if (!levels[level]) {
        levels[level] = [];
      }

      levels[level].push(task);
    }

    return levels.filter((level) => level.length > 0);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.round((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const format = process.argv[3] as 'text' | 'html' | 'dot' | 'json';

  const explainer = new MaestroExplain();

  if (command === 'analyze') {
    const logPath = process.argv[3];
    explainer.analyzeBuild(logPath).catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
  } else if (command === 'graph') {
    explainer
      .analyzeBuild()
      .then(() => {
        return explainer.generateBuildGraph(format || 'text');
      })
      .catch((error) => {
        console.error('❌ Graph generation failed:', error);
        process.exit(1);
      });
  } else {
    console.log(`
🔍 Maestro Explain - Build Analysis Tool

Usage:
  node maestro-explain.js analyze [build.log]     # Analyze build performance
  node maestro-explain.js graph [format]          # Generate build graph
  
Graph formats: text, html, dot, json

Examples:
  node maestro-explain.js analyze                 # Analyze with sample data
  node maestro-explain.js analyze build.log       # Analyze from log file
  node maestro-explain.js graph html              # Generate HTML graph
  node maestro-explain.js graph dot               # Generate DOT graph
    `);
  }
}

export { MaestroExplain };
