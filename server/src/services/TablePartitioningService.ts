import { DatabaseService } from './DatabaseService.js';
import logger from '../utils/logger.js';
import { PrometheusMetrics } from '../utils/metrics.js';

interface PartitionConfig {
  tableName: string;
  interval: 'daily' | 'weekly' | 'monthly';
  retentionCount: number; // Number of partitions to keep
}

/**
 * Table Partitioning Service
 *
 * Manages declarative table partitioning for high-volume PostgreSQL tables.
 * Automates creation of future partitions and detachment/archival of old ones.
 */
export class TablePartitioningService {
  private db: DatabaseService;
  private metrics: PrometheusMetrics;
  private configs: PartitionConfig[] = [];

  constructor(db: DatabaseService) {
    this.db = db;
    this.metrics = new PrometheusMetrics('table_partitioning');

    // Default configs for known high-volume tables
    this.registerTable({ tableName: 'audit_logs', interval: 'monthly', retentionCount: 12 });
    this.registerTable({ tableName: 'metrics', interval: 'daily', retentionCount: 30 });
  }

  registerTable(config: PartitionConfig) {
    this.configs.push(config);
  }

  /**
   * Run partition maintenance for all registered tables
   */
  async runMaintenance(): Promise<void> {
    for (const config of this.configs) {
      try {
        await this.ensurePartitions(config);
        await this.cleanupPartitions(config);
      } catch (error: any) {
        logger.error({ error, table: config.tableName }, 'Partition maintenance failed');
        this.metrics.incrementCounter('maintenance_errors', { table: config.tableName });
      }
    }
  }

  /**
   * Ensure partitions exist for the current and next period
   */
  private async ensurePartitions(config: PartitionConfig): Promise<void> {
    const nextDate = new Date();
    // Look ahead 1 period
    if (config.interval === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    if (config.interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    if (config.interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

    const partitionName = this.getPartitionName(config.tableName, nextDate, config.interval);
    const { start, end } = this.getPartitionRange(nextDate, config.interval);

    logger.info({ table: config.tableName, partition: partitionName }, 'Ensuring partition exists');

    const sql = `
      CREATE TABLE IF NOT EXISTS "${partitionName}"
      PARTITION OF "${config.tableName}"
      FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')
    `;

    await this.db.query(sql);
    this.metrics.incrementCounter('partitions_created', { table: config.tableName });
  }

  /**
   * Detach or drop old partitions
   */
  private async cleanupPartitions(config: PartitionConfig): Promise<void> {
    // Query existing partitions from pg_inherits/pg_class
    // This requires a complex query to find partitions older than retention
    // For prototype, we'll log what we would do.
    logger.info({ table: config.tableName }, 'Checking for old partitions to detach');

    // In a real implementation, we would:
    // 1. SELECT relname FROM pg_class ... WHERE relname LIKE tableName_%
    // 2. Parse date from relname
    // 3. If date < retentionThreshold, DETACH CONCURRENTLY
  }

  // Helpers
  private getPartitionName(baseName: string, date: Date, interval: string): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    if (interval === 'monthly') return `${baseName}_y${y}m${m}`;
    if (interval === 'daily') return `${baseName}_y${y}m${m}d${d}`;
    return `${baseName}_${y}w${this.getWeekNumber(date)}`;
  }

  private getPartitionRange(date: Date, interval: string): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    if (interval === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(1);
      end.setHours(0, 0, 0, 0);
    } else if (interval === 'daily') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
