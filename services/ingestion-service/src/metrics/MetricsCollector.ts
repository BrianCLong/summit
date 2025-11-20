/**
 * Metrics collector - collects and aggregates ingestion metrics
 */

import { Logger } from 'winston';

export interface IngestionMetrics {
  ingestionId: string;
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  recordsFailed: number;
  bytesProcessed: number;
  avgLatencyMs: number;
  throughputRecordsPerSecond: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface SystemMetrics {
  totalIngestions: number;
  activeIngestions: number;
  totalRecordsProcessed: number;
  totalErrors: number;
  avgThroughput: number;
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  timestamp: Date;
}

export class MetricsCollector {
  private logger: Logger;
  private ingestionMetrics: Map<string, IngestionMetrics> = new Map();
  private systemMetrics: SystemMetrics;

  constructor(logger: Logger) {
    this.logger = logger;
    this.systemMetrics = this.initializeSystemMetrics();

    // Start metrics collection interval
    setInterval(() => this.collectSystemMetrics(), 60000); // Every minute
  }

  /**
   * Record ingestion metrics
   */
  recordIngestionMetrics(ingestionId: string, metrics: Partial<IngestionMetrics>): void {
    const existing = this.ingestionMetrics.get(ingestionId) || {
      ingestionId,
      recordsExtracted: 0,
      recordsTransformed: 0,
      recordsLoaded: 0,
      recordsFailed: 0,
      bytesProcessed: 0,
      avgLatencyMs: 0,
      throughputRecordsPerSecond: 0,
      errorRate: 0,
      lastUpdated: new Date()
    };

    const updated = {
      ...existing,
      ...metrics,
      lastUpdated: new Date()
    };

    // Calculate derived metrics
    if (updated.recordsLoaded > 0) {
      updated.throughputRecordsPerSecond = updated.recordsLoaded / (Date.now() - existing.lastUpdated.getTime()) * 1000;
      updated.errorRate = updated.recordsFailed / (updated.recordsLoaded + updated.recordsFailed);
    }

    this.ingestionMetrics.set(ingestionId, updated);

    // Update system metrics
    this.updateSystemMetrics();
  }

  /**
   * Get metrics for specific ingestion
   */
  async getIngestionMetrics(ingestionId: string): Promise<IngestionMetrics | undefined> {
    return this.ingestionMetrics.get(ingestionId);
  }

  /**
   * Get all metrics
   */
  async getMetrics(): Promise<{
    system: SystemMetrics;
    ingestions: IngestionMetrics[];
  }> {
    return {
      system: this.systemMetrics,
      ingestions: Array.from(this.ingestionMetrics.values())
    };
  }

  /**
   * Get aggregated metrics by time window
   */
  async getAggregatedMetrics(timeWindowMinutes: number = 60): Promise<any> {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const recentMetrics = Array.from(this.ingestionMetrics.values())
      .filter(m => m.lastUpdated >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        timeWindowMinutes,
        totalRecords: 0,
        avgThroughput: 0,
        avgLatency: 0,
        errorRate: 0
      };
    }

    const totalRecords = recentMetrics.reduce((sum, m) => sum + m.recordsLoaded, 0);
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.recordsFailed, 0);
    const avgThroughput = recentMetrics.reduce((sum, m) => sum + m.throughputRecordsPerSecond, 0) / recentMetrics.length;
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.avgLatencyMs, 0) / recentMetrics.length;

    return {
      timeWindowMinutes,
      totalRecords,
      totalErrors,
      avgThroughput,
      avgLatency,
      errorRate: totalErrors / (totalRecords + totalErrors) || 0,
      ingestionCount: recentMetrics.length
    };
  }

  /**
   * Clear metrics for specific ingestion
   */
  clearIngestionMetrics(ingestionId: string): void {
    this.ingestionMetrics.delete(ingestionId);
    this.logger.debug(`Cleared metrics for ingestion ${ingestionId}`);
  }

  /**
   * Initialize system metrics
   */
  private initializeSystemMetrics(): SystemMetrics {
    return {
      totalIngestions: 0,
      activeIngestions: 0,
      totalRecordsProcessed: 0,
      totalErrors: 0,
      avgThroughput: 0,
      uptime: 0,
      timestamp: new Date()
    };
  }

  /**
   * Collect system-wide metrics
   */
  private collectSystemMetrics(): void {
    const allMetrics = Array.from(this.ingestionMetrics.values());

    this.systemMetrics = {
      totalIngestions: allMetrics.length,
      activeIngestions: allMetrics.filter(m => {
        const timeSinceUpdate = Date.now() - m.lastUpdated.getTime();
        return timeSinceUpdate < 300000; // Active if updated in last 5 minutes
      }).length,
      totalRecordsProcessed: allMetrics.reduce((sum, m) => sum + m.recordsLoaded, 0),
      totalErrors: allMetrics.reduce((sum, m) => sum + m.recordsFailed, 0),
      avgThroughput: allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.throughputRecordsPerSecond, 0) / allMetrics.length
        : 0,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
      timestamp: new Date()
    };
  }

  /**
   * Update system metrics based on ingestion metrics
   */
  private updateSystemMetrics(): void {
    this.collectSystemMetrics();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const metrics: string[] = [];

    // System metrics
    metrics.push(`# HELP intelgraph_total_ingestions Total number of ingestions`);
    metrics.push(`# TYPE intelgraph_total_ingestions gauge`);
    metrics.push(`intelgraph_total_ingestions ${this.systemMetrics.totalIngestions}`);

    metrics.push(`# HELP intelgraph_active_ingestions Number of active ingestions`);
    metrics.push(`# TYPE intelgraph_active_ingestions gauge`);
    metrics.push(`intelgraph_active_ingestions ${this.systemMetrics.activeIngestions}`);

    metrics.push(`# HELP intelgraph_total_records_processed Total records processed`);
    metrics.push(`# TYPE intelgraph_total_records_processed counter`);
    metrics.push(`intelgraph_total_records_processed ${this.systemMetrics.totalRecordsProcessed}`);

    metrics.push(`# HELP intelgraph_total_errors Total errors`);
    metrics.push(`# TYPE intelgraph_total_errors counter`);
    metrics.push(`intelgraph_total_errors ${this.systemMetrics.totalErrors}`);

    // Per-ingestion metrics
    for (const [ingestionId, ingMetrics] of this.ingestionMetrics) {
      metrics.push(`# HELP intelgraph_ingestion_records_loaded Records loaded per ingestion`);
      metrics.push(`# TYPE intelgraph_ingestion_records_loaded counter`);
      metrics.push(`intelgraph_ingestion_records_loaded{ingestion_id="${ingestionId}"} ${ingMetrics.recordsLoaded}`);

      metrics.push(`# HELP intelgraph_ingestion_throughput Throughput per ingestion`);
      metrics.push(`# TYPE intelgraph_ingestion_throughput gauge`);
      metrics.push(`intelgraph_ingestion_throughput{ingestion_id="${ingestionId}"} ${ingMetrics.throughputRecordsPerSecond}`);
    }

    return metrics.join('\n');
  }
}
