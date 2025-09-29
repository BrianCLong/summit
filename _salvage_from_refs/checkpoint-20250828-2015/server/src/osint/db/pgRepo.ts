import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

export type CanonicalDoc = {
  hash: string;
  title?: string | null;
  summary?: string | null;
  url?: string | null;
  language?: string | null;
  publishedAt?: Date | null;
  license?: any;
  policy?: any;
  provenance?: any[];
  entities?: Array<{ id: string; kind: string; name?: string }>;
  claims?: Array<{ id?: string; text: string; confidence?: number }>;
};

export class OsintPgRepo {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPostgresPool();
  }

  // ensureTables removed; use SQL migrations under server/migrations instead

  async upsertDocument(doc: CanonicalDoc): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO osint_documents(hash,title,summary,url,language,published_at,license,policy,provenance)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (hash) DO UPDATE SET
           title=EXCLUDED.title, summary=EXCLUDED.summary, url=EXCLUDED.url,
           language=EXCLUDED.language, published_at=EXCLUDED.published_at,
           license=EXCLUDED.license, policy=EXCLUDED.policy, provenance=EXCLUDED.provenance,
           updated_at=now()`,
        [
          doc.hash,
          doc.title ?? null,
          doc.summary ?? null,
          doc.url ?? null,
          doc.language ?? null,
          doc.publishedAt ?? null,
          doc.license || {},
          doc.policy || {},
          JSON.stringify(doc.provenance || []),
        ],
      );

      if (doc.entities && doc.entities.length) {
        await client.query('DELETE FROM osint_entities WHERE doc_hash=$1', [doc.hash]);
        for (const e of doc.entities) {
          await client.query(
            `INSERT INTO osint_entities(doc_hash, entity_id, kind, name) VALUES($1,$2,$3,$4)
             ON CONFLICT DO NOTHING`,
            [doc.hash, e.id, e.kind, e.name || null],
          );
        }
      }

      if (doc.claims && doc.claims.length) {
        await client.query('DELETE FROM osint_claims WHERE doc_hash=$1', [doc.hash]);
        for (const c of doc.claims) {
          await client.query(
            `INSERT INTO osint_claims(id, doc_hash, text, confidence)
             VALUES(coalesce($1, gen_random_uuid()), $2, $3, $4)`,
            [c.id || null, doc.hash, c.text, c.confidence ?? null],
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async searchItems({ search, limit = 50, after, sort = 'DATE' as 'DATE'|'RELEVANCE' }: { search?: string; limit?: number; after?: string; sort?: 'DATE'|'RELEVANCE' }) {
    const params: any[] = [];
    let rankExpr = `0`;
    if (search && sort === 'RELEVANCE') {
      // BM25-ish ts_rank + recency decay + ER confidence boost
      rankExpr = `(
        ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')), plainto_tsquery('simple', $1))
        + (1.0 / (1 + EXTRACT(EPOCH FROM (now() - coalesce(published_at, now())))/86400))
        + (CASE WHEN EXISTS (
             SELECT 1 FROM osint_entities e
             JOIN er_suggestions s ON (s.left_id = e.entity_id OR s.right_id = e.entity_id)
             WHERE e.doc_hash = osint_documents.hash AND s.confidence >= 0.9
           ) THEN 0.2 ELSE 0 END)
      )`;
    }
    let sql = `SELECT hash, title, summary, url, language, published_at${sort==='RELEVANCE' && search ? ", ("+rankExpr+") AS score" : ''} FROM osint_documents`;
    const where: string[] = [];
    if (search) {
      params.push(search);
      where.push(
        `to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')) @@ plainto_tsquery('simple', $${params.length})`,
      );
    }
    if (after) {
      params.push(after);
      where.push(`published_at < $${params.length}`);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    if (sort === 'RELEVANCE' && search) sql += ' ORDER BY score DESC NULLS LAST, published_at DESC NULLS LAST';
    else sql += ' ORDER BY published_at DESC NULLS LAST';
    sql += ' LIMIT ' + Number(limit || 50);
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }
}
