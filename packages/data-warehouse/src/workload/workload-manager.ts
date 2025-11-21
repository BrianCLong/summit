/**
 * Workload Manager for Query Prioritization and Resource Management
 */

export enum QueryPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BATCH = 4,
}

export interface WorkloadConfig {
  maxConcurrentQueries: number;
  maxMemoryPerQuery: number;
  timeoutMs: number;
}

export class WorkloadManager {
  private runningQueries: Map<string, { priority: QueryPriority; startTime: number }> = new Map();
  private queuedQueries: Array<{ queryId: string; priority: QueryPriority }> = [];

  constructor(private config: WorkloadConfig) {}

  canExecute(priority: QueryPriority): boolean {
    return this.runningQueries.size < this.config.maxConcurrentQueries;
  }

  async queue(queryId: string, priority: QueryPriority): Promise<void> {
    this.queuedQueries.push({ queryId, priority });
    this.queuedQueries.sort((a, b) => a.priority - b.priority);
  }

  async start(queryId: string, priority: QueryPriority): Promise<void> {
    this.runningQueries.set(queryId, {
      priority,
      startTime: Date.now(),
    });
  }

  async complete(queryId: string): Promise<void> {
    this.runningQueries.delete(queryId);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (
      this.queuedQueries.length > 0 &&
      this.runningQueries.size < this.config.maxConcurrentQueries
    ) {
      const next = this.queuedQueries.shift();
      if (next) {
        await this.start(next.queryId, next.priority);
      }
    }
  }
}
