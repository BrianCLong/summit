/**
 * Alert Service
 * Business logic for alert management
 */

import { Pool } from 'pg';
import {
  Alert,
  CreateAlertInput,
  UpdateAlertInput,
  AlertFilter,
  AlertStatus,
  AlertMetrics,
} from '../models/alert';

export class AlertService {
  constructor(private db: Pool) {}

  async createAlert(input: CreateAlertInput): Promise<Alert> {
    const query = `
      INSERT INTO maestro.alerts (
        alert_name, alert_source, severity, service_name, summary,
        description, labels, annotations, runbook_url, dashboard_url,
        fingerprint, group_key, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      input.alertName,
      input.alertSource,
      input.severity,
      input.serviceName,
      input.summary,
      input.description,
      JSON.stringify(input.labels || {}),
      JSON.stringify(input.annotations || {}),
      input.runbookUrl,
      input.dashboardUrl,
      input.fingerprint,
      input.groupKey,
      JSON.stringify(input.metadata || {}),
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToAlert(result.rows[0]);
  }

  async getAlert(id: string): Promise<Alert | null> {
    const query = `SELECT * FROM maestro.alerts WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async listAlerts(
    filter?: AlertFilter,
    limit = 25,
    offset = 0
  ): Promise<Alert[]> {
    let query = `SELECT * FROM maestro.alerts WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filter) {
      if (filter.alertName) {
        query += ` AND alert_name = $${paramIndex++}`;
        values.push(filter.alertName);
      }
      if (filter.severity) {
        query += ` AND severity = $${paramIndex++}`;
        values.push(filter.severity);
      }
      if (filter.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filter.status);
      }
      if (filter.serviceName) {
        query += ` AND service_name = $${paramIndex++}`;
        values.push(filter.serviceName);
      }
      if (filter.fromDate) {
        query += ` AND triggered_at >= $${paramIndex++}`;
        values.push(filter.fromDate);
      }
      if (filter.toDate) {
        query += ` AND triggered_at <= $${paramIndex++}`;
        values.push(filter.toDate);
      }
    }

    query += ` ORDER BY triggered_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows.map((row) => this.mapRowToAlert(row));
  }

  async getFiringAlerts(): Promise<Alert[]> {
    const query = `
      SELECT * FROM maestro.alerts
      WHERE status = 'firing'
      ORDER BY severity DESC, triggered_at DESC
    `;
    const result = await this.db.query(query);
    return result.rows.map((row) => this.mapRowToAlert(row));
  }

  async getAlertMetrics(days = 7): Promise<AlertMetrics[]> {
    const query = `
      SELECT * FROM maestro.alert_metrics_view
      ORDER BY fire_count DESC
    `;
    const result = await this.db.query(query);
    return result.rows.map((row) => ({
      alertName: row.alert_name,
      serviceName: row.service_name,
      severity: row.severity,
      fireCount: parseInt(row.fire_count),
      resolvedCount: parseInt(row.resolved_count),
      avgTimeToAcknowledgeMinutes: row.avg_time_to_acknowledge_minutes
        ? parseFloat(row.avg_time_to_acknowledge_minutes)
        : undefined,
      avgTimeToResolveMinutes: row.avg_time_to_resolve_minutes
        ? parseFloat(row.avg_time_to_resolve_minutes)
        : undefined,
      lastFiredAt: row.last_fired_at,
    }));
  }

  async updateAlert(
    id: string,
    input: UpdateAlertInput
  ): Promise<Alert | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);

      // Auto-set resolved_at if status is resolved
      if (input.status === AlertStatus.RESOLVED) {
        updates.push(`resolved_at = NOW()`);
      }
    }
    if (input.acknowledgedBy !== undefined) {
      updates.push(`acknowledged_by = $${paramIndex++}`);
      values.push(input.acknowledgedBy);
    }
    if (input.incidentId !== undefined) {
      updates.push(`incident_id = $${paramIndex++}`);
      values.push(input.incidentId);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.getAlert(id);
    }

    const query = `
      UPDATE maestro.alerts
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async acknowledgeAlert(
    id: string,
    acknowledgedBy: string
  ): Promise<Alert | null> {
    const query = `
      UPDATE maestro.alerts
      SET status = 'acknowledged', acknowledged_at = NOW(),
          acknowledged_by = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id, acknowledgedBy]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async resolveAlert(id: string): Promise<Alert | null> {
    const query = `
      UPDATE maestro.alerts
      SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async silenceAlert(id: string): Promise<Alert | null> {
    const query = `
      UPDATE maestro.alerts
      SET status = 'silenced', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async linkToIncident(
    alertId: string,
    incidentId: string
  ): Promise<Alert | null> {
    const query = `
      UPDATE maestro.alerts
      SET incident_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [alertId, incidentId]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  async findByFingerprint(fingerprint: string): Promise<Alert | null> {
    const query = `
      SELECT * FROM maestro.alerts
      WHERE fingerprint = $1
      ORDER BY triggered_at DESC
      LIMIT 1
    `;
    const result = await this.db.query(query, [fingerprint]);
    return result.rows[0] ? this.mapRowToAlert(result.rows[0]) : null;
  }

  private mapRowToAlert(row: any): Alert {
    return {
      id: row.id,
      alertName: row.alert_name,
      alertSource: row.alert_source,
      severity: row.severity,
      status: row.status,
      serviceName: row.service_name,
      summary: row.summary,
      description: row.description,
      labels: row.labels,
      annotations: row.annotations,
      triggeredAt: row.triggered_at,
      acknowledgedAt: row.acknowledged_at,
      acknowledgedBy: row.acknowledged_by,
      resolvedAt: row.resolved_at,
      incidentId: row.incident_id,
      sloViolationId: row.slo_violation_id,
      runbookUrl: row.runbook_url,
      dashboardUrl: row.dashboard_url,
      fingerprint: row.fingerprint,
      groupKey: row.group_key,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
