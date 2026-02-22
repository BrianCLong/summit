
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import logger from '../utils/logger.js';

async function verifyPostgresIndexes() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'embedding_records' AND indexname = 'idx_embedding_records_vector_hnsw';
    `);

    if (res.rows.length > 0) {
      console.log('✅ Postgres HNSW index verified:', res.rows[0].indexname);
    } else {
      console.error('❌ Postgres HNSW index MISSING: idx_embedding_records_vector_hnsw');
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function verifyNeo4jIndexes() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password')
  );
  const session = driver.session();
  try {
    const res = await session.run('SHOW INDEXES');
    const indexes = res.records.map(r => r.get('name'));

    const required = ['entity_investigation_id_index', 'entity_fulltext_idx'];
    let allFound = true;

    for (const req of required) {
      if (indexes.includes(req)) {
        console.log(`✅ Neo4j index verified: ${req}`);
      } else {
        console.error(`❌ Neo4j index MISSING: ${req}`);
        allFound = false;
      }
    }

    if (!allFound) process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

async function run() {
  console.log('Starting index verification...');
  try {
    await verifyPostgresIndexes();
    await verifyNeo4jIndexes();
    console.log('All required indexes verified successfully.');
  } catch (err) {
    console.error('Index verification failed:', err);
    process.exit(1);
  }
}

run();
