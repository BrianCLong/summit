/**
 * @fileoverview Case SLA Timer Service
 *
 * Manages the lifecycle of SLA timers for cases.
 *
 * Features:
 * - Start/Pause/Resume/Complete timers
 * - Check for breaches (to be called by a cron/job)
 * - Calculate time remaining
 *
 * @module cases/sla/CaseSLAService
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { CaseSLATimer, CreateSLATimerInput, SLAStatus } from './types.js';

export class CaseSLAService {
  private readonly tableName = 'maestro.case_sla_timers';

  constructor(private readonly pool: Pool) {}

  /**
   * Create and start a new SLA timer for a case
   */
  async createTimer(input: CreateSLATimerInput): Promise<CaseSLATimer> {
    const slaId = randomUUID();
    const startTime = new Date();
    const deadline = new Date(startTime.getTime() + input.targetDurationSeconds * 1000);

    const query = `
      INSERT INTO ${this.tableName} (
        sla_id, case_id, tenant_id, type, name,
        start_time, deadline, status,
        target_duration_seconds, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      slaId, input.caseId, input.tenantId, input.type, input.name,
      startTime.toISOString(), deadline.toISOString(), 'ACTIVE',
      input.targetDurationSeconds, JSON.stringify(input.metadata || {})
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Complete an SLA timer (mark as met)
   */
  async completeTimer(slaId: string): Promise<CaseSLATimer> {
    const now = new Date();

    // Optimistic check: if already breached, keep as breached?
    // Usually completion stops the clock. If now > deadline, it's a breach technically,
    // but we might mark it COMPLETED with a "breached" flag in metadata or similar.
    // For simplicity, we just mark COMPLETED and let analytics decide if it was late.

    // However, if we want to enforce BREACHED state explicitly, we should check deadline.

    const query = `
      UPDATE ${this.tableName}
      SET status = CASE
        WHEN status = 'BREACHED' THEN 'BREACHED' -- Sticky breach
        WHEN deadline < $2 THEN 'BREACHED' -- Late completion
        ELSE 'COMPLETED'
      END,
      completed_at = $2
      WHERE sla_id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [slaId, now.toISOString()]);
    if (result.rows.length === 0) throw new Error(`SLA Timer ${slaId} not found`);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Check for breached timers and update their status
   * Should be run periodically (e.g. every minute)
   */
  async checkBreaches(): Promise<number> {
    const now = new Date().toISOString();

    const query = `
      UPDATE ${this.tableName}
      SET status = 'BREACHED'
      WHERE status = 'ACTIVE'
      AND deadline < $1
    `;

    const result = await this.pool.query(query, [now]);
    return result.rowCount || 0;
  }

  /**
   * Get all timers for a case
   */
  async getTimersForCase(caseId: string): Promise<CaseSLATimer[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY deadline ASC
    `;

    const result = await this.pool.query(query, [caseId]);
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): CaseSLATimer {
    return {
      slaId: row.sla_id,
      caseId: row.case_id,
      tenantId: row.tenant_id,
      type: row.type,
      name: row.name,
      startTime: row.start_time.toISOString(),
      deadline: row.deadline.toISOString(),
      completedAt: row.completed_at ? row.completed_at.toISOString() : undefined,
      status: row.status,
      targetDurationSeconds: row.target_duration_seconds,
      metadata: row.metadata || {}
    };
  }
}
