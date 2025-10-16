import { getPostgresPool } from '../postgres';
import baseLogger from '../../config/logger';

const logger = baseLogger.child({ name: 'pipelines-repo' });

async function ensureTable() {
  const pool = getPostgresPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_defs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nodes JSONB NOT NULL,
        edges JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e) {
    logger.warn({ err: e }, 'ensure pipeline_defs failed (mock mode?)');
  }
}

export async function savePipelineDef(
  id: string,
  name: string,
  nodes: any[],
  edges: any[],
) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    await pool.query(
      `INSERT INTO pipeline_defs (id, name, nodes, edges)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, nodes=EXCLUDED.nodes, edges=EXCLUDED.edges, updated_at=NOW()`,
      [id, name, JSON.stringify(nodes), JSON.stringify(edges)],
    );
    return { ok: true };
  } catch (e) {
    logger.warn({ err: e }, 'savePipelineDef failed');
    return { ok: false };
  }
}

export async function getPipelineDef(id: string) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    const res = await pool.query(
      `SELECT id, name, nodes, edges, updated_at FROM pipeline_defs WHERE id=$1`,
      [id],
    );
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      nodes: r.nodes,
      edges: r.edges,
      updated_at: r.updated_at,
    };
  } catch (e) {
    logger.warn({ err: e }, 'getPipelineDef failed');
    return null;
  }
}
