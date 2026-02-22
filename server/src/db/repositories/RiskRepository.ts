import { pool } from '../pg.js';

export interface RiskSignal {
  id?: string;
  score_id?: string;
  signal_type: string;
  value: number;
  weight: number;
  metadata?: any;
  created_at?: Date;
}

export interface RiskScore {
  id?: string;
  entity_id: string;
  entity_type: string;
  score: number;
  level: string;
  signals: RiskSignal[];
  created_at?: Date;
}

export class RiskRepository {
  /**
   * Saves a risk score and its associated signals to the database.
   * Uses batching for signals to minimize database round-trips.
   *
   * @performance Optimized to use multi-row INSERT for risk signals.
   * Reduces database round-trips from N to 1 per batch (chunk size 100).
   */
  async saveRiskScore(riskScore: RiskScore): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const scoreResult = await client.query(
        `INSERT INTO risk_scores (entity_id, entity_type, score, level)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [riskScore.entity_id, riskScore.entity_type, riskScore.score, riskScore.level]
      );

      const scoreId = scoreResult.rows[0].id;

      if (riskScore.signals && riskScore.signals.length > 0) {
        // Chunk signals into batches of 100 to avoid overly large queries
        const chunkSize = 100;
        for (let i = 0; i < riskScore.signals.length; i += chunkSize) {
          const chunk = riskScore.signals.slice(i, i + chunkSize);

          const values: any[] = [];
          const placeholders: string[] = [];

          chunk.forEach((signal, index) => {
            const base = index * 5;
            // Placeholders: ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10) ...
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
            values.push(scoreId, signal.signal_type, signal.value, signal.weight, signal.metadata);
          });

          const queryText = `INSERT INTO risk_signals (score_id, signal_type, value, weight, metadata) VALUES ${placeholders.join(', ')}`;
          await client.query(queryText, values);
        }
      }

      await client.query('COMMIT');
      return scoreId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLatestRiskScore(entityId: string, entityType: string): Promise<RiskScore | null> {
    const scoreResult = await pool.query(
      `SELECT * FROM risk_scores
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [entityId, entityType]
    );

    if (scoreResult.rows.length === 0) {
      return null;
    }

    const score = scoreResult.rows[0];
    const signalsResult = await pool.query(
      'SELECT * FROM risk_signals WHERE score_id = $1',
      [score.id]
    );

    return {
      ...score,
      signals: signalsResult.rows
    };
  }
}

export const riskRepository = new RiskRepository();
