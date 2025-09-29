#!/usr/bin/env node
/*
 * Adjust pgvector column dimension for entity_embeddings.embedding
 * Usage: node scripts/adjust_pgvector_dimension.js --dimension 768
 * Also respects EMBEDDING_DIMENSION env var.
 */
const { connectPostgres, getPostgresPool } = require('../src/config/database');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dimension' || a === '-d') {
      opts.dimension = Number(args[++i]);
    }
  }
  if (!opts.dimension && process.env.EMBEDDING_DIMENSION) {
    opts.dimension = Number(process.env.EMBEDDING_DIMENSION);
  }
  if (!opts.dimension || Number.isNaN(opts.dimension)) {
    console.error('Provide --dimension <int> or set EMBEDDING_DIMENSION');
    process.exit(2);
  }
  return opts;
}

(async () => {
  try {
    await connectPostgres();
    const pg = getPostgresPool();
    const { dimension } = parseArgs();
    // Check current type
    const q = `SELECT atttypmod FROM pg_attribute JOIN pg_class ON pg_class.oid = attrelid 
               WHERE relname = 'entity_embeddings' AND attname = 'embedding'`;
    const { rows } = await pg.query(q);
    // For vector, atttypmod = 4 + 4 * dims (impl detail); we’ll just attempt alter unconditionally.
    await pg.query(`ALTER TABLE entity_embeddings ALTER COLUMN embedding TYPE vector(${dimension})`);
    console.log(`✅ Adjusted entity_embeddings.embedding to vector(${dimension})`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Adjust dimension failed:', e.message);
    process.exit(1);
  }
})();

