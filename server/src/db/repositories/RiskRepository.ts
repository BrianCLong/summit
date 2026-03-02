import { pg } from '../../db/pg.js';
import { RiskScore, RiskSignal, RiskScoreInput } from '../../risk/types.js';

/**
 * Repository for managing Risk Scores and Signals in PostgreSQL.
 * Follows the Epic 2 Data Model schema.
 */
export class RiskRepository {
  /**
   * Persists a risk score and its associated signals.
   * This is transactional.
   */
  async saveRiskScore(input: RiskScoreInput): Promise<RiskScore> {
    return await pg.transaction(async (tx: any) => {
      // 1. Insert Risk Score
      const scoreRows = await tx.query(
        `INSERT INTO risk_scores (
          tenant_id, entity_id, entity_type, score, level, window, model_version, rationale
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.tenantId,
          input.entityId,
          input.entityType,
          input.score,
          input.level,
          input.window,
          input.modelVersion,
          input.rationale,
        ]
      );

      const savedScore = scoreRows[0];
      const savedSignals: RiskSignal[] = [];

      // 2. Insert Risk Signals
      // ⚡ Bolt Optimization: Batched Inserts
      // What: Replaced row-by-row inserts with multi-row batched inserts chunked by 100.
      // Why: Row-by-row inserts in a loop cause an N+1 query problem, severely blocking the
      //      database connection pool and increasing latency due to multiple network round-trips.
      // Impact: Reduces DB round-trips from N (where N = number of signals) to ceil(N / 100),
      //         drastically improving insertion speed and reducing transaction duration.
      if (input.signals && input.signals.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < input.signals.length; i += CHUNK_SIZE) {
          const chunk = input.signals.slice(i, i + CHUNK_SIZE);

          const values = [];
          const params = [];
          let paramIndex = 1;

          for (const sig of chunk) {
            values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            params.push(
              savedScore.id,
              sig.type,
              sig.source,
              sig.value,
              sig.weight,
              sig.contributionScore,
              sig.description,
              sig.detectedAt || new Date()
            );
          }

          // Execute the batched insert
          const sigRows = await tx.query(
            `INSERT INTO risk_signals (
              risk_score_id, type, source, value, weight, contribution_score, description, detected_at
            ) VALUES ${values.join(', ')}
            RETURNING *`,
            params
          );

          for (const row of sigRows) {
            savedSignals.push(this.mapSignal(row));
          }
        }
      }

      return {
        ...this.mapScore(savedScore),
        // Note: signals are not part of RiskScore interface but usually returned in a full object
        // For strict typing we return the RiskScore entity
      };
    });
  }

  /**
   * Retrieves the latest risk score for an entity within a specific window.
   */
  async getLatestScore(
    tenantId: string,
    entityId: string,
    window: string
  ): Promise<RiskScore | null> {
    const row = await pg.oneOrNone(
      `SELECT * FROM risk_scores
       WHERE tenant_id = $1 AND entity_id = $2 AND window = $3
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, entityId, window],
      { tenantId } // For RLS if applicable or logging
    );
    return row ? this.mapScore(row) : null;
  }

  /**
   * Retrieves signals associated with a specific risk score ID.
   */
  async getSignalsForScore(riskScoreId: string): Promise<RiskSignal[]> {
    const rows = await pg.readMany(
      `SELECT * FROM risk_signals WHERE risk_score_id = $1`,
      [riskScoreId]
    );
    return rows.map(this.mapSignal);
  }

  private mapScore(row: any): RiskScore {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityId: row.entity_id,
      entityType: row.entity_type,
      score: parseFloat(row.score),
      level: row.level,
      window: row.window,
      modelVersion: row.model_version,
      rationale: row.rationale,
      createdAt: row.created_at,
      validUntil: row.valid_until,
    };
  }

  private mapSignal(row: any): RiskSignal {
    return {
      id: row.id,
      riskScoreId: row.risk_score_id,
      type: row.type,
      source: row.source,
      value: parseFloat(row.value),
      weight: parseFloat(row.weight),
      contributionScore: parseFloat(row.contribution_score),
      description: row.description,
      detectedAt: row.detected_at,
    };
  }
}
