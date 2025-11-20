/**
 * Security Manager - Unified Security Interface
 *
 * Central management for all security features
 */

import { Pool } from 'pg';
import { RBACManager } from './access-control/rbac-manager';
import { RowLevelSecurity } from './access-control/row-level-security';
import { ColumnAccessControl } from './access-control/column-access-control';
import { AuditLogger } from './auditing/audit-logger';
import { DataMasking } from './masking/data-masking';

export interface SecurityContext {
  userId: string;
  username: string;
  roles: string[];
  attributes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class SecurityManager {
  public rbac: RBACManager;
  public rls: RowLevelSecurity;
  public columnAccess: ColumnAccessControl;
  public auditLogger: AuditLogger;

  constructor(private pool: Pool) {
    this.rbac = new RBACManager(pool);
    this.rls = new RowLevelSecurity(pool);
    this.columnAccess = new ColumnAccessControl(pool);
    this.auditLogger = new AuditLogger(pool);
  }

  /**
   * Initialize all security components
   */
  async initialize(): Promise<void> {
    await this.rbac.initializeTables();
    await this.rls.initializeTables();
    await this.columnAccess.initializeTables();
    await this.auditLogger.initializeTables();

    // Install masking functions
    await DataMasking.installMaskingFunctions(this.pool);

    // Create default roles
    await this.rbac.createDefaultRoles();
  }

  /**
   * Execute secure query with all security checks
   */
  async executeSecureQuery(
    sql: string,
    context: SecurityContext,
  ): Promise<{ rows: any[]; duration: number }> {
    const startTime = Date.now();
    const tableName = this.extractTableName(sql);
    const operation = this.extractOperation(sql);

    try {
      // 1. Check RBAC permissions
      const hasPermission = await this.rbac.hasPermission(
        context.userId,
        tableName,
        operation,
      );

      if (!hasPermission) {
        const duration = Date.now() - startTime;
        await this.auditLogger.logQuery({
          userId: context.userId,
          username: context.username,
          operation,
          tableName,
          query: sql,
          rowsAffected: 0,
          duration,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          status: 'failure',
          errorMessage: 'Permission denied',
          timestamp: new Date(),
        });

        throw new Error(`Permission denied for ${operation} on ${tableName}`);
      }

      // 2. Apply row-level security
      let securedSQL = await this.rls.applyRLSToQuery(
        sql,
        context.userId,
        context.attributes,
      );

      // 3. Apply column-level security
      securedSQL = await this.columnAccess.filterQueryColumns(
        securedSQL,
        tableName,
        context.roles,
      );

      // 4. Execute query
      const result = await this.pool.query(securedSQL);

      const duration = Date.now() - startTime;

      // 5. Log successful access
      await this.auditLogger.logQuery({
        userId: context.userId,
        username: context.username,
        operation,
        tableName,
        query: securedSQL,
        rowsAffected: result.rowCount || 0,
        duration,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        status: 'success',
        timestamp: new Date(),
      });

      return {
        rows: result.rows,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed access
      await this.auditLogger.logQuery({
        userId: context.userId,
        username: context.username,
        operation,
        tableName,
        query: sql,
        rowsAffected: 0,
        duration,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        status: 'failure',
        errorMessage: (error as Error).message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get security status for user
   */
  async getUserSecurityStatus(userId: string): Promise<{
    roles: string[];
    permissions: number;
    recentActivity: any[];
    accessViolations: number;
  }> {
    const roles = await this.rbac.getUserRoles(userId);

    const recentLogs = await this.auditLogger.getLogs({
      userId,
      limit: 10,
    });

    const violations = recentLogs.filter((log) => log.status === 'failure').length;

    return {
      roles: roles.map((r) => r.name),
      permissions: roles.reduce((sum, r) => sum + r.permissions.length, 0),
      recentActivity: recentLogs,
      accessViolations: violations,
    };
  }

  /**
   * Generate security compliance report
   */
  async generateSecurityReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { start: Date; end: Date };
    auditSummary: any;
    topUsers: any[];
    securityEvents: any[];
    recommendations: string[];
  }> {
    const complianceReport = await this.auditLogger.generateComplianceReport(
      startDate,
      endDate,
    );

    const stats = await this.auditLogger.getAuditStats('month');

    const recommendations = [];

    if (complianceReport.summary.failedAccess > 100) {
      recommendations.push(
        'High number of failed access attempts detected. Review user permissions.',
      );
    }

    if (complianceReport.summary.suspiciousActivity > 50) {
      recommendations.push(
        'Suspicious activity detected. Investigate bulk downloads and after-hours access.',
      );
    }

    return {
      period: complianceReport.period,
      auditSummary: complianceReport.summary,
      topUsers: stats.topUsers,
      securityEvents: [
        ...complianceReport.failedAttempts.slice(0, 10),
        ...complianceReport.sensitiveAccess.slice(0, 10),
      ],
      recommendations,
    };
  }

  // Helper methods

  private extractTableName(sql: string): string {
    const match = sql.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  private extractOperation(sql: string): string {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith('select')) return 'SELECT';
    if (normalized.startsWith('insert')) return 'INSERT';
    if (normalized.startsWith('update')) return 'UPDATE';
    if (normalized.startsWith('delete')) return 'DELETE';
    return 'UNKNOWN';
  }
}
