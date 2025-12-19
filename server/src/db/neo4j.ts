import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';
import neo4j, { Driver, Session } from 'neo4j-driver';
import * as dotenv from 'dotenv';
// @ts-ignore
import { default as pino } from 'pino';

import {
  dbPoolAcquisitionLatency,
  dbPoolSize,
  dbPoolUsage,
  dbPoolWaiting
} from '../metrics/dbMetrics.js';
import {
  neo4jConnectivityUp,
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from '../metrics/neo4jMetrics.js';

dotenv.config();

// @ts-ignore
const logger: any = pino();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

const REQUIRE_REAL_DBS = process.env.REQUIRE_REAL_DBS === 'true';

const MAX_CONNECTION_POOL_SIZE = parseInt(process.env.NEO4J_MAX_CONNECTION_POOL_SIZE || '50', 10);
const CONNECTION_TIMEOUT_MS = parseInt(process.env.NEO4J_CONNECTION_TIMEOUT_MS || '30000', 10);
const ACQUISITION_TIMEOUT_MS = parseInt(process.env.NEO4J_POOL_ACQUISITION_TIMEOUT_MS || '5000', 10);

let realDriver: Driver | null = null;
let initializationPromise: Promise<void> | null = null;
let isMockMode = true;

export async function initializeNeo4jDriver(): Promise<void> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      logger.info('Initializing Neo4j driver...');
      realDriver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
        {
          maxConnectionPoolSize: MAX_CONNECTION_POOL_SIZE,
          connectionTimeout: CONNECTION_TIMEOUT_MS,
          connectionAcquisitionTimeout: ACQUISITION_TIMEOUT_MS,
        }
      );

      await realDriver.verifyConnectivity();
      isMockMode = false;
      logger.info('Neo4j driver initialized successfully.');
      neo4jConnectivityUp.set(1);
    } catch (error) {
      neo4jConnectivityUp.set(0);
      if (REQUIRE_REAL_DBS) {
        logger.error('Neo4j connectivity required but failed.', error);
        throw error;
      } else {
        logger.warn('Neo4j connection failed, falling back to mock mode.', error);
        isMockMode = true;
      }
    }
  })();

  return initializationPromise;
}

export function getNeo4jDriver(): Driver {
  if (!realDriver && !isMockMode) {
    throw new Error('Neo4j driver not initialized. Call initializeNeo4jDriver() first.');
  }
  return realDriver as Driver;
}

export function isNeo4jMockMode(): boolean {
  return isMockMode;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (realDriver) {
    await realDriver.close();
    realDriver = null;
    initializationPromise = null;
    isMockMode = true;
    logger.info('Neo4j driver closed.');
  }
}
