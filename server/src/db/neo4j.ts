import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';
import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';
import {
  neo4jConnectivityUp,
} from '../metrics/neo4jMetrics.js';
import GraphIndexAdvisorService from '../services/GraphIndexAdvisorService.js';

dotenv.config();

const logger: ReturnType<typeof pino> = pino();

type Neo4jDriver = neo4j.Driver;
type Neo4jSession = neo4j.Session;

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER =
  process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
const REQUIRE_REAL_DBS = process.env.REQUIRE_REAL_DBS === 'true';
const CONNECTIVITY_CHECK_INTERVAL_MS = Number(
  process.env.NEO4J_HEALTH_INTERVAL_MS || 15000,
);
const MAX_CONNECTION_POOL_SIZE = Number(process.env.NEO4J_MAX_POOL_SIZE || 100);
const CONNECTION_TIMEOUT_MS = Number(process.env.NEO4J_CONNECTION_TIMEOUT_MS || 30000);

// Connection Pool Settings
const POOL_ACQUISITION_TIMEOUT = Number(process.env.NEO4J_POOL_ACQUISITION_TIMEOUT || 30000);

let realDriver: Neo4jDriver | null = null;
let initializationPromise: Promise<void> | null = null;
let connectivityTimer: NodeJS.Timeout | null = null;
let isMockMode = true;

const driverFacade: Neo4jDriver = createDriverFacade();

type DriverReadyReason = 'initial' | 'reconnected';
type DriverReadyEvent = { driver: Neo4jDriver; reason: DriverReadyReason };
type DriverReadyListener = (event: DriverReadyEvent) => void | Promise<void>;

const driverReadyListeners = new Set<DriverReadyListener>();
let hasEmittedReadyEvent = false;

export function onNeo4jDriverReady(
  listener: DriverReadyListener,
): () => void {
  driverReadyListeners.add(listener);

  if (realDriver && !isMockMode) {
    const reason: DriverReadyReason = hasEmittedReadyEvent
      ? 'reconnected'
      : 'initial';
    queueMicrotask(() => {
      void invokeDriverReadyListener(listener, reason);
    });
  }

  return () => {
    driverReadyListeners.delete(listener);
  };
}

ensureInitialization().catch((error) => {
  if (REQUIRE_REAL_DBS) {
    logger.error(
      'Neo4j connectivity required but initialization failed. Exiting.',
      error,
    );
    process.nextTick(() => {
      throw error;
    });
  } else {
    logger.warn(
      `Neo4j connection failed - running in mock mode. Reason: ${(error as Error).message}`,
    );
  }
});

if (CONNECTIVITY_CHECK_INTERVAL_MS > 0) {
  connectivityTimer = setInterval(async () => {
    if (realDriver) {
      try {
        await realDriver.verifyConnectivity();
        neo4jConnectivityUp.set(1);
      } catch (error) {
        logger.warn(
          'Lost Neo4j connectivity - switching to mock mode.',
          error,
        );
        await teardownRealDriver();
        ensureInitialization().catch((err) => {
          if (REQUIRE_REAL_DBS) {
            logger.error(
              'Neo4j reconnection failed while REQUIRE_REAL_DBS=true. Exiting.',
              err,
            );
            process.nextTick(() => {
              throw err;
            });
          } else {
            logger.warn(
              `Neo4j reconnection failed - continuing in mock mode. Reason: ${(err as Error).message}`,
            );
          }
        });
      }
    } else {
      await ensureInitialization();
    }
  }, CONNECTIVITY_CHECK_INTERVAL_MS);

  if (typeof connectivityTimer.unref === 'function') {
    connectivityTimer.unref();
  }
}

export async function initializeNeo4jDriver(): Promise<void> {
  await ensureInitialization();
}

export function getNeo4jDriver(): Neo4jDriver {
  void ensureInitialization();
  return driverFacade;
}

export function isNeo4jMockMode(): boolean {
  return isMockMode;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (connectivityTimer) {
    clearInterval(connectivityTimer);
    connectivityTimer = null;
  }

  await teardownRealDriver();
}

export class Neo4jService {
  constructor(private readonly _driver: Neo4jDriver = getNeo4jDriver()) {}

  getSession(options?: Parameters<Neo4jDriver['session']>[0]) {
    return this._driver.session(options as any);
  }

  async close(): Promise<void> {
    await this._driver.close();
  }

  async verifyConnectivity(): Promise<boolean> {
    try {
      await this._driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }
}

async function ensureInitialization(): Promise<void> {
  if (realDriver || initializationPromise) {
    return initializationPromise ?? Promise.resolve();
  }

  initializationPromise = connectToNeo4j().finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
}

async function connectToNeo4j(): Promise<void> {
  let candidate: Neo4jDriver | null = null;

  try {
    candidate = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: MAX_CONNECTION_POOL_SIZE,
        connectionTimeout: CONNECTION_TIMEOUT_MS,
        connectionAcquisitionTimeout: POOL_ACQUISITION_TIMEOUT,
        logging: {
          level: 'info',
          logger: (level, message) => logger[level === 'warn' ? 'warn' : 'info'](message)
        }
      }
    );

    await candidate.verifyConnectivity();

    realDriver = candidate;
    candidate = null;
    isMockMode = false;
    neo4jConnectivityUp.set(1);
    logger.info(`Neo4j driver initialized with maxConnectionPoolSize=${MAX_CONNECTION_POOL_SIZE}.`);
    await notifyDriverReady(hasEmittedReadyEvent ? 'reconnected' : 'initial');
  } catch (error) {
    if (candidate) {
      await candidate.close().catch(() => {});
    }

    isMockMode = true;
    neo4jConnectivityUp.set(0);

    if (REQUIRE_REAL_DBS) {
      throw error;
    }

    logger.warn(
      `Neo4j connection failed - continuing with mock driver. Reason: ${(error as Error).message}`,
    );
  }
}

async function notifyDriverReady(reason: DriverReadyReason): Promise<void> {
  const listeners = Array.from(driverReadyListeners);

  for (const listener of listeners) {
    await invokeDriverReadyListener(listener, reason);
  }

  hasEmittedReadyEvent = true;
}

async function invokeDriverReadyListener(
  listener: DriverReadyListener,
  reason: DriverReadyReason,
): Promise<void> {
  try {
    await listener({ driver: driverFacade, reason });
  } catch (error) {
    logger.error('Error in Neo4j driver ready listener', error);
  }
}

async function teardownRealDriver(): Promise<void> {
  if (realDriver) {
    try {
      await realDriver.close();
    } catch (error) {
      logger.warn('Error closing Neo4j driver during teardown.', error);
    }
    realDriver = null;
  }

  isMockMode = true;
  neo4jConnectivityUp.set(0);
}

function createDriverFacade(): Neo4jDriver {
  const facade: Partial<Neo4jDriver> = {};

  facade.session = ((options?: Parameters<Neo4jDriver['session']>[0]) => {
    const session = realDriver
      ? realDriver.session(options)
      : createMockSession();
    return instrumentSession(session);
  }) as Neo4jDriver['session'];

  facade.close = (async () => {
    if (realDriver) {
      await teardownRealDriver();
    }
  }) as Neo4jDriver['close'];

  facade.verifyConnectivity = (async () => {
    if (realDriver) {
      return realDriver.verifyConnectivity();
    }
    return undefined;
  }) as Neo4jDriver['verifyConnectivity'];

  return facade as Neo4jDriver;
} 

function createMockSession(): Neo4jSession {
  return {
    run: async (cypher: string, params?: any) => {
      logger.debug(
        `Mock Neo4j query: Cypher: ${cypher}, Params: ${JSON.stringify(params)}`,
      );
      return {
        records: [],
        summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
      } as any;
    },
    close: async () => {},
    beginTransaction: () => createMockTransaction(),
    readTransaction: async (fn: any) => fn(createMockTransaction()),
    writeTransaction: async (fn: any) => fn(createMockTransaction()),
    executeRead: async (fn: any) => fn(createMockTransaction()),
    executeWrite: async (fn: any) => {
        // Mock invalidation trigger
        import('./queryOptimizer.js').then(({ queryOptimizer }) => {
             // In a real scenario we'd extract labels from the mutation
             queryOptimizer.invalidateForLabels('mock-tenant', ['*']).catch(err => logger.warn('Cache invalidation error', err));
        });
        return fn(createMockTransaction());
    },
  } as unknown as Neo4jSession;
}

function createMockTransaction() {
  return {
    run: async () => ({ records: [] }),
    commit: async () => {},
    rollback: async () => {},
  } as any;
}

function instrumentSession(session: any) {
  const originalRun = session.run.bind(session);
  const originalExecuteWrite = session.executeWrite?.bind(session);
  const originalBeginTransaction = session.beginTransaction?.bind(session);

  if (originalBeginTransaction) {
      session.beginTransaction = (config?: any) => {
          const tx = originalBeginTransaction(config);
          const originalTxRun = tx.run.bind(tx);
          const originalTxCommit = tx.commit.bind(tx);
          let writesDetected = false;

          tx.run = async (cypher: string, params?: any) => {
              const lower = cypher.toLowerCase();
              if (lower.includes('create') ||
                  lower.includes('merge') ||
                  lower.includes('delete') ||
                  lower.includes('set') ||
                  lower.includes('remove') ||
                  lower.includes('call')) {
                  writesDetected = true;
              }
              return originalTxRun(cypher, params);
          };

          tx.commit = async () => {
              // Invalidate BEFORE returning result to ensure Read-Your-Own-Writes consistency if possible
              // But Neo4j commits first. So we commit, then invalidate, then return.
              const result = await originalTxCommit();
              if (writesDetected) {
                  try {
                       const { queryOptimizer } = await import('./queryOptimizer.js');
                       // Await invalidation to ensure subsequent reads see freshness
                       await queryOptimizer.invalidateForLabels('global', ['*']);
                  } catch (err) {
                       logger.warn('Cache invalidation error', err);
                  }
              }
              return result;
          };

          return tx;
      };
  }

  if (originalExecuteWrite) {
      session.executeWrite = async (fn: any) => {
          try {
              const result = await originalExecuteWrite(fn);
               import('./queryOptimizer.js').then(({ queryOptimizer }) => {
                   // Attempt to fallback to a broad invalidation since we lack tenant context here
                   // ideally the transaction function would provide hints.
                   queryOptimizer.invalidateForLabels('global', ['*']).catch(err => logger.warn('Cache invalidation error', err));
               });
              return result;
          } catch (error) {
              throw error;
          }
      };
  }

  session.run = (
    cypher: string,
    params?: any,
    labels: { operation?: string; label?: string } = {},
  ) => {
    telemetry.subsystems.database.queries.add(1);

    // Extract tenantId from params if available
    const tenantId = params?.tenantId || params?.tenant_id || 'global';
    const lowerQuery = cypher.toLowerCase();

    // Bypass optimization for EXPLAIN queries to prevent infinite recursion
    // Also bypass if specific flag set in params to avoid buffering in GraphStreamer
    if (lowerQuery.startsWith('explain') || params?._skipCache) {
        return originalRun(cypher, params);
    }

    const isWrite = lowerQuery.includes('create') ||
                    lowerQuery.includes('merge') ||
                    lowerQuery.includes('delete') ||
                    lowerQuery.includes('set') ||
                    lowerQuery.includes('remove') ||
                    lowerQuery.includes('call');

    if (isWrite) {
         // Fire-and-forget invalidation for raw queries
         // Note: For strict consistency, use executeWrite/beginTransaction
         import('./queryOptimizer.js').then(({ queryOptimizer }) => {
             queryOptimizer.invalidateForLabels(tenantId, ['*']).catch(err => logger.warn('Cache invalidation error', err));
         });
         return originalRun(cypher, params);
    } else if (lowerQuery.includes('match') || lowerQuery.includes('return')) {
        // Return a Promise that mimics a Result (optimistic optimization)
        // We use an async IIFE to handle the logic but return the promise immediately
        const promise: any = (async () => {
            const startTime = Date.now();
            try {
                const { queryOptimizer } = await import('./queryOptimizer.js');
                const context = {
                    tenantId,
                    queryType: 'cypher' as const,
                    priority: 'medium' as const,
                    cacheEnabled: true
                };

                const result = await queryOptimizer.executeCachedQuery(cypher, params, context, (q, p) => originalRun(q, p));

                // Shim the records to behave like Neo4j Records (implementing .get, .toObject)
                // This ensures compatibility with existing driver code
                if (result && Array.isArray(result.records)) {
                    result.records = result.records.map((rec: any) => {
                        // If it already looks like a record (has .get), return it
                        if (typeof rec.get === 'function') return rec;

                        // Otherwise wrap plain object
                        return {
                            get: (key: string) => rec[key],
                            toObject: () => rec,
                            keys: Object.keys(rec),
                            has: (key: string) => Object.prototype.hasOwnProperty.call(rec, key),
                            ...rec // Spread properties for direct access if needed, though idiomatic Neo4j usage is via .get()
                        };
                    });
                }

                return result;
            } catch (error) {
                logger.warn('Query optimization failed, falling back to direct execution', error);
                return await originalRun(cypher, params);
            } finally {
                telemetry.subsystems.database.latency.record((Date.now() - startTime) / 1000);
            }
        })();

        // Shim .subscribe for compatibility
        // Note: Caching buffers the whole result, so subscribe will receive everything at once
        promise.subscribe = (observer: any) => {
            promise.then((result: any) => {
                if (result.records) {
                    result.records.forEach((r: any) => observer.onNext && observer.onNext(r));
                }
                if (observer.onCompleted) observer.onCompleted();
            }).catch((err: any) => {
                if (observer.onError) observer.onError(err);
            });
        };

        // Shim Async Iterator for compatibility
        promise[Symbol.asyncIterator] = async function* () {
            const result = await promise;
            if (result.records) {
                for (const record of result.records) {
                    yield record;
                }
            }
        };

        return promise;
    }

    // Default Fallback
    try {
      GraphIndexAdvisorService.getInstance().recordQuery(cypher);
    } catch (err) {
      logger.warn('Error in GraphIndexAdvisorService.recordQuery', err);
    }
    return originalRun(cypher, params);
  };
  return session;
}

// Export a convenience object for simple queries
export const neo = {
  run: async (cypher: string, params?: any, context?: { tenantId?: string }) => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      // If tenant context is provided, ensure parameters include it
      // Note: This relies on the query actually using $tenantId
      // For strict enforcement, use withTenant middleware or manual query construction
      const finalParams = context?.tenantId
        ? { ...params, tenantId: context.tenantId }
        : params;

      const result = await session.run(cypher, finalParams);
      return result;
    } finally {
      await session.close();
    }
  },
};
