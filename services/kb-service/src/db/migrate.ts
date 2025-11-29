/**
 * Database Migration Runner
 * Applies schema to PostgreSQL database
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  console.log('Starting KB database migration...');

  const pool = getPool();

  try {
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schema);

    console.log('KB database migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run if executed directly
migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
