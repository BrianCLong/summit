import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

let driver: neo4j.Driver;

let isMockMode = false;

export function getNeo4jDriver(): neo4j.Driver {
  if (!driver) {
    try {
      driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
      logger.info('Neo4j driver initialized.');
      
      // Test the connection asynchronously
      driver.verifyConnectivity().catch(() => {
        logger.warn('Neo4j connection failed - switching to mock mode');
        isMockMode = true;
      });
      
    } catch (error) {
      logger.warn('Neo4j connection failed - using development mode with mock responses', { error: (error as Error).message });
      driver = createMockNeo4jDriver();
      isMockMode = true;
    }
  }
  return driver;
}

export function isNeo4jMockMode(): boolean {
  return isMockMode;
}

function createMockNeo4jDriver(): neo4j.Driver {
  return {
    session: () => ({
      run: async (cypher: string, params?: any) => {
        logger.debug('Mock Neo4j query:', { cypher, params });
        return {
          records: [],
          summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } }
        };
      },
      close: async () => {},
      readTransaction: async (fn: any) => fn({
        run: async () => ({ records: [] })
      }),
      writeTransaction: async (fn: any) => fn({
        run: async () => ({ records: [] })
      })
    }),
    close: async () => {},
    verifyConnectivity: async () => ({})
  } as any;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info('Neo4j driver closed.');
    driver = null; // Clear the driver instance
  }
}