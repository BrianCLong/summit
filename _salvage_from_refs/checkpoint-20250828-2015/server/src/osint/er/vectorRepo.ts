import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

export class EntityVectorRepo {
  constructor(private pool: Pool = getPostgresPool()) {}

  async upsert(hash: string, kind: string, text: string, embedding: number[]) {
    const sql = `INSERT INTO entity_vectors(hash, kind, text, embedding, updated_at)
                 VALUES($1,$2,$3,$4, now())
                 ON CONFLICT (hash) DO UPDATE SET kind=EXCLUDED.kind, text=EXCLUDED.text, embedding=EXCLUDED.embedding, updated_at=now()`;
    await this.pool.query(sql, [hash, kind, text, embedding]);
  }

  async nearest(embedding: number[], kind?: string, limit = 10) {
    if (kind) {
      const { rows } = await this.pool.query(
        `SELECT hash, kind, text, 1 - (embedding <#> $1) AS score
         FROM entity_vectors WHERE kind=$2 ORDER BY embedding <#> $1 ASC LIMIT $3`,
        [embedding, kind, limit]
      );
      return rows;
    }
    const { rows } = await this.pool.query(
      `SELECT hash, kind, text, 1 - (embedding <#> $1) AS score
       FROM entity_vectors ORDER BY embedding <#> $1 ASC LIMIT $2`,
      [embedding, limit]
    );
    return rows;
  }
}

