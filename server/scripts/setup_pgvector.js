#!/usr/bin/env node
/*
 * Setup script for pgvector + entity_embeddings
 * Usage: node scripts/setup_pgvector.js
 */

const { getPostgresPool, connectPostgres } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    if (!getPostgresPool) {
      await connectPostgres();
    }
    const pool = getPostgresPool();
    const sql = fs.readFileSync(
      path.join(__dirname, 'sql', 'pgvector.sql'),
      'utf8',
    );
    await pool.query(sql);
    console.log('✅ pgvector setup completed');
    process.exit(0);
  } catch (e) {
    console.error('❌ pgvector setup failed:', e.message);
    process.exit(1);
  }
})();
