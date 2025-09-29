import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

function computeDiff(before: any = {}, after: any = {}) {
  const diff: any = {};
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  for (const key of keys) {
    const b = before?.[key];
    const a = after?.[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diff[key] = { before: b, after: a };
    }
  }
  return diff;
}

export class EntityRevisionRepo {
  constructor(private pool: Pool) {}

  async record(entityId: string, before: any, after: any, actorId?: string) {
    const { rows } = await this.pool.query(
      "SELECT COALESCE(MAX(version),0)+1 AS v FROM entity_revisions WHERE entity_id=$1",
      [entityId],
    );
    const version = rows[0]?.v || 1;
    const diff = computeDiff(before, after);
    await this.pool.query(
      `INSERT INTO entity_revisions (id, entity_id, version, state, diff, actor_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), entityId, version, after, diff, actorId || null],
    );
    return version;
  }

  async list(entityId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM entity_revisions WHERE entity_id=$1 ORDER BY version DESC`,
      [entityId],
    );
    return rows;
  }

  async find(revisionId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM entity_revisions WHERE id=$1`,
      [revisionId],
    );
    return rows[0] || null;
  }
}
