import { telemetry } from '../lib/telemetry/comprehensive-telemetry';
import neo4j, { Transaction } from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';
import {
  neo4jConnectivityUp,
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from '../metrics/neo4jMetrics.js';
import { getFeatureFlagService } from '../feature-flags/setup.js';

dotenv.config();

const logger: ReturnType<typeof pino> = pino();

type Neo4jDriver = neo4j.Driver;
type Neo4jSession = neo4j.Session;

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER =
  process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
const NEO4J_REGION_B_URI = process.env.NEO4J_REGION_B_URI;
const NEO4J_REGION_B_USER = process.env.NEO4J_REGION_B_USER || NEO4J_USER;
const NEO4J_REGION_B_PASSWORD = process.env.NEO4J_REGION_B_PASSWORD || NEO4J_PASSWORD;

const REQUIRE_REAL_DBS = process.env.REQUIRE_REAL_DBS === 'true';
const CONNECTIVITY_CHECK_INTERVAL_MS = Number(
  process.env.NEO4J_HEALTH_INTERVAL_MS || 15000,
);

let realDriver: Neo4jDriver | null = null;
let realDriverB: Neo4jDriver | null = null;
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
        if (realDriverB) {
          try {
             await realDriverB.verifyConnectivity();
          } catch (e) {
             logger.warn('Region B disconnected (non-fatal)', e);
          }
        }
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
  let candidateB: Neo4jDriver | null = null;

  try {
    candidate = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    );

    await candidate.verifyConnectivity();
    realDriver = candidate;

    // Connect to Region B if configured
    if (NEO4J_REGION_B_URI) {
      try {
        candidateB = neo4j.driver(
           NEO4J_REGION_B_URI,
           neo4j.auth.basic(NEO4J_REGION_B_USER, NEO4J_REGION_B_PASSWORD)
        );
        await candidateB.verifyConnectivity();
        realDriverB = candidateB;
        logger.info('Neo4j Region B driver initialized.');
      } catch (error) {
         logger.error('Failed to connect to Neo4j Region B (non-fatal)', error);
         if (candidateB) await candidateB.close().catch(() => {});
      }
    }

    isMockMode = false;
    neo4jConnectivityUp.set(1);
    logger.info('Neo4j driver initialized.');
    await notifyDriverReady(hasEmittedReadyEvent ? 'reconnected' : 'initial');
  } catch (error) {
    if (candidate) {
      await candidate.close().catch(() => {});
    }
    if (candidateB) {
      await candidateB.close().catch(() => {});
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
  if (realDriverB) {
    try {
      await realDriverB.close();
    } catch (error) {
      logger.warn('Error closing Neo4j Region B driver during teardown.', error);
    }
    realDriverB = null;
  }

  isMockMode = true;
  neo4jConnectivityUp.set(0);
}

function createDriverFacade(): Neo4jDriver {
  const facade: Partial<Neo4jDriver> = {};

  facade.session = ((options?: any) => {
    // Separate tenantId (custom) from standard options
    const { tenantId, ...sessionOptions } = options || {};

    // 1. Get the session (Mock or Real A)
    const sessionA = realDriver
      ? realDriver.session(sessionOptions)
      : createMockSession();

    // 2. Create Dual Write Session (wraps sessionA)
    // Pass 'options' (containing tenantId) to DualWriteSession so it can use it for logic.
    // We create the proxy first.
    const dualWriteSession = createDualWriteSession(sessionA, options);

    // 3. Instrument the Session (wraps the DualWriteSession)
    // This ensures metrics capture the FULL latency of the Quorum operation (A + B).
    return instrumentSession(dualWriteSession);

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
    executeWrite: async (fn: any) => fn(createMockTransaction()),
  } as unknown as Neo4jSession;
}

function createMockTransaction() {
  return {
    run: async () => ({ records: [] }),
    commit: async () => {},
    rollback: async () => {},
  } as any;
}

function instrumentSession(session: Neo4jSession): Neo4jSession {
    // We bind to the original session, assuming it's the target.
    // If 'session' is a Proxy (DualWriteSession), this binds to the Proxy's 'run' method.
    // The Proxy's 'run' method triggers the 'get' trap, which returns the async dual-write function.
    // So 'originalRun' becomes that async function.
    const originalRun = session.run.bind(session);

    // We replace 'run' on the object instance.
    // If 'session' is a Proxy without a 'set' trap, this sets the property on the Target (sessionA).
    // THIS IS RISKY if 'session' is the DualWriteProxy.
    // DualWriteProxy wraps sessionA.
    // sessionA.run = instrumentedRun.
    // When user calls DualWriteProxy.run:
    //   -> get trap returns DualWriteFn.
    //   -> DualWriteFn calls target.run (sessionA.run).
    //   -> sessionA.run is instrumentedRun.
    //   -> instrumentedRun calls originalRun (bound to sessionA.run from BEFORE instrumentation?)
    // No, originalRun is bound to session.run.
    // If session is DualWriteProxy, session.run is DualWriteFn.
    // So originalRun = DualWriteFn.
    // If we set session.run = instrumentedRun...
    //   Proxy has no set trap -> sets on Target (sessionA).
    //   sessionA.run = instrumentedRun.
    // BUT DualWriteFn calls target.run (sessionA.run).
    // So DualWriteFn calls InstrumentedRun.
    // InstrumentedRun calls originalRun (DualWriteFn).
    // RECURSION!

    // We must NOT mutate the session if it's a Proxy.
    // We must wrap it in another Proxy or object.

    return new Proxy(session, {
        get(target, prop, receiver) {
            if (prop === 'run') {
                return async (cypher: string, params?: any) => {
                    telemetry.subsystems.database.queries.add(1);
                    const startTime = Date.now();
                    try {
                        return await target.run(cypher, params);
                    } catch (error) {
                        telemetry.subsystems.database.errors.add(1);
                        throw error;
                    } finally {
                        telemetry.subsystems.database.latency.record((Date.now() - startTime) / 1000);
                    }
                };
            }
            return Reflect.get(target, prop, receiver);
        }
    });
}


// Check if query is a write operation
function isWriteQuery(cypher: string): boolean {
    return /\b(CREATE|MERGE|SET|DELETE|REMOVE|FOREACH|CALL|LOAD CSV)\b/i.test(cypher);
}

// Common function to determine if dual write is enabled
async function isDualWriteEnabled(options: any): Promise<boolean> {
    try {
        const ff = getFeatureFlagService();
        // Extract tenantId from options if available (passed via session config hack)
        const tenantId = options?.tenantId || options?.context?.tenantId || 'system';

        return await ff.getFlagValue('write_quorum', {
            tenantId,
            environment: process.env.NODE_ENV || 'development'
        }, false);
    } catch (e) {
        return false;
    }
}

// Inject timestamp into params for conflict resolution
function injectTimestamp(params: any): any {
    return {
        ...params,
        _writeTimestamp: Date.now()
    };
}

function createDualWriteSession(sessionA: Neo4jSession, options: any): Neo4jSession {
    // The wrapper that intercepts calls
    return new Proxy(sessionA, {
        get(target, prop, receiver) {
             if (prop === 'run') {
                 return async (cypher: string, params?: any) => {
                     // 1. Check if Write first to avoid overhead on Read
                     if (!isWriteQuery(cypher)) {
                         return target.run(cypher, params);
                     }

                     const dualWriteEnabled = await isDualWriteEnabled(options);
                     const finalParams = injectTimestamp(params);

                     if (dualWriteEnabled && realDriverB) {
                         const { tenantId, ...sessionOptions } = options || {};
                         const sessionB = realDriverB.session(sessionOptions);
                         try {
                             const promiseA = target.run(cypher, finalParams);
                             const promiseB = sessionB.run(cypher, finalParams);

                             // Quorum = 2/2 enforcement
                             const [resA, resB] = await Promise.allSettled([promiseA, promiseB]);

                             if (resA.status === 'rejected') throw resA.reason;

                             if (resB.status === 'rejected') {
                                 logger.error('Write Quorum Error: Secondary region write failed. Failing request (Strict Quorum).', resB.reason);
                                 throw new Error('Write Quorum Failed: Secondary region unavailable.');
                             }

                             return resA.value;
                         } finally {
                             await sessionB.close();
                         }
                     }
                     return target.run(cypher, finalParams);
                 }
             }

             if (prop === 'beginTransaction') {
                 return (txConfig?: any) => {
                     const txA = target.beginTransaction(txConfig);
                     return createDualWriteTransaction(txA, options, txConfig);
                 };
             }

             return Reflect.get(target, prop, receiver);
        }
    });
}

function createDualWriteTransaction(txA: Transaction, options: any, txConfig: any): Transaction {
    let txB: Transaction | null = null;
    let dualWriteChecked = false;
    let dualWriteEnabled = false;

    const ensureTxB = async () => {
        if (!dualWriteChecked) {
            dualWriteEnabled = await isDualWriteEnabled(options);
            dualWriteChecked = true;
        }
        if (dualWriteEnabled && realDriverB && !txB) {
            const { tenantId, ...sessionOptions } = options || {};
            const sessionB = realDriverB.session(sessionOptions);
            txB = sessionB.beginTransaction(txConfig);
            (txB as any)._session = sessionB;
        }
    };

    return new Proxy(txA, {
        get(target, prop, receiver) {
            if (prop === 'run') {
                return async (cypher: string, params?: any) => {
                    if (!isWriteQuery(cypher)) {
                        return target.run(cypher, params);
                    }

                    const finalParams = injectTimestamp(params);
                    await ensureTxB();

                    if (txB) {
                        const promiseA = target.run(cypher, finalParams);
                        const promiseB = txB.run(cypher, finalParams);

                        try {
                             const [resA, resB] = await Promise.allSettled([promiseA, promiseB]);
                             if (resA.status === 'rejected') throw resA.reason;
                             if (resB.status === 'rejected') {
                                 logger.error('Write Quorum Error (Tx): Secondary write failed.', resB.reason);
                                 throw new Error('Write Quorum Failed (Tx): Secondary region unavailable.');
                             }
                             return resA.value;
                        } catch (e) {
                            throw e;
                        }
                    }
                    return target.run(cypher, finalParams);
                };
            }

            if (prop === 'commit') {
                return async () => {
                    await ensureTxB();
                    const promiseA = target.commit();
                    const promiseB = txB ? txB.commit() : Promise.resolve();

                    const [resA, resB] = await Promise.allSettled([promiseA, promiseB]);

                    if (txB && (txB as any)._session) {
                        await (txB as any)._session.close();
                    }

                    if (resA.status === 'rejected') throw resA.reason;
                    if (resB.status === 'rejected') {
                         logger.error('Write Quorum Error (Tx Commit):', resB.reason);
                         throw new Error('Write Quorum Failed (Commit): Secondary region commit failed.');
                    }
                    return resA.value;
                };
            }

            if (prop === 'rollback') {
                return async () => {
                    await ensureTxB();
                    const promiseA = target.rollback();
                    const promiseB = txB ? txB.rollback() : Promise.resolve();

                    const [resA] = await Promise.allSettled([promiseA, promiseB]);

                    if (txB && (txB as any)._session) {
                        await (txB as any)._session.close();
                    }

                    if (resA.status === 'rejected') throw resA.reason;
                    return resA.value;
                };
            }

            return Reflect.get(target, prop, receiver);
        }
    });
}

// Export a convenience object for simple queries
export const neo = {
  run: async (cypher: string, params?: any, context?: { tenantId?: string }) => {
    const driver = getNeo4jDriver();
    // Pass tenantId via custom options object passed to driver.session
    // We expect driver.session to be our facade which strips this out.
    // Casting to any to pass type check
    const options: any = { tenantId: context?.tenantId };
    const session = driver.session(options);
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  },
};
