import { Pool, PoolClient } from 'pg';
import { pool } from '../pg';

export interface RiskScore {
  id?: string;
  target_id: string;
  target_type: string;
  score: number;
  level: string;
  metadata: any;
  created_at?: Date;
}

export interface RiskSignal {
  id?: string;
  risk_score_id?: string;
  signal_type: string;
  severity: string;
  description: string;
  metadata: any;
}

export class RiskRepository {
  private db: Pool;

  constructor(db: Pool = pool) {
    this.db = db;
  }

  async saveRiskScore(score: RiskScore, signals: RiskSignal[]): Promise<string> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const scoreQuery = `
        INSERT INTO risk_scores (target_id, target_type, score, level, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const scoreResult = await client.query(scoreQuery, [
        score.target_id,
        score.target_type,
        score.score,
        score.level,
        score.metadata
      ]);

      const riskScoreId = scoreResult.rows[0].id;

      if (signals.length > 0) {
        // OPTIMIZATION: Use batched multi-row INSERT for risk signals
        // This reduces database round-trips from O(N) to O(N/ChunkSize).
        // Chunk size 100 avoids hitting PostgreSQL parameter limits (65,535).
        const CHUNK_SIZE = 100;
        for (let i = 0; i < signals.length; i += CHUNK_SIZE) {
          const chunk = signals.slice(i, i + CHUNK_SIZE);
          const values: any[] = [];
          const placeholders: string[] = [];

          chunk.forEach((signal, index) => {
            const offset = index * 5;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
            values.push(
              riskScoreId,
              signal.signal_type,
              signal.severity,
              signal.description,
              signal.metadata
            );
          });

          const signalQuery = `
            INSERT INTO risk_signals (risk_score_id, signal_type, severity, description, metadata)
            VALUES ${placeholders.join(', ')}
          `;
          await client.query(signalQuery, values);
        }
      }

      await client.query('COMMIT');
      return riskScoreId;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getRiskScoresByTarget(targetId: string, targetType: string): Promise<any[]> {
    const query = `
      SELECT rs.*,
             COALESCE(json_agg(sig.*) FILTER (WHERE sig.id IS NOT NULL), '[]') as signals
      FROM risk_scores rs
      LEFT JOIN risk_signals sig ON rs.id = sig.risk_score_id
      WHERE rs.target_id = $1 AND rs.target_type = $2
      GROUP BY rs.id
      ORDER BY rs.created_at DESC
    `;
    const result = await this.db.query(query, [targetId, targetType]);
    return result.rows;
  }
}
