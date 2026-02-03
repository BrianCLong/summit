import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';
import neo4j, { Driver, Session } from 'neo4j-driver';
import * as dotenv from 'dotenv';
import pino from 'pino';

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
import { neo4jPerformanceMonitor } from './neo4jPerformanceMonitor.js';

dotenv.config();

const logger = (pino as any)();

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

type Neo4jReadyCallback = (event: { reason: string }) => void | Promise<void>;
const readyCallbacks: Neo4jReadyCallback[] = [];

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

      // Notify ready callbacks
      await Promise.all(readyCallbacks.map(cb => cb({ reason: 'driver_initialized' })));
    } catch (error: any) {
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

export function onNeo4jDriverReady(callback: Neo4jReadyCallback): void {
  readyCallbacks.push(callback);
}

// Helper to provide a unified interface like 'neo.session()'
// to avoid importing 'getNeo4jDriver' everywhere and handling nulls manually
export const neo = {
  session: () => {
    if (isMockMode || !realDriver) {
      // Return a dummy session or throw?
      // For now, simple mock if needed or just rely on realDriver if available
      // But typically we should just return realDriver.session() if initialized
      if(realDriver) return realDriver.session();
      // If we are in mock mode but no driver (e.g. tests without init),
      // we might need a better mock strategy.
      // For now, let's assume getNeo4jDriver throws or handles it.
      return getNeo4jDriver().session();
    }
    return realDriver.session();
  },
  run: async (query: string, params?: any) => {
    const session = neo.session();
    try {
      const result = await session.run(query, params);
      return result;
    } finally {
      await session.close();
    }
  }
};

type SessionLike = {
  run: (cypher: string, params?: any, txConfig?: any) => Promise<any>;
};

function inferLabels(cypher: string): { operation: string; label: string } {
  const operation = /\b(create|merge|delete|set)\b/i.test(cypher)
    ? 'write'
    : 'read';
  const labelMatch = cypher.match(/:\s*([A-Za-z0-9_]+)/);
  return {
    operation,
    label: labelMatch?.[1] || 'unlabeled',
  };
}

export function instrumentSession<T extends SessionLike>(session: T): T {
  const run = async (cypher: string, params?: any, txConfig?: any) => {
    const start = Date.now();
    const labels = inferLabels(cypher);
    try {
      const result = await session.run(cypher, params, txConfig);
      neo4jPerformanceMonitor.recordSuccess({
        cypher,
        params,
        durationMs: Date.now() - start,
        labels,
      });
      return result;
    } catch (error: any) {
      neo4jPerformanceMonitor.recordError({
        cypher,
        params,
        durationMs: Date.now() - start,
        labels,
        error: error?.message ?? String(error),
      });
      throw error;
    }
  };

  return { ...session, run } as T;
}

/**
 * Normalizes Neo4j query results by converting Neo4j Integers to standard JS numbers or strings.
 * This implementation is optimized to avoid unnecessary deep cloning when no Neo4j Integers are present.
 *
 * BOLT OPTIMIZATION:
 * - Avoids object/array allocation if no transformation is needed.
 * - Reduces GC pressure and CPU cycles for large result sets.
 * - Handles Neo4j Record-like objects (toObject).
 *
 * @param obj - The object or array to normalize.
 * @returns The normalized object or array.
 */
export function transformNeo4jIntegers(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle Neo4j Integers
  if (neo4j.isInt(obj)) {
    return obj.inSafeRange() ? obj.toNumber() : obj.toString();
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    let newArr: any[] | null = null;
    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      const t = transformNeo4jIntegers(v);
      if (t !== v && !newArr) {
        newArr = obj.slice(0, i);
      }
      if (newArr) {
        newArr.push(t);
      }
    }
    return newArr || obj;
  }

  // Handle Neo4j Record-like objects
  if (typeof obj.toObject === 'function') {
    return transformNeo4jIntegers(obj.toObject());
  }

  // Avoid recursing into common non-plain objects that won't contain Neo4j Integers
  if (obj instanceof Date || obj instanceof RegExp || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))) {
    return obj;
  }

  // Handle Plain Objects
  let newObj: any = null;
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      const t = transformNeo4jIntegers(v);
      if (t !== v && !newObj) {
        newObj = { ...obj };
      }
      if (newObj) {
        newObj[k] = t;
      }
    }
  }
  return newObj || obj;
}
