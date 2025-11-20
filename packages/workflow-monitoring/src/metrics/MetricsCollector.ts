/**
 * Metrics Collector for workflow orchestration
 */

import EventEmitter from 'eventemitter3';
import { TaskState, WorkflowExecution, TaskExecution } from '@summit/dag-engine';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface MetricsCollectorEvents {
  'metric:recorded': (metric: Metric) => void;
}

export class MetricsCollector extends EventEmitter<MetricsCollectorEvents> {
  private metrics: Map<string, Metric[]>;
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private histograms: Map<string, number[]>;

  constructor() {
    super();
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.recordMetric(name, current + value, tags);
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);

    this.recordMetric(name, value, tags);
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);

    this.recordMetric(name, value, tags);
  }

  /**
   * Record workflow execution metrics
   */
  recordWorkflowMetrics(execution: WorkflowExecution): void {
    const tags = {
      dag_id: execution.dagId,
      state: execution.state,
    };

    // Counter for workflow runs
    this.recordCounter('workflow.runs', 1, tags);

    // Duration
    if (execution.endTime) {
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.recordHistogram('workflow.duration', duration, { dag_id: execution.dagId });
    }

    // State-specific counters
    if (execution.state === 'success') {
      this.recordCounter('workflow.success', 1, { dag_id: execution.dagId });
    } else if (execution.state === 'failed') {
      this.recordCounter('workflow.failed', 1, { dag_id: execution.dagId });
    }
  }

  /**
   * Record task execution metrics
   */
  recordTaskMetrics(execution: TaskExecution): void {
    const tags = {
      dag_id: execution.dagId,
      task_id: execution.taskId,
      state: execution.state,
    };

    // Counter for task runs
    this.recordCounter('task.runs', 1, tags);

    // Duration
    if (execution.duration) {
      this.recordHistogram('task.duration', execution.duration, {
        dag_id: execution.dagId,
        task_id: execution.taskId,
      });
    }

    // Attempts
    this.recordHistogram('task.attempts', execution.attempt, {
      dag_id: execution.dagId,
      task_id: execution.taskId,
    });

    // State-specific counters
    if (execution.state === 'success') {
      this.recordCounter('task.success', 1, {
        dag_id: execution.dagId,
        task_id: execution.taskId,
      });
    } else if (execution.state === 'failed') {
      this.recordCounter('task.failed', 1, {
        dag_id: execution.dagId,
        task_id: execution.taskId,
      });
    } else if (execution.state === 'retrying') {
      this.recordCounter('task.retries', 1, {
        dag_id: execution.dagId,
        task_id: execution.taskId,
      });
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string, tags: Record<string, string> = {}): MetricStats | null {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags: Record<string, string> = {}): number {
    const key = this.getMetricKey(name, tags);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, tags: Record<string, string> = {}): number | undefined {
    const key = this.getMetricKey(name, tags);
    return this.gauges.get(key);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    const allMetrics: Metric[] = [];
    this.metrics.forEach(metrics => {
      allMetrics.push(...metrics);
    });
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): Metric[] {
    const metrics: Metric[] = [];
    this.metrics.forEach((metricList, key) => {
      if (key.startsWith(name)) {
        metrics.push(...metricList);
      }
    });
    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear metrics older than specified date
   */
  clearOldMetrics(beforeDate: Date): void {
    this.metrics.forEach((metricList, key) => {
      const filtered = metricList.filter(m => m.timestamp >= beforeDate);
      if (filtered.length > 0) {
        this.metrics.set(key, filtered);
      } else {
        this.metrics.delete(key);
      }
    });
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Private methods
   */

  private recordMetric(name: string, value: number, tags: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    const key = this.getMetricKey(name, tags);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(metric);

    this.emit('metric:recorded', metric);
  }

  private getMetricKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return tagString ? `${name}[${tagString}]` : name;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }
}
