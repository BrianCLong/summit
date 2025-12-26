
import { getNeo4jDriver } from '../db/neo4j.js';
import { logger } from '../config/logger.js';

export const createSampleData = async () => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    logger.info('Seeding sample data for DEMO_MODE...');

    await session.run(`
      MERGE (p:Person {id: 'demo-p1', name: 'John Doe', riskScore: 0.8})
      MERGE (o:Organization {id: 'demo-o1', name: 'Acme Corp', riskScore: 0.2})
      MERGE (p)-[:WORKS_FOR]->(o)
    `);

    logger.info('Sample data seeded successfully.');
  } catch (error) {
    logger.error('Failed to seed sample data', error);
    throw error;
  } finally {
    await session.close();
  }
};
