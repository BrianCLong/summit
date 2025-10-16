import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function embedUpsert(ctx: any, step: any) {
  const items: { id: string; vec: number[]; type: string; meta: any }[] =
    await produceEmbeddings(step.inputs);
  const client = await pg.connect();
  try {
    await client.query('BEGIN');
    for (const it of items) {
      await client.query(
        `INSERT INTO embeddings(tenant, entity_id, entity_type, version, vec, meta)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant, entity_id) DO UPDATE SET version=EXCLUDED.version, vec=EXCLUDED.vec, meta=EXCLUDED.meta, updated_at=now()`,
        [ctx.tenant, it.id, it.type, step.inputs.model, it.vec, it.meta || {}],
      );
    }
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

async function produceEmbeddings(_inputs: any) {
  // TODO: call Python/HTTP embedding generator; placeholder
  return [] as any[];
}
