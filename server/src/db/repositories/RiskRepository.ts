import { PoolClient } from 'pg';
import { BaseRepository } from './base/BaseRepository.js';
import { RiskScore, RiskSignal, RiskScoreInput } from '../../types/risk.js';

export class RiskRepository extends BaseRepository<RiskScore> {
  protected readonly tableName = 'risk_scores';

  protected mapRow(row: any): RiskScore {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityId: row.entity_id,
      entityType: row.entity_type,
      overallScore: row.overall_score,
      calculatedAt: row.calculated_at,
      version: row.version
    };
  }

  private mapSignal(row: any): RiskSignal {
    return {
      id: row.id,
      type: row.type,
      source: row.source,
      value: row.value,
      weight: row.weight,
      contributionScore: row.contribution_score,
      description: row.description,
      detectedAt: row.detected_at
    };
  }

  async saveRiskScore(input: RiskScoreInput, txClient?: PoolClient): Promise<RiskScore> {
    return this.withTransaction(async (tx) => {
      // 1. Upsert Risk Score
      const scoreRows = await tx.query(
        `INSERT INTO risk_scores (tenant_id, entity_id, entity_type, overall_score, version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, entity_id, entity_type)
         DO UPDATE SET
           overall_score = EXCLUDED.overall_score,
           calculated_at = CURRENT_TIMESTAMP,
           version = EXCLUDED.version
         RETURNING *`,
        [input.tenantId, input.entityId, input.entityType, input.overallScore, input.version]
      );

      const savedScore = scoreRows[0];
      const savedSignals: RiskSignal[] = [];

      // 2. Insert Risk Signals (Optimized with Batched Inserts and Chunking)
      if (input.signals && input.signals.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < input.signals.length; i += chunkSize) {
          const chunk = input.signals.slice(i, i + chunkSize);
          const values: any[] = [];
          const placeholders: string[] = [];
          let paramIndex = 1;

          for (const sig of chunk) {
            values.push(
              savedScore.id,
              sig.type,
              sig.source,
              sig.value,
              sig.weight,
              sig.contributionScore,
              sig.description,
              sig.detectedAt || new Date()
            );
            placeholders.push(
              `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
            );
            paramIndex += 8;
          }

          const batchSql = `
            INSERT INTO risk_signals (
              risk_score_id, type, source, value, weight, contribution_score, description, detected_at
            ) VALUES ${placeholders.join(', ')}
            RETURNING *
          `;

          const sigRows = await tx.query(batchSql, values);
          for (const row of sigRows) {
            savedSignals.push(this.mapSignal(row));
          }
        }
      }

      return {
        ...this.mapRow(savedScore),
        signals: savedSignals
      };
    }, txClient);
  }

  async getRiskScore(tenantId: string, entityId: string, entityType: string): Promise<RiskScore | null> {
    return this.withTransaction(async (tx) => {
      const scoreRows = await tx.query(
        `SELECT * FROM risk_scores WHERE tenant_id = $1 AND entity_id = $2 AND entity_type = $3`,
        [tenantId, entityId, entityType]
      );

      if (scoreRows.length === 0) return null;

      const sigRows = await tx.query(
        `SELECT * FROM risk_signals WHERE risk_score_id = $1 ORDER BY detected_at DESC`,
        [scoreRows[0].id]
      );

      return {
        ...this.mapRow(scoreRows[0]),
        signals: sigRows.map(this.mapSignal)
      };
    });
  }
}
