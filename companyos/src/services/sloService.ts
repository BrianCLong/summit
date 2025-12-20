/**
 * SLO Service
 * Business logic for SLO violation tracking
 */

import { Pool } from 'pg';
import {
  SLOViolation,
  CreateSLOViolationInput,
  SLOComplianceSummary,
} from '../models/slo';

export class SLOService {
  constructor(private db: Pool) {}

  async createViolation(input: CreateSLOViolationInput): Promise<SLOViolation> {
    const query = `
      INSERT INTO maestro.slo_violations (
        slo_name, slo_type, service_name, threshold_value, actual_value,
        measurement_window, severity, prometheus_query, prometheus_value_json, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      input.sloName,
      input.sloType,
      input.serviceName,
      input.thresholdValue,
      input.actualValue,
      input.measurementWindow,
      input.severity,
      input.prometheusQuery,
      JSON.stringify(input.prometheusValueJson || {}),
      JSON.stringify(input.metadata || {}),
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToViolation(result.rows[0]);
  }

  async getViolation(id: string): Promise<SLOViolation | null> {
    const query = `SELECT * FROM maestro.slo_violations WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToViolation(result.rows[0]) : null;
  }

  async listViolations(
    serviceName?: string,
    fromDate?: Date,
    limit = 25,
    offset = 0
  ): Promise<SLOViolation[]> {
    let query = `SELECT * FROM maestro.slo_violations WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (serviceName) {
      query += ` AND service_name = $${paramIndex++}`;
      values.push(serviceName);
    }
    if (fromDate) {
      query += ` AND triggered_at >= $${paramIndex++}`;
      values.push(fromDate);
    }

    query += ` ORDER BY triggered_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows.map((row) => this.mapRowToViolation(row));
  }

  async getComplianceSummary(
    serviceName?: string,
    days = 28
  ): Promise<SLOComplianceSummary[]> {
    let query = `SELECT * FROM maestro.slo_compliance_view WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (serviceName) {
      query += ` AND service_name = $${paramIndex++}`;
      values.push(serviceName);
    }

    const result = await this.db.query(query, values);
    return result.rows.map((row) => ({
      sloName: row.slo_name,
      serviceName: row.service_name,
      sloType: row.slo_type,
      violationCount: parseInt(row.violation_count),
      lastViolationAt: row.last_violation_at,
      totalErrorBudgetConsumed: row.total_error_budget_consumed
        ? parseFloat(row.total_error_budget_consumed)
        : undefined,
      avgActualValue: row.avg_actual_value
        ? parseFloat(row.avg_actual_value)
        : undefined,
      thresholdValue: row.threshold_value
        ? parseFloat(row.threshold_value)
        : undefined,
    }));
  }

  async resolveViolation(id: string): Promise<SLOViolation | null> {
    const query = `
      UPDATE maestro.slo_violations
      SET resolved_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToViolation(result.rows[0]) : null;
  }

  async linkToIncident(
    violationId: string,
    incidentId: string
  ): Promise<SLOViolation | null> {
    const query = `
      UPDATE maestro.slo_violations
      SET incident_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [violationId, incidentId]);
    return result.rows[0] ? this.mapRowToViolation(result.rows[0]) : null;
  }

  private mapRowToViolation(row: any): SLOViolation {
    return {
      id: row.id,
      sloName: row.slo_name,
      sloType: row.slo_type,
      serviceName: row.service_name,
      thresholdValue: parseFloat(row.threshold_value),
      actualValue: parseFloat(row.actual_value),
      measurementWindow: row.measurement_window,
      triggeredAt: row.triggered_at,
      resolvedAt: row.resolved_at,
      severity: row.severity,
      incidentId: row.incident_id,
      alertId: row.alert_id,
      errorBudgetImpact: row.error_budget_impact
        ? parseFloat(row.error_budget_impact)
        : undefined,
      prometheusQuery: row.prometheus_query,
      prometheusValueJson: row.prometheus_value_json,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
