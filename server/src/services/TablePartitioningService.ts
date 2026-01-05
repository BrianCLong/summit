/**
 * Table Partitioning Service
 *
 * Manages PostgreSQL native partitioning for high-volume tables.
 * Focuses on time-series data (Audit Logs, Telemetry, Events).
 *
 * SOC 2 Controls: CC6.1 (Data Retention)
 */

import { getPostgresPool } from '../db/postgres.js';
import logger from '../config/logger.js';
import { PrometheusMetrics } from '../utils/metrics.js';

export interface PartitionConfig {
  tableName: string;
  partitionBy: 'RANGE' | 'LIST' | 'HASH';
  column: string;
  interval?: string; // e.g. '1 month', '1 day' for RANGE
  retention?: string; // e.g. '1 year'
}

const MANAGED_TABLES: PartitionConfig[] = [
  {
    tableName: 'audit_events_partitioned',
    partitionBy: 'RANGE',
    column: 'timestamp', // Updated to match AdvancedAuditSystem schema
    interval: '1 month',
    retention: '1 year'
  },
  {
    tableName: 'telemetry_events_partitioned',
    partitionBy: 'RANGE',
    column: 'timestamp',
    interval: '1 day',
    retention: '30 days'
  }
];

export class TablePartitioningService {
  private metrics: PrometheusMetrics;

  constructor() {
    this.metrics = new PrometheusMetrics('table_partitioning');
    this.metrics.createCounter('partitions_created_total', 'Total partitions created', ['table']);
    this.metrics.createCounter('partitions_dropped_total', 'Total partitions dropped (retention)', ['table']);
    this.metrics.createCounter('maintenance_errors_total', 'Total maintenance errors', ['table']);
  }

  /**
   * Run maintenance tasks: create future partitions, drop old ones
   */
  async runMaintenance(): Promise<void> {
    logger.info('Starting table partition maintenance...');
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      for (const config of MANAGED_TABLES) {
        await this.maintainTable(client, config);
      }
      logger.info('Table partition maintenance completed.');
    } catch (error) {
      logger.error({ error }, 'Partition maintenance failed');
      throw error;
    } finally {
      client.release();
    }
  }

  private async maintainTable(client: any, config: PartitionConfig): Promise<void> {
    try {
      const isPartitioned = await this.checkIfPartitioned(client, config.tableName);
      if (!isPartitioned) {
         logger.warn(`Table ${config.tableName} is not partitioned. Skipping maintenance.`);
         return;
      }

      if (config.partitionBy === 'RANGE' && config.interval) {
        await this.createRangePartitions(client, config);
      }

      if (config.retention) {
        await this.enforceRetention(client, config);
      }

    } catch (error) {
      this.metrics.incrementCounter('maintenance_errors_total', { table: config.tableName });
      logger.error({ error, table: config.tableName }, 'Failed to maintain table partitions');
    }
  }

  private async checkIfPartitioned(client: any, tableName: string): Promise<boolean> {
    const result = await client.query(`
      SELECT relkind FROM pg_class WHERE relname = $1
    `, [tableName]);
    return result.rows.length > 0 && result.rows[0].relkind === 'p';
  }

  private async createRangePartitions(client: any, config: PartitionConfig): Promise<void> {
    // Start from current date
    let targetDate = new Date();

    // Normalize to start of interval
    if (config.interval?.includes('month')) {
        targetDate.setDate(1);
        targetDate.setHours(0,0,0,0);
    } else if (config.interval?.includes('day')) {
        targetDate.setHours(0,0,0,0);
    }

    // Look ahead 3 intervals
    for (let i = 0; i < 3; i++) {
        const { start, end } = this.getRangeBounds(targetDate, config.interval!);
        const partitionName = this.getPartitionName(config.tableName, start, config.interval!);

        const exists = await this.partitionExists(client, partitionName);
        if (!exists) {
            logger.info(`Creating partition ${partitionName} (${start.toISOString()} to ${end.toISOString()})`);
            await client.query(`
                CREATE TABLE IF NOT EXISTS "${partitionName}"
                PARTITION OF "${config.tableName}"
                FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')
            `);
            this.metrics.incrementCounter('partitions_created_total', { table: config.tableName });
        }

        // Advance
        this.advanceDate(targetDate, config.interval!);
    }
  }

  private async enforceRetention(client: any, config: PartitionConfig): Promise<void> {
      // Retention Logic
      const cutoff = new Date();
      if (config.retention?.includes('year')) {
          cutoff.setFullYear(cutoff.getFullYear() - 1);
      } else if (config.retention?.includes('days')) {
          const days = parseInt(config.retention.split(' ')[0]);
          cutoff.setDate(cutoff.getDate() - days);
      }

      const partitions = await client.query(`
          SELECT
              child.relname as partition_name,
              pg_get_expr(child.relpartbound, child.oid) as partition_bound
          FROM pg_inherits
          JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
          JOIN pg_class child ON pg_inherits.inhrelid = child.oid
          WHERE parent.relname = $1
      `, [config.tableName]);

      for (const row of partitions.rows) {
          const bound = row.partition_bound;
          const match = bound.match(/TO \('([^']+)'\)/);
          if (match) {
              const endDateStr = match[1];
              const endDate = new Date(endDateStr);

              if (endDate < cutoff) {
                  logger.info(`Dropping partition ${row.partition_name} (End: ${endDate.toISOString()} < Cutoff: ${cutoff.toISOString()})`);
                  await client.query(`DROP TABLE "${row.partition_name}"`);
                  this.metrics.incrementCounter('partitions_dropped_total', { table: config.tableName });
              }
          }
      }
  }

  private async partitionExists(client: any, partitionName: string): Promise<boolean> {
      const res = await client.query(`SELECT 1 FROM pg_class WHERE relname = $1`, [partitionName]);
      return res.rowCount > 0;
  }

  private getPartitionName(tableName: string, date: Date, interval: string): string {
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (interval.includes('month')) {
          return `${tableName}_y${date.getFullYear()}m${pad(date.getMonth() + 1)}`;
      }
      if (interval.includes('day')) {
          return `${tableName}_y${date.getFullYear()}m${pad(date.getMonth() + 1)}d${pad(date.getDate())}`;
      }
      return `${tableName}_${date.getTime()}`;
  }

  private getRangeBounds(date: Date, interval: string): { start: Date, end: Date } {
      const start = new Date(date);
      const end = new Date(date);

      if (interval.includes('month')) {
          start.setDate(1);
          start.setHours(0,0,0,0);

          end.setDate(1);
          end.setHours(0,0,0,0);
          end.setMonth(end.getMonth() + 1);
      } else if (interval.includes('day')) {
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          end.setDate(end.getDate() + 1);
      }

      return { start, end };
  }

  private advanceDate(date: Date, interval: string): void {
      if (interval.includes('month')) {
          date.setMonth(date.getMonth() + 1);
      } else if (interval.includes('day')) {
          date.setDate(date.getDate() + 1);
      }
  }
}

export const tablePartitioningService = new TablePartitioningService();
