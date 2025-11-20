/**
 * Audit Logger for Compliance and Security
 *
 * Logs all data access and modifications for compliance (SOC2, GDPR, HIPAA)
 */

import { Pool } from 'pg';

export interface AuditLog {
  logId: string;
  timestamp: Date;
  userId: string;
  username: string;
  operation: string;
  tableName: string;
  query: string;
  rowsAffected: number;
  duration: number;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  constructor(private pool: Pool) {}

  /**
   * Log query execution
   */
  async logQuery(log: Omit<AuditLog, 'logId'>): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO warehouse_audit_log (
        user_id, username, operation, table_name, query,
        rows_affected, duration, ip_address, user_agent,
        status, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        log.userId,
        log.username,
        log.operation,
        log.tableName,
        log.query,
        log.rowsAffected,
        log.duration,
        log.ipAddress,
        log.userAgent,
        log.status,
        log.errorMessage,
        JSON.stringify(log.metadata || {}),
      ],
    );
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: {
    userId?: string;
    tableName?: string;
    operation?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'success' | 'failure';
    limit?: number;
  }): Promise<AuditLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(filters.userId);
    }

    if (filters.tableName) {
      conditions.push(`table_name = $${paramCount++}`);
      values.push(filters.tableName);
    }

    if (filters.operation) {
      conditions.push(`operation = $${paramCount++}`);
      values.push(filters.operation);
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramCount++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramCount++}`);
      values.push(filters.endDate);
    }

    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 1000;

    const result = await this.pool.query(
      `
      SELECT *
      FROM warehouse_audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `,
      values,
    );

    return result.rows.map((row) => ({
      logId: row.log_id,
      timestamp: row.timestamp,
      userId: row.user_id,
      username: row.username,
      operation: row.operation,
      tableName: row.table_name,
      query: row.query,
      rowsAffected: row.rows_affected,
      duration: row.duration,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(period: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    uniqueUsers: number;
    topTables: Array<{ table: string; count: number }>;
    topUsers: Array<{ user: string; count: number }>;
  }> {
    const periodClause =
      period === 'day'
        ? "timestamp >= CURRENT_DATE"
        : period === 'week'
          ? "timestamp >= CURRENT_DATE - INTERVAL '7 days'"
          : "timestamp >= CURRENT_DATE - INTERVAL '30 days'";

    const stats = await this.pool.query(`
      SELECT
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE status = 'success') as successful_queries,
        COUNT(*) FILTER (WHERE status = 'failure') as failed_queries,
        COUNT(DISTINCT user_id) as unique_users
      FROM warehouse_audit_log
      WHERE ${periodClause}
    `);

    const topTables = await this.pool.query(`
      SELECT table_name as table, COUNT(*) as count
      FROM warehouse_audit_log
      WHERE ${periodClause}
      GROUP BY table_name
      ORDER BY count DESC
      LIMIT 10
    `);

    const topUsers = await this.pool.query(`
      SELECT username as user, COUNT(*) as count
      FROM warehouse_audit_log
      WHERE ${periodClause}
      GROUP BY username
      ORDER BY count DESC
      LIMIT 10
    `);

    return {
      totalQueries: parseInt(stats.rows[0].total_queries),
      successfulQueries: parseInt(stats.rows[0].successful_queries),
      failedQueries: parseInt(stats.rows[0].failed_queries),
      uniqueUsers: parseInt(stats.rows[0].unique_users),
      topTables: topTables.rows,
      topUsers: topUsers.rows,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalAccess: number;
      sensitiveDataAccess: number;
      failedAccess: number;
      suspiciousActivity: number;
    };
    sensitiveAccess: AuditLog[];
    failedAttempts: AuditLog[];
  }> {
    const sensitiveTableslower = [
      'employees',
      'customers',
      'financial_data',
      'pii_data',
    ];

    const logs = await this.getLogs({ startDate, endDate, limit: 100000 });

    const sensitiveAccess = logs.filter((log) =>
      sensitiveTables.includes(log.tableName.toLowerCase()),
    );

    const failedAttempts = logs.filter((log) => log.status === 'failure');

    // Detect suspicious activity (e.g., bulk downloads, after-hours access)
    const suspiciousActivity = logs.filter((log) => {
      const hour = log.timestamp.getHours();
      return (
        log.rowsAffected > 10000 || // Bulk access
        hour < 6 ||
        hour > 22 // After hours
      );
    }).length;

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalAccess: logs.length,
        sensitiveDataAccess: sensitiveAccess.length,
        failedAccess: failedAttempts.length,
        suspiciousActivity,
      },
      sensitiveAccess: sensitiveAccess.slice(0, 100),
      failedAttempts: failedAttempts.slice(0, 100),
    };
  }

  /**
   * Initialize audit tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_audit_log (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id UUID NOT NULL,
        username VARCHAR(255) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        table_name VARCHAR(255),
        query TEXT,
        rows_affected INTEGER DEFAULT 0,
        duration INTEGER, -- milliseconds
        ip_address INET,
        user_agent TEXT,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        metadata JSONB DEFAULT '{}'
      );

      -- Partitioning by month for performance
      -- In production, implement automatic partition management

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON warehouse_audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON warehouse_audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_table ON warehouse_audit_log(table_name);
      CREATE INDEX IF NOT EXISTS idx_audit_status ON warehouse_audit_log(status);
      CREATE INDEX IF NOT EXISTS idx_audit_metadata ON warehouse_audit_log USING GIN(metadata);
    `);
  }

  /**
   * Archive old logs
   */
  async archiveLogs(olderThan: Date): Promise<number> {
    // Move to archive table
    await this.pool.query(`
      INSERT INTO warehouse_audit_log_archive
      SELECT * FROM warehouse_audit_log
      WHERE timestamp < $1
    `, [olderThan]);

    // Delete from main table
    const result = await this.pool.query(`
      DELETE FROM warehouse_audit_log
      WHERE timestamp < $1
    `, [olderThan]);

    return result.rowCount || 0;
  }
}
