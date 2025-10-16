import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyCosign(_uri: string) {
  // TODO: implement cosign verification of OCI/S3 reference
  return false;
}

export async function registerModel(input: any, actor: string) {
  if (!(await verifyCosign(input.uri))) throw new Error('unsigned model');
  const {
    rows: [m],
  } = await pg.query(
    `INSERT INTO model_registry(name,version,type,uri,signature,metrics,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, name, version, type, uri, metrics, created_by AS "createdBy", created_at AS "createdAt"`,
    [
      input.name,
      input.version,
      input.type,
      input.uri,
      input.signature,
      input.metrics,
      actor,
    ],
  );
  return m;
}

export async function knn(tenant: string, entityId: string, k: number) {
  const {
    rows: [cur],
  } = await pg.query(
    `SELECT vec, version FROM embeddings WHERE tenant=$1 AND entity_id=$2 ORDER BY updated_at DESC LIMIT 1`,
    [tenant, entityId],
  );
  if (!cur) return [];
  const { rows } = await pg.query(
    `SELECT entity_id, 1 - (embeddings.vec <=> $1::vector) AS score, meta
     FROM embeddings WHERE tenant=$2 AND entity_id <> $3
     ORDER BY embeddings.vec <=> $1::vector ASC LIMIT $4`,
    [cur.vec, tenant, entityId, k],
  );
  return rows.map((r: any) => ({
    entityId: r.entity_id,
    score: Number(r.score),
    meta: r.meta,
  }));
}
