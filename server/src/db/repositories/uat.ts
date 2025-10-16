import { getPostgresPool } from '../postgres';
import baseLogger from '../../config/logger';

const logger = baseLogger.child({ name: 'uat-repo' });

export type UATCheckpoint = {
  run_id: string;
  checkpoint: string;
  verdict: string;
  evidence_uris?: string[];
  actor?: string | null;
  created_at?: string;
};

async function ensureTable() {
  const pool = getPostgresPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maestro_uat_checkpoints (
        id SERIAL PRIMARY KEY,
        run_id TEXT NOT NULL,
        checkpoint TEXT NOT NULL,
        verdict TEXT NOT NULL,
        evidence_uris JSONB,
        actor TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_uat_run ON maestro_uat_checkpoints(run_id);
    `);
  } catch (e) {
    logger.warn(
      { err: e },
      'ensureTable maestro_uat_checkpoints failed (mock mode?)',
    );
  }
}

export async function addUATCheckpoint(c: UATCheckpoint) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    await pool.query(
      `INSERT INTO maestro_uat_checkpoints (run_id, checkpoint, verdict, evidence_uris, actor)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        c.run_id,
        c.checkpoint,
        c.verdict,
        c.evidence_uris ? JSON.stringify(c.evidence_uris) : null,
        c.actor ?? null,
      ],
    );
    return { ok: true };
  } catch (e) {
    logger.warn({ err: e }, 'addUATCheckpoint failed');
    return { ok: false };
  }
}

export async function listUATCheckpoints(runId: string) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    const res = await pool.query(
      `SELECT run_id, checkpoint, verdict, evidence_uris, actor, created_at
       FROM maestro_uat_checkpoints
       WHERE run_id = $1
       ORDER BY created_at DESC`,
      [runId],
    );
    return res.rows.map((r) => ({
      run_id: r.run_id,
      checkpoint: r.checkpoint,
      verdict: r.verdict,
      evidence_uris: Array.isArray(r.evidence_uris) ? r.evidence_uris : [],
      actor: r.actor,
      created_at: r.created_at,
    }));
  } catch (e) {
    logger.warn({ err: e }, 'listUATCheckpoints failed');
    return [];
  }
}
