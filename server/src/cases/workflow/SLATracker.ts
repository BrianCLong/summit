/**
 * SLA Tracker - Service Level Agreement tracking and breach detection
 * Handles SLA lifecycle, breach detection, at-risk warnings, and escalations
 */

import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { CaseSLA, CaseSLAInput, SLAStatus, SLAType } from './types.js';

const slaLogger = logger.child({ name: 'SLATracker' });

export interface SLABreachEvent {
  slaId: string;
  caseId: string;
  slaType: SLAType;
  targetHours: number;
  dueAt: Date;
  breachedAt: Date;
  breachDurationHours: number;
}

export interface SLAAtRiskEvent {
  slaId: string;
  caseId: string;
  slaType: SLAType;
  targetHours: number;
  dueAt: Date;
  hoursRemaining: number;
}

export class SLATracker {
  constructor(private pg: Pool) {}

  /**
   * Create a new SLA
   */
  async createSLA(input: CaseSLAInput): Promise<CaseSLA> {
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + input.targetHours);

    const { rows } = await this.pg.query(
      `INSERT INTO maestro.case_slas (
        case_id, sla_type, target_entity_id, target_hours, due_at,
        status, at_risk_threshold_hours, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id, case_id, sla_type, target_entity_id, target_hours, due_at,
        status, breached_at, completed_at, at_risk_threshold_hours,
        escalation_sent, metadata, created_at, updated_at`,
      [
        input.caseId,
        input.slaType,
        input.targetEntityId || null,
        input.targetHours,
        dueAt,
        'active',
        input.atRiskThresholdHours || 4,
        JSON.stringify(input.metadata || {}),
      ],
    );

    slaLogger.info(
      {
        slaId: rows[0].id,
        caseId: input.caseId,
        slaType: input.slaType,
        dueAt,
      },
      'SLA created',
    );

    return this.mapRow(rows[0]);
  }

  /**
   * Get SLA by ID
   */
  async getSLA(id: string): Promise<CaseSLA | null> {
    const { rows } = await this.pg.query(
      `SELECT
        id, case_id, sla_type, target_entity_id, target_hours, due_at,
        status, breached_at, completed_at, at_risk_threshold_hours,
        escalation_sent, metadata, created_at, updated_at
      FROM maestro.case_slas
      WHERE id = $1`,
      [id],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Get all SLAs for a case
   */
  async getCaseSLAs(caseId: string, status?: SLAStatus): Promise<CaseSLA[]> {
    let query = `
      SELECT
        id, case_id, sla_type, target_entity_id, target_hours, due_at,
        status, breached_at, completed_at, at_risk_threshold_hours,
        escalation_sent, metadata, created_at, updated_at
      FROM maestro.case_slas
      WHERE case_id = $1
    `;
    const params: any[] = [caseId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await this.pg.query(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Mark SLA as met (completed successfully)
   */
  async markSLAMet(id: string): Promise<CaseSLA | null> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_slas
       SET status = 'met',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       AND status IN ('active', 'at_risk')
       RETURNING
        id, case_id, sla_type, target_entity_id, target_hours, due_at,
        status, breached_at, completed_at, at_risk_threshold_hours,
        escalation_sent, metadata, created_at, updated_at`,
      [id],
    );

    if (rows[0]) {
      slaLogger.info({ slaId: id }, 'SLA marked as met');
    }

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Cancel SLA
   */
  async cancelSLA(id: string): Promise<CaseSLA | null> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_slas
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1
       RETURNING
        id, case_id, sla_type, target_entity_id, target_hours, due_at,
        status, breached_at, completed_at, at_risk_threshold_hours,
        escalation_sent, metadata, created_at, updated_at`,
      [id],
    );

    if (rows[0]) {
      slaLogger.info({ slaId: id }, 'SLA cancelled');
    }

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Check for breached SLAs and return events
   * This should be run periodically (e.g., every 5 minutes)
   */
  async checkBreachedSLAs(): Promise<SLABreachEvent[]> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_slas
       SET status = 'breached',
           breached_at = NOW(),
           updated_at = NOW()
       WHERE status IN ('active', 'at_risk')
       AND due_at <= NOW()
       RETURNING
        id, case_id, sla_type, target_hours, due_at, breached_at`,
    );

    const events: SLABreachEvent[] = rows.map((row) => {
      const breachDurationHours =
        (new Date().getTime() - new Date(row.due_at).getTime()) / (1000 * 60 * 60);

      slaLogger.warn(
        {
          slaId: row.id,
          caseId: row.case_id,
          slaType: row.sla_type,
          breachDurationHours: breachDurationHours.toFixed(2),
        },
        'SLA breached',
      );

      return {
        slaId: row.id,
        caseId: row.case_id,
        slaType: row.sla_type,
        targetHours: row.target_hours,
        dueAt: row.due_at,
        breachedAt: row.breached_at,
        breachDurationHours,
      };
    });

    return events;
  }

  /**
   * Check for at-risk SLAs (approaching due date)
   * This should be run periodically (e.g., every 15 minutes)
   */
  async checkAtRiskSLAs(): Promise<SLAAtRiskEvent[]> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_slas
       SET status = 'at_risk',
           updated_at = NOW()
       WHERE status = 'active'
       AND due_at <= NOW() + (at_risk_threshold_hours || ' hours')::INTERVAL
       AND due_at > NOW()
       RETURNING
        id, case_id, sla_type, target_hours, due_at, at_risk_threshold_hours`,
    );

    const events: SLAAtRiskEvent[] = rows.map((row) => {
      const hoursRemaining =
        (new Date(row.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60);

      slaLogger.info(
        {
          slaId: row.id,
          caseId: row.case_id,
          slaType: row.sla_type,
          hoursRemaining: hoursRemaining.toFixed(2),
        },
        'SLA at risk',
      );

      return {
        slaId: row.id,
        caseId: row.case_id,
        slaType: row.sla_type,
        targetHours: row.target_hours,
        dueAt: row.due_at,
        hoursRemaining,
      };
    });

    return events;
  }

  /**
   * Get SLA summary for a case
   */
  async getCaseSLASummary(caseId: string): Promise<{
    totalSlas: number;
    activeSlas: number;
    metSlas: number;
    breachedSlas: number;
    atRiskSlas: number;
  }> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.get_case_sla_summary($1)`,
      [caseId],
    );

    return rows[0] || {
      totalSlas: 0,
      activeSlas: 0,
      metSlas: 0,
      breachedSlas: 0,
      atRiskSlas: 0,
    };
  }

  /**
   * Get all breached SLAs across all cases (for reporting)
   */
  async getAllBreachedSLAs(
    tenantId?: string,
    limit = 100,
  ): Promise<CaseSLA[]> {
    let query = `
      SELECT
        s.id, s.case_id, s.sla_type, s.target_entity_id, s.target_hours, s.due_at,
        s.status, s.breached_at, s.completed_at, s.at_risk_threshold_hours,
        s.escalation_sent, s.metadata, s.created_at, s.updated_at
      FROM maestro.case_slas s
      JOIN maestro.cases c ON c.id = s.case_id
      WHERE s.status = 'breached'
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND c.tenant_id = $1`;
      params.push(tenantId);
    }

    query += ` ORDER BY s.breached_at DESC LIMIT ${tenantId ? '$2' : '$1'}`;
    params.push(limit);

    const { rows } = await this.pg.query(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Get all at-risk SLAs across all cases (for reporting)
   */
  async getAllAtRiskSLAs(
    tenantId?: string,
    limit = 100,
  ): Promise<CaseSLA[]> {
    let query = `
      SELECT
        s.id, s.case_id, s.sla_type, s.target_entity_id, s.target_hours, s.due_at,
        s.status, s.breached_at, s.completed_at, s.at_risk_threshold_hours,
        s.escalation_sent, s.metadata, s.created_at, s.updated_at
      FROM maestro.case_slas s
      JOIN maestro.cases c ON c.id = s.case_id
      WHERE s.status = 'at_risk'
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND c.tenant_id = $1`;
      params.push(tenantId);
    }

    query += ` ORDER BY s.due_at ASC LIMIT ${tenantId ? '$2' : '$1'}`;
    params.push(limit);

    const { rows } = await this.pg.query(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Mark escalation as sent for an SLA
   */
  async markEscalationSent(id: string): Promise<void> {
    await this.pg.query(
      `UPDATE maestro.case_slas
       SET escalation_sent = true,
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );

    slaLogger.info({ slaId: id }, 'SLA escalation marked as sent');
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: any): CaseSLA {
    return {
      id: row.id,
      caseId: row.case_id,
      slaType: row.sla_type,
      targetEntityId: row.target_entity_id,
      targetHours: row.target_hours,
      dueAt: row.due_at,
      status: row.status,
      breachedAt: row.breached_at,
      completedAt: row.completed_at,
      atRiskThresholdHours: row.at_risk_threshold_hours,
      escalationSent: row.escalation_sent,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
