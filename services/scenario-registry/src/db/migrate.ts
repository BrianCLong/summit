/**
 * Database migration script for scenario registry
 *
 * Run with: node dist/db/migrate.js
 */

import { getDbClient, closeDbClient } from './client.js';
import { pino } from 'pino';

const logger = pino({ name: 'scenario-registry:migrate' });

/**
 * SQL for creating the eval_scenarios table
 */
const CREATE_SCENARIOS_TABLE = `
CREATE TABLE IF NOT EXISTS eval_scenarios (
  id VARCHAR(255) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  tags TEXT[],
  inputs JSONB NOT NULL,
  constraints JSONB,
  expected_outputs JSONB,
  scoring_strategy JSONB NOT NULL,
  rubric JSONB,
  difficulty VARCHAR(50),
  estimated_cost DECIMAL(10,4),
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
`;

/**
 * SQL for creating indexes
 */
const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_scenarios_type ON eval_scenarios(type);',
  'CREATE INDEX IF NOT EXISTS idx_scenarios_tags ON eval_scenarios USING GIN(tags);',
  'CREATE INDEX IF NOT EXISTS idx_scenarios_difficulty ON eval_scenarios(difficulty);',
  'CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON eval_scenarios(created_at DESC);',
];

/**
 * SQL for creating the updated_at trigger
 */
const CREATE_UPDATED_AT_TRIGGER = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_scenarios_updated_at ON eval_scenarios;

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON eval_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Run all migrations
 */
async function migrate() {
  const db = getDbClient();

  try {
    logger.info('Starting database migration...');

    // Create scenarios table
    logger.info('Creating eval_scenarios table...');
    await db.query(CREATE_SCENARIOS_TABLE);

    // Create indexes
    logger.info('Creating indexes...');
    for (const indexSql of CREATE_INDEXES) {
      await db.query(indexSql);
    }

    // Create trigger
    logger.info('Creating updated_at trigger...');
    await db.query(CREATE_UPDATED_AT_TRIGGER);

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    throw err;
  } finally {
    await closeDbClient();
  }
}

/**
 * Run migration if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Migration script failed');
      process.exit(1);
    });
}

export { migrate };
