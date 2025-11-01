import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';
import { neo4jConnectivityUp, neo4jQueryErrorsTotal, neo4jQueryLatencyMs, neo4jQueryTotal, } from '../metrics/neo4jMetrics.js';
dotenv.config();
const logger = pino();
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
const REQUIRE_REAL_DBS = process.env.REQUIRE_REAL_DBS === 'true';
const CONNECTIVITY_CHECK_INTERVAL_MS = Number(process.env.NEO4J_HEALTH_INTERVAL_MS || 15000);
let realDriver = null;
let initializationPromise = null;
let connectivityTimer = null;
let isMockMode = true;
const driverFacade = createDriverFacade();
ensureInitialization().catch((error) => {
    if (REQUIRE_REAL_DBS) {
        logger.error('Neo4j connectivity required but initialization failed. Exiting.', error);
        process.nextTick(() => {
            throw error;
        });
    }
    else {
        logger.warn(`Neo4j connection failed - running in mock mode. Reason: ${error.message}`);
    }
});
if (CONNECTIVITY_CHECK_INTERVAL_MS > 0) {
    connectivityTimer = setInterval(async () => {
        if (realDriver) {
            try {
                await realDriver.verifyConnectivity();
                neo4jConnectivityUp.set(1);
            }
            catch (error) {
                logger.warn('Lost Neo4j connectivity - switching to mock mode.', error);
                await teardownRealDriver();
                ensureInitialization().catch((err) => {
                    if (REQUIRE_REAL_DBS) {
                        logger.error('Neo4j reconnection failed while REQUIRE_REAL_DBS=true. Exiting.', err);
                        process.nextTick(() => {
                            throw err;
                        });
                    }
                    else {
                        logger.warn(`Neo4j reconnection failed - continuing in mock mode. Reason: ${err.message}`);
                    }
                });
            }
        }
        else {
            await ensureInitialization();
        }
    }, CONNECTIVITY_CHECK_INTERVAL_MS);
    if (typeof connectivityTimer.unref === 'function') {
        connectivityTimer.unref();
    }
}
export async function initializeNeo4jDriver() {
    await ensureInitialization();
}
export function getNeo4jDriver() {
    void ensureInitialization();
    return driverFacade;
}
export function isNeo4jMockMode() {
    return isMockMode;
}
export async function closeNeo4jDriver() {
    if (connectivityTimer) {
        clearInterval(connectivityTimer);
        connectivityTimer = null;
    }
    await teardownRealDriver();
}
export class Neo4jService {
    _driver;
    constructor(_driver = getNeo4jDriver()) {
        this._driver = _driver;
    }
    getSession(options) {
        return this._driver.session(options);
    }
    async close() {
        await this._driver.close();
    }
    async verifyConnectivity() {
        try {
            await this._driver.verifyConnectivity();
            return true;
        }
        catch {
            return false;
        }
    }
}
async function ensureInitialization() {
    if (realDriver || initializationPromise) {
        return initializationPromise ?? Promise.resolve();
    }
    initializationPromise = connectToNeo4j().finally(() => {
        initializationPromise = null;
    });
    return initializationPromise;
}
async function connectToNeo4j() {
    let candidate = null;
    try {
        candidate = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
        await candidate.verifyConnectivity();
        realDriver = candidate;
        candidate = null;
        isMockMode = false;
        neo4jConnectivityUp.set(1);
        logger.info('Neo4j driver initialized.');
    }
    catch (error) {
        if (candidate) {
            await candidate.close().catch(() => { });
        }
        isMockMode = true;
        neo4jConnectivityUp.set(0);
        if (REQUIRE_REAL_DBS) {
            throw error;
        }
        logger.warn(`Neo4j connection failed - continuing with mock driver. Reason: ${error.message}`);
    }
}
async function teardownRealDriver() {
    if (realDriver) {
        try {
            await realDriver.close();
        }
        catch (error) {
            logger.warn('Error closing Neo4j driver during teardown.', error);
        }
        realDriver = null;
    }
    isMockMode = true;
    neo4jConnectivityUp.set(0);
}
function createDriverFacade() {
    const facade = {};
    facade.session = ((options) => {
        const session = realDriver
            ? realDriver.session(options)
            : createMockSession();
        return instrumentSession(session);
    });
    facade.close = (async () => {
        if (realDriver) {
            await teardownRealDriver();
        }
    });
    facade.verifyConnectivity = (async () => {
        if (realDriver) {
            return realDriver.verifyConnectivity();
        }
        return undefined;
    });
    return facade;
}
function createMockSession() {
    return {
        run: async (cypher, params) => {
            logger.debug(`Mock Neo4j query: Cypher: ${cypher}, Params: ${JSON.stringify(params)}`);
            return {
                records: [],
                summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
            };
        },
        close: async () => { },
        beginTransaction: () => createMockTransaction(),
        readTransaction: async (fn) => fn(createMockTransaction()),
        writeTransaction: async (fn) => fn(createMockTransaction()),
        executeRead: async (fn) => fn(createMockTransaction()),
        executeWrite: async (fn) => fn(createMockTransaction()),
    };
}
function createMockTransaction() {
    return {
        run: async () => ({ records: [] }),
        commit: async () => { },
        rollback: async () => { },
    };
}
function instrumentSession(session) {
    const originalRun = session.run.bind(session);
    session.run = async (cypher, params, labels = {}) => {
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
        }
        catch (error) {
            neo4jQueryErrorsTotal.inc({ operation, label });
            throw error;
        }
    };
    return session;
}
//# sourceMappingURL=neo4j.js.map
