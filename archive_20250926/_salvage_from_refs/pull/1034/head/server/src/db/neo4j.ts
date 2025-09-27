import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

let driver: neo4j.Driver;

export function getNeo4jDriver(): neo4j.Driver {
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    logger.info('Neo4j driver initialized.');
  }
  return driver;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info('Neo4j driver closed.');
    driver = null; // Clear the driver instance
  }
}