import { getDriver } from './neo4j.js';

/**
 * Ensures all indexes and constraints exist for the IntelGraph schema.
 */
export async function ensureGraphSchema() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const commands = [
      // Indexes for Core Nodes
      'CREATE CONSTRAINT IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.globalId IS UNIQUE',
      'CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.tenantId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.entityType)',
      'CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.globalId)',

      // Type-specific indexes
      'CREATE INDEX IF NOT EXISTS FOR (n:Actor) ON (n.globalId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:Organization) ON (n.globalId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:Asset) ON (n.globalId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:Document) ON (n.globalId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:Run) ON (n.globalId)',
      'CREATE INDEX IF NOT EXISTS FOR (n:Task) ON (n.globalId)',

      // Time-travel indexes
      'CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.validFrom)',
      'CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.validTo)',

      // Vector Index (if we were using GDS/Vector features, placeholder)
      // 'CREATE VECTOR INDEX ...'
    ];

    console.log('Applying Graph Schema Constraints...');
    for (const cmd of commands) {
      await session.run(cmd);
    }
    console.log('Graph Schema Applied.');

  } catch (error) {
    console.error('Failed to apply graph schema:', error);
    throw error;
  } finally {
    await session.close();
  }
}
