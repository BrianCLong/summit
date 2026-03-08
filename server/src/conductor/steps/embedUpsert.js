"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedUpsert = embedUpsert;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function embedUpsert(ctx, step) {
    const items = await produceEmbeddings(step.inputs);
    const client = await pg.connect();
    try {
        await client.query('BEGIN');
        for (const it of items) {
            await client.query(`INSERT INTO embeddings(tenant, entity_id, entity_type, version, vec, meta)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant, entity_id) DO UPDATE SET version=EXCLUDED.version, vec=EXCLUDED.vec, meta=EXCLUDED.meta, updated_at=now()`, [ctx.tenant, it.id, it.type, step.inputs.model, it.vec, it.meta || {}]);
        }
        await client.query('COMMIT');
    }
    finally {
        client.release();
    }
}
async function produceEmbeddings(_inputs) {
    // TODO: call Python/HTTP embedding generator; placeholder
    return [];
}
