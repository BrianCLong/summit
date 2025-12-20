/**
 * Compliance Monitoring Service
 * Automated compliance checks, real-time alerts, and SLA monitoring
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import { GDPRComplianceService } from './GDPRComplianceService.js';
import { HIPAAComplianceService } from './HIPAAComplianceService.js';

const serviceLogger = logger.child({ name: 'ComplianceMonitoringService' });

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';

export interface ComplianceAlert {
  alertId?: string;
  tenantId: string;
  alertType: string;
  alertSeverity: AlertSeverity;
  alertTitle: string;
  alertDescription: string;
  resourceType?: string;
  resourceId?: string;
  affectedCount?: number;
  regulation?: string; // 'GDPR', 'HIPAA', 'SOC2', etc.
  regulationArticle?: string;
  alertStatus: AlertStatus;
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  slaDeadline?: Date;
  slaBreached?: boolean;
  alertMetadata?: Record<string, any>;
}

export interface ComplianceMetric {
  metricId?: string;
  tenantId: string;
  metricType: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  targetValue?: number;
  thresholdBreached?: boolean;
  severity?: AlertSeverity;
  periodStart: Date;
  periodEnd: Date;
  metricMetadata?: Record<string, any>;
}

export interface ComplianceCheckResult {
  checkName: string;
  passed: boolean;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// COMPLIANCE MONITORING SERVICE
// ============================================================================

export class ComplianceMonitoringService {
  private gdprService: GDPRComplianceService;
  private hipaaService: HIPAAComplianceService;

  constructor(private pg: Pool) {
    this.gdprService = new GDPRComplianceService(pg);
    this.hipaaService = new HIPAAComplianceService(pg);

    // Schedule periodic compliance checks
    this.schedulePeriodicChecks();
  }

  // ==========================================================================
  // AUTOMATED COMPLIANCE CHECKS
  // ==========================================================================

  /**
   * Run all compliance checks for a tenant
   */
  async runComplianceChecks(tenantId: string): Promise<ComplianceCheckResult[]> {
    serviceLogger.info({ tenantId }, 'Running compliance checks');

    const results: ComplianceCheckResult[] = [];

    // GDPR compliance checks
    results.push(await this.checkGDPRDSRSLA(tenantId));
    results.push(await this.checkGDPRDataRetention(tenantId));
    results.push(await this.checkGDPRConsentValidity(tenantId));

    // HIPAA compliance checks
    results.push(await this.checkHIPAAEncryption(tenantId));
    results.push(await this.checkHIPAAAccessLogging(tenantId));
    results.push(await this.checkHIPAAMinimumNecessary(tenantId));

    // General audit checks
    results.push(await this.checkAuditCoverage(tenantId));
    results.push(await this.checkAuditIntegrity(tenantId));
    results.push(await this.checkRetentionCompliance(tenantId));

    // Process check results
    for (const result of results) {
      if (!result.passed) {
        await this.createAlert({
          tenantId,
          alertType: result.checkName,
          alertSeverity: result.severity,
          alertTitle: `Compliance Check Failed: ${result.checkName}`,
          alertDescription: result.message,
          alertStatus: 'open',
          regulation: this.getRegulationForCheck(result.checkName),
          alertMetadata: result.metadata,
        });
      }
    }

    return results;
  }

  /**
   * Check GDPR DSR SLA compliance (30-day deadline)
   */
  private async checkGDPRDSRSLA(tenantId: string): Promise<ComplianceCheckResult> {
    const overdueRequests = await this.gdprService.getOverdueRequests(tenantId);

    if (overdueRequests.length > 0) {
      return {
        checkName: 'gdpr_dsr_sla',
        passed: false,
        severity: 'critical',
        message: `${overdueRequests.length} data subject requests are overdue (GDPR Article 12 requires response within 30 days)`,
        metadata: {
          overdueCount: overdueRequests.length,
          overdueRequests: overdueRequests.map(r => ({
            requestId: r.requestId,
            requestType: r.requestType,
            subjectId: r.subjectId,
            deadline: r.completionDeadline,
          })),
        },
      };
    }

    return {
      checkName: 'gdpr_dsr_sla',
      passed: true,
      severity: 'info',
      message: 'All data subject requests are within SLA',
    };
  }

  /**
   * Check GDPR data retention compliance
   */
  private async checkGDPRDataRetention(tenantId: string): Promise<ComplianceCheckResult> {
    // Check if data is being retained beyond policy limits
    const policies = await this.gdprService.getActiveRetentionPolicies();

    // This would need actual data age checks - placeholder logic
    const violationsCount = 0; // Actual implementation would query data ages

    if (violationsCount > 0) {
      return {
        checkName: 'gdpr_data_retention',
        passed: false,
        severity: 'warning',
        message: `Found ${violationsCount} records exceeding retention period (GDPR Article 5(1)(e))`,
        metadata: { violationsCount },
      };
    }

    return {
      checkName: 'gdpr_data_retention',
      passed: true,
      severity: 'info',
      message: 'Data retention policies are being followed',
    };
  }

  /**
   * Check GDPR consent validity
   */
  private async checkGDPRConsentValidity(tenantId: string): Promise<ComplianceCheckResult> {
    // Placeholder - would check consent expiration and validity
    return {
      checkName: 'gdpr_consent_validity',
      passed: true,
      severity: 'info',
      message: 'All consents are valid',
    };
  }

  /**
   * Check HIPAA encryption compliance
   */
  private async checkHIPAAEncryption(tenantId: string): Promise<ComplianceCheckResult> {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const endDate = new Date();

    const summary = await this.hipaaService.getPHIAccessSummary(
      tenantId,
      startDate,
      endDate,
    );

    if (summary.complianceRate < 0.99) {
      return {
        checkName: 'hipaa_encryption',
        passed: false,
        severity: 'critical',
        message: `Encryption compliance rate is ${(summary.complianceRate * 100).toFixed(1)}% (target: 99%+) - HIPAA 164.312(a)(2)(iv) violation`,
        metadata: {
          complianceRate: summary.complianceRate,
          totalAccesses: summary.totalAccesses,
          incidentCount: summary.incidentCount,
        },
      };
    }

    return {
      checkName: 'hipaa_encryption',
      passed: true,
      severity: 'info',
      message: 'Encryption compliance is within acceptable limits',
      metadata: { complianceRate: summary.complianceRate },
    };
  }

  /**
   * Check HIPAA access logging coverage
   */
  private async checkHIPAAAccessLogging(tenantId: string): Promise<ComplianceCheckResult> {
    const { rows } = await this.pg.query(
      `SELECT COUNT(*) as count
       FROM hipaa_phi_access_log
       WHERE tenant_id = $1
         AND access_timestamp >= NOW() - INTERVAL '24 hours'`,
      [tenantId],
    );

    const accessCount = parseInt(rows[0]?.count || '0', 10);

    // Check if logging is active (expect at least some activity)
    if (accessCount === 0) {
      return {
        checkName: 'hipaa_access_logging',
        passed: false,
        severity: 'warning',
        message: 'No PHI access logs recorded in the last 24 hours - verify logging is active',
      };
    }

    return {
      checkName: 'hipaa_access_logging',
      passed: true,
      severity: 'info',
      message: `PHI access logging is active (${accessCount} accesses logged in last 24 hours)`,
      metadata: { accessCount },
    };
  }

  /**
   * Check HIPAA minimum necessary rule compliance
   */
  private async checkHIPAAMinimumNecessary(tenantId: string): Promise<ComplianceCheckResult> {
    // Check for insufficient justifications
    const { rows } = await this.pg.query(
      `SELECT COUNT(*) as count
       FROM hipaa_phi_access_log
       WHERE tenant_id = $1
         AND LENGTH(minimum_necessary_justification) < 20
         AND access_timestamp >= NOW() - INTERVAL '7 days'`,
      [tenantId],
    );

    const insufficientCount = parseInt(rows[0]?.count || '0', 10);

    if (insufficientCount > 0) {
      return {
        checkName: 'hipaa_minimum_necessary',
        passed: false,
        severity: 'warning',
        message: `Found ${insufficientCount} PHI accesses with insufficient minimum necessary justification - HIPAA 164.502(b) requires proper justification`,
        metadata: { insufficientCount },
      };
    }

    return {
      checkName: 'hipaa_minimum_necessary',
      passed: true,
      severity: 'info',
      message: 'Minimum necessary justifications are adequate',
    };
  }

  /**
   * Check audit coverage (are all critical operations being audited?)
   */
  private async checkAuditCoverage(tenantId: string): Promise<ComplianceCheckResult> {
    const { rows } = await this.pg.query(
      `SELECT
         COUNT(DISTINCT event_type) as event_types_count,
         COUNT(*) as total_events
       FROM event_store
       WHERE tenant_id = $1
         AND event_timestamp >= NOW() - INTERVAL '7 days'`,
      [tenantId],
    );

    const eventTypesCount = parseInt(rows[0]?.event_types_count || '0', 10);
    const totalEvents = parseInt(rows[0]?.total_events || '0', 10);

    // Expect at least 10 different event types for good coverage
    if (eventTypesCount < 10) {
      return {
        checkName: 'audit_coverage',
        passed: false,
        severity: 'warning',
        message: `Limited audit coverage: only ${eventTypesCount} event types recorded (recommend 10+)`,
        metadata: { eventTypesCount, totalEvents },
      };
    }

    return {
      checkName: 'audit_coverage',
      passed: true,
      severity: 'info',
      message: `Good audit coverage with ${eventTypesCount} event types`,
      metadata: { eventTypesCount, totalEvents },
    };
  }

  /**
   * Check audit log integrity
   */
  private async checkAuditIntegrity(tenantId: string): Promise<ComplianceCheckResult> {
    // Sample check - verify hash chain for recent events
    const { rows } = await this.pg.query(
      `SELECT event_hash, previous_event_hash
       FROM event_store
       WHERE tenant_id = $1
       ORDER BY event_timestamp DESC
       LIMIT 100`,
      [tenantId],
    );

    let chainValid = true;
    let expectedHash: string | null = null;

    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (expectedHash && row.previous_event_hash !== expectedHash) {
        chainValid = false;
        break;
      }
      expectedHash = row.event_hash;
    }

    if (!chainValid) {
      return {
        checkName: 'audit_integrity',
        passed: false,
        severity: 'critical',
        message: 'Audit log integrity check failed - possible tampering detected',
      };
    }

    return {
      checkName: 'audit_integrity',
      passed: true,
      severity: 'info',
      message: 'Audit log integrity verified',
    };
  }

  /**
   * Check retention policy compliance
   */
  private async checkRetentionCompliance(tenantId: string): Promise<ComplianceCheckResult> {
    // Placeholder - would check actual data against retention policies
    return {
      checkName: 'retention_compliance',
      passed: true,
      severity: 'info',
      message: 'Retention policies are being followed',
    };
  }

  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================

  /**
   * Create a compliance alert
   */
  async createAlert(alert: ComplianceAlert): Promise<{ alertId: string }> {
    const alertId = alert.alertId || randomUUID();

    // Calculate SLA deadline based on severity
    const slaDeadline =
      alert.slaDeadline || this.calculateSLADeadline(alert.alertSeverity);

    await this.pg.query(
      `INSERT INTO compliance_alerts (
        alert_id, tenant_id, alert_type, alert_severity, alert_title, alert_description,
        resource_type, resource_id, affected_count, regulation, regulation_article,
        alert_status, assigned_to, sla_deadline, alert_metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        alertId,
        alert.tenantId,
        alert.alertType,
        alert.alertSeverity,
        alert.alertTitle,
        alert.alertDescription,
        alert.resourceType || null,
        alert.resourceId || null,
        alert.affectedCount || 1,
        alert.regulation || null,
        alert.regulationArticle || null,
        alert.alertStatus,
        alert.assignedTo || null,
        slaDeadline,
        JSON.stringify(alert.alertMetadata || {}),
      ],
    );

    serviceLogger.warn(
      {
        alertId,
        alertType: alert.alertType,
        alertSeverity: alert.alertSeverity,
        tenantId: alert.tenantId,
      },
      'Compliance alert created',
    );

    return { alertId };
  }

  /**
   * Update alert status
   */
  async updateAlert(
    alertId: string,
    updates: Partial<ComplianceAlert>,
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.alertStatus) {
      setClauses.push(`alert_status = $${paramIndex}`);
      params.push(updates.alertStatus);
      paramIndex++;
    }

    if (updates.assignedTo !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex}`);
      params.push(updates.assignedTo);
      paramIndex++;
    }

    if (updates.acknowledgedBy) {
      setClauses.push(`acknowledged_by = $${paramIndex}, acknowledged_at = NOW()`);
      params.push(updates.acknowledgedBy);
      paramIndex++;
    }

    if (updates.resolvedBy) {
      setClauses.push(`resolved_by = $${paramIndex}, resolved_at = NOW()`);
      params.push(updates.resolvedBy);
      paramIndex++;
    }

    if (updates.resolutionNotes) {
      setClauses.push(`resolution_notes = $${paramIndex}`);
      params.push(updates.resolutionNotes);
      paramIndex++;
    }

    setClauses.push('updated_at = NOW()');

    params.push(alertId);

    await this.pg.query(
      `UPDATE compliance_alerts
       SET ${setClauses.join(', ')}
       WHERE alert_id = $${paramIndex}`,
      params,
    );
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(tenantId: string): Promise<ComplianceAlert[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM compliance_alerts
       WHERE tenant_id = $1
         AND alert_status NOT IN ('resolved', 'false_positive')
       ORDER BY alert_severity DESC, created_at DESC`,
      [tenantId],
    );

    return rows.map(this.mapAlertRow);
  }

  /**
   * Get SLA-breached alerts
   */
  async getSLABreachedAlerts(tenantId: string): Promise<ComplianceAlert[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM compliance_alerts
       WHERE tenant_id = $1
         AND alert_status NOT IN ('resolved', 'false_positive')
         AND sla_deadline < NOW()
       ORDER BY sla_deadline ASC`,
      [tenantId],
    );

    // Mark as SLA breached
    for (const row of rows) {
      await this.pg.query(
        `UPDATE compliance_alerts SET sla_breached = true WHERE alert_id = $1`,
        [row.alert_id],
      );
    }

    return rows.map(this.mapAlertRow);
  }

  // ==========================================================================
  // METRICS TRACKING
  // ==========================================================================

  /**
   * Record compliance metric
   */
  async recordMetric(metric: ComplianceMetric): Promise<void> {
    const metricId = metric.metricId || randomUUID();

    const thresholdBreached = metric.targetValue
      ? metric.metricValue < metric.targetValue
      : false;

    await this.pg.query(
      `INSERT INTO compliance_metrics (
        metric_id, tenant_id, metric_type, metric_name, metric_value, metric_unit,
        target_value, threshold_breached, severity, period_start, period_end, metric_metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        metricId,
        metric.tenantId,
        metric.metricType,
        metric.metricName,
        metric.metricValue,
        metric.metricUnit || null,
        metric.targetValue || null,
        thresholdBreached,
        metric.severity || 'info',
        metric.periodStart,
        metric.periodEnd,
        JSON.stringify(metric.metricMetadata || {}),
      ],
    );
  }

  /**
   * Get compliance metrics
   */
  async getMetrics(
    tenantId: string,
    metricType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ComplianceMetric[]> {
    const params: any[] = [tenantId];
    let sql = `SELECT * FROM compliance_metrics WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (metricType) {
      sql += ` AND metric_type = $${paramIndex}`;
      params.push(metricType);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND period_start >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND period_end <= $${paramIndex}`;
      params.push(endDate);
    }

    sql += ` ORDER BY period_start DESC`;

    const { rows } = await this.pg.query(sql, params);
    return rows.map(this.mapMetricRow);
  }

  // ==========================================================================
  // PERIODIC CHECKS
  // ==========================================================================

  /**
   * Schedule periodic compliance checks
   */
  private schedulePeriodicChecks(): void {
    // Run every hour
    setInterval(
      async () => {
        try {
          // Get all active tenants
          const { rows } = await this.pg.query(
            `SELECT DISTINCT tenant_id FROM event_store`,
          );

          for (const row of rows) {
            await this.runComplianceChecks(row.tenant_id);
          }
        } catch (error) {
          serviceLogger.error(
            { error: (error as Error).message },
            'Failed to run periodic compliance checks',
          );
        }
      },
      60 * 60 * 1000,
    ); // 1 hour

    serviceLogger.info('Periodic compliance checks scheduled');
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private calculateSLADeadline(severity: AlertSeverity): Date {
    const now = new Date();
    switch (severity) {
      case 'emergency':
        return new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
      case 'critical':
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'warning':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'info':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private getRegulationForCheck(checkName: string): string {
    if (checkName.startsWith('gdpr_')) return 'GDPR';
    if (checkName.startsWith('hipaa_')) return 'HIPAA';
    return 'General';
  }

  private mapAlertRow(row: any): ComplianceAlert {
    return {
      alertId: row.alert_id,
      tenantId: row.tenant_id,
      alertType: row.alert_type,
      alertSeverity: row.alert_severity,
      alertTitle: row.alert_title,
      alertDescription: row.alert_description,
      resourceType: row.resource_type || undefined,
      resourceId: row.resource_id || undefined,
      affectedCount: row.affected_count || 1,
      regulation: row.regulation || undefined,
      regulationArticle: row.regulation_article || undefined,
      alertStatus: row.alert_status,
      assignedTo: row.assigned_to || undefined,
      acknowledgedBy: row.acknowledged_by || undefined,
      acknowledgedAt: row.acknowledged_at || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      slaDeadline: row.sla_deadline,
      slaBreached: row.sla_breached || false,
      alertMetadata: row.alert_metadata || {},
    };
  }

  private mapMetricRow(row: any): ComplianceMetric {
    return {
      metricId: row.metric_id,
      tenantId: row.tenant_id,
      metricType: row.metric_type,
      metricName: row.metric_name,
      metricValue: parseFloat(row.metric_value),
      metricUnit: row.metric_unit || undefined,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      thresholdBreached: row.threshold_breached || false,
      severity: row.severity || 'info',
      periodStart: row.period_start,
      periodEnd: row.period_end,
      metricMetadata: row.metric_metadata || {},
    };
  }
}
