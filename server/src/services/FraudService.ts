import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { FraudSignal, InvestigationCase, HoldAction } from '../contracts/types.js';
import { randomUUID } from 'crypto';
import { provenanceLedger } from '../provenance/ledger.js';

export class FraudService {
  private static instance: FraudService;

  private constructor() {}

  public static getInstance(): FraudService {
    if (!FraudService.instance) {
      FraudService.instance = new FraudService();
    }
    return FraudService.instance;
  }

  async reportSignal(input: Omit<FraudSignal, 'id' | 'detectedAt' | 'investigationId'>): Promise<FraudSignal> {
    const pool = getPostgresPool();
    const id = randomUUID();
    const result = await pool.write(
      `INSERT INTO fraud_signals (
        id, tenant_id, signal_type, severity, source, payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [id, input.tenantId, input.signalType, input.severity, input.source, input.payload]
    );

    // TODO: Trigger investigation workflow if severity is high

    return this.mapSignalRow(result.rows[0]);
  }

  async createInvestigation(input: Omit<InvestigationCase, 'id' | 'createdAt' | 'updatedAt' | 'status'>, actorId: string): Promise<InvestigationCase> {
    const pool = getPostgresPool();
    const id = randomUUID();
    const result = await pool.write(
      `INSERT INTO investigation_cases (
        id, tenant_id, title, status, severity, assigned_to
      ) VALUES ($1, $2, $3, 'open', $4, $5)
      RETURNING *`,
      [id, input.tenantId, input.title, input.severity, input.assignedTo]
    );

    await provenanceLedger.appendEntry({
        action: 'INVESTIGATION_OPENED',
        actor: { id: actorId, role: 'system' },
        metadata: { caseId: id },
        artifacts: []
    });

    return this.mapCaseRow(result.rows[0]);
  }

  async applyHold(input: Omit<HoldAction, 'id' | 'status' | 'releasedBy' | 'releasedAt' | 'createdAt'>, actorId: string): Promise<HoldAction> {
    const pool = getPostgresPool();
    const id = randomUUID();
    const result = await pool.write(
      `INSERT INTO hold_actions (
        id, target_type, target_id, reason, status, applied_by, investigation_id
      ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
      RETURNING *`,
      [id, input.targetType, input.targetId, input.reason, actorId, input.investigationId]
    );

    await provenanceLedger.appendEntry({
        action: 'HOLD_APPLIED',
        actor: { id: actorId, role: 'admin' },
        metadata: { holdId: id, targetType: input.targetType, targetId: input.targetId },
        artifacts: []
    });

    return this.mapHoldRow(result.rows[0]);
  }

  async isHoldActive(targetType: string, targetId: string): Promise<boolean> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT 1 FROM hold_actions
       WHERE target_type = $1 AND target_id = $2 AND status = 'active'
       LIMIT 1`,
      [targetType, targetId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapSignalRow(row: any): FraudSignal {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      signalType: row.signal_type,
      severity: row.severity,
      source: row.source,
      payload: row.payload,
      detectedAt: row.detected_at,
      investigationId: row.investigation_id
    };
  }

  private mapCaseRow(row: any): InvestigationCase {
      return {
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          status: row.status,
          severity: row.severity,
          assignedTo: row.assigned_to,
          resolutionNotes: row.resolution_notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at
      };
  }

  private mapHoldRow(row: any): HoldAction {
      return {
          id: row.id,
          targetType: row.target_type,
          targetId: row.target_id,
          reason: row.reason,
          status: row.status,
          appliedBy: row.applied_by,
          releasedBy: row.released_by,
          releasedAt: row.released_at,
          investigationId: row.investigation_id,
          createdAt: row.created_at
      };
  }
}

export const fraudService = FraudService.getInstance();
