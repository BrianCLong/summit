import { getPostgresPool, closePostgresPool } from '../db/postgres';
import logger from '../config/logger';

async function locateSchema() {
  const pool = getPostgresPool();
  try {
    logger.info('Introspecting Postgres schema for "entities" table...');

    const res = await pool.read(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'entities'
      ORDER BY ordinal_position;
    `);

    if (res.rows.length === 0) {
      console.log('❌ "entities" table not found in the public schema.');
      console.log('It might be in a different schema or not created yet.');
      return;
    }

    console.log('\n✅ "entities" table found. Schema definition:');
    console.table(res.rows);

    // Also check for constraints/keys
    const keys = await pool.read(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'entities';
    `);

    if (keys.rows.length > 0) {
      console.log('\nConstraints:');
      console.table(keys.rows);
    }

  } catch (err) {
    logger.error('Failed to introspect schema', err);
  } finally {
    await closePostgresPool();
  }
}

locateSchema();
