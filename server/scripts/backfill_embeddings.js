#!/usr/bin/env node
/*
 * Backfill embeddings from Neo4j into Postgres entity_embeddings using EmbeddingService
 *
 * Usage:
 *   node scripts/backfill_embeddings.js [--investigationId <id>] [--sinceIso <iso>]
 *       [--batch 100] [--limit 10000] [--model text-embedding-3-small] [--dimension 384]
 *
 * Respects env vars:
 *   EMBEDDING_MODEL, EMBEDDING_DIMENSION, EMBEDDING_BATCH_SIZE
 */

const {
  connectNeo4j,
  connectPostgres,
  getNeo4jDriver,
  getPostgresPool,
} = require('../src/config/database');
const EmbeddingService = require('../src/services/EmbeddingService');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { batch: Number(process.env.EMBEDDING_BATCH_SIZE) || 50 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--investigationId' || a === '-i')
      opts.investigationId = args[++i];
    else if (a === '--sinceIso' || a === '-s') opts.sinceIso = args[++i];
    else if (a === '--batch' || a === '-b') opts.batch = Number(args[++i]);
    else if (a === '--limit' || a === '-l') opts.limit = Number(args[++i]);
    else if (a === '--model' || a === '-m') opts.model = args[++i];
    else if (a === '--dimension' || a === '-d')
      opts.dimension = Number(args[++i]);
  }
  return opts;
}

function arrayToVectorLiteral(arr) {
  return (
    '[' +
    arr.map((x) => (typeof x === 'number' ? x : Number(x) || 0)).join(',') +
    ']'
  );
}

async function adjustDimensionIfNeeded(pg, dim) {
  if (!dim) return;
  try {
    await pg.query(
      `ALTER TABLE entity_embeddings ALTER COLUMN embedding TYPE vector(${dim})`,
    );
  } catch (_) {}
}

async function fetchIdsMissingEmbeddings(pg, ids) {
  if (!ids.length) return ids;
  const { rows } = await pg.query(
    'SELECT entity_id FROM entity_embeddings WHERE entity_id = ANY($1::text[])',
    [ids],
  );
  const have = new Set(rows.map((r) => r.entity_id));
  return ids.filter((id) => !have.has(id));
}

async function upsertEmbeddings(pg, pairs, model) {
  if (!pairs.length) return 0;
  const values = [];
  const placeholders = [];
  for (let i = 0; i < pairs.length; i++) {
    const { id, embedding } = pairs[i];
    values.push(id, arrayToVectorLiteral(embedding), model);
    const base = i * 3;
    placeholders.push(`($${base + 1}, $${base + 2}::vector, $${base + 3})`);
  }
  const sql = `INSERT INTO entity_embeddings (entity_id, embedding, model)
               VALUES ${placeholders.join(',')}
               ON CONFLICT (entity_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, updated_at = NOW()`;
  await pg.query(sql, values);
  return pairs.length;
}

(async () => {
  const opts = parseArgs();
  let processed = 0;
  try {
    await connectNeo4j();
    await connectPostgres();
    const neo4j = getNeo4jDriver();
    const pg = getPostgresPool();

    const model =
      opts.model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    const dimension =
      opts.dimension || Number(process.env.EMBEDDING_DIMENSION) || 384;
    const batch = Math.max(1, opts.batch || 50);
    const limit = Math.max(batch, opts.limit || 10000);

    await adjustDimensionIfNeeded(pg, dimension);

    const embedder = new EmbeddingService({ model });
    const session = neo4j.session();
    try {
      const where = [];
      const params = {};
      let match = 'MATCH (e:Entity)';
      if (opts.investigationId) {
        match = 'MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $inv})';
        params.inv = opts.investigationId;
      }
      if (opts.sinceIso) {
        where.push('e.createdAt >= datetime($sinceIso)');
        params.sinceIso = opts.sinceIso;
      }
      const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const q = `${match}${whereClause}
                RETURN e.id as id, e.label as label, e.description as description, e.properties as properties
                LIMIT $limit`;
      params.limit = limit;
      const r = await session.run(q, params);
      const all = r.records.map((rec) => ({
        id: rec.get('id'),
        text: `${rec.get('label') || ''} ${rec.get('description') || ''} ${JSON.stringify(rec.get('properties') || {})}`.trim(),
      }));

      // Filter to missing
      const missing = await fetchIdsMissingEmbeddings(
        pg,
        all.map((x) => x.id),
      );
      const map = new Map(all.map((x) => [x.id, x.text]));
      let idx = 0;
      while (idx < missing.length) {
        const slice = missing.slice(idx, idx + batch);
        const texts = slice.map((id) => map.get(id) || '');
        const embs = await embedder.generateEmbeddings(texts, model);
        const pairs = slice.map((id, i) => ({ id, embedding: embs[i] }));
        processed += await upsertEmbeddings(pg, pairs, model);
        idx += batch;
        if (processed % (batch * 10) === 0) {
          console.log(`Backfill progress: ${processed}/${missing.length}`);
        }
      }
    } finally {
      await session.close();
    }
    console.log(`✅ Backfill completed. Wrote ${processed} embeddings.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Backfill failed:', e.message);
    process.exit(1);
  }
})();
