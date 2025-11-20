import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';
import {
  neo4jConnectivityUp,
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from '../metrics/neo4jMetrics.js';

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

  getSession(options?: neo4j.SessionOptions) {
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
    );

    await candidate.verifyConnectivity();

    realDriver = candidate;
    candidate = null;
    isMockMode = false;
    neo4jConnectivityUp.set(1);
    logger.info('Neo4j driver initialized.');
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

  facade.session = ((options?: neo4j.SessionOptions) => {
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

function instrumentSession(session: any) {
  const originalRun = session.run.bind(session);
  session.run = async (
    cypher: string,
    params?: any,
    labels: { operation?: string; label?: string } = {},
  ) => {
    const { operation = 'unknown', label = 'general' } = labels;
    const start = Date.now();
    neo4jQueryTotal.inc({ operation, label });
    try {
      const result = await originalRun(cypher, params);
      const latency = Date.now() - start;
      neo4jQueryLatencyMs.observe({ operation, label }, latency);
      if (latency > 300) {
        logger.warn(`Slow Neo4j query (${latency}ms): ${cypher}`);
      }
      return result;
    } catch (error) {
      neo4jQueryErrorsTotal.inc({ operation, label });
      throw error;
    }
  };
  return session;
}
