import * as neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import pino from 'pino';
import { neo4jConnectivityUp, neo4jQueryErrorsTotal, neo4jQueryLatencyMs, neo4jQueryTotal, } from '../metrics/neo4jMetrics.js';
dotenv.config();
const logger = pino();
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
let driver;
let isMockMode = false;
export function getNeo4jDriver() {
    if (!driver) {
        try {
            driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
            logger.info('Neo4j driver initialized.');
            const originalSession = driver.session.bind(driver);
            driver.session = (options) => {
                const session = originalSession(options);
                return instrumentSession(session);
            };
            driver
                .verifyConnectivity()
                .then(() => neo4jConnectivityUp.set(1))
                .catch(() => {
                logger.warn('Neo4j connection failed - switching to mock mode');
                neo4jConnectivityUp.set(0);
                isMockMode = true;
            });
            setInterval(async () => {
                try {
                    await driver.verifyConnectivity();
                    neo4jConnectivityUp.set(1);
                }
                catch {
                    neo4jConnectivityUp.set(0);
                }
            }, 15000);
        }
        catch (error) {
            logger.warn(`Neo4j connection failed - using development mode with mock responses. Error: ${error.message}`);
            driver = createMockNeo4jDriver();
            isMockMode = true;
        }
    }
    return driver;
}
export function isNeo4jMockMode() {
    return isMockMode;
}
function createMockNeo4jDriver() {
    return {
        session: () => instrumentSession({
            run: async (cypher, params) => {
                logger.debug(`Mock Neo4j query: Cypher: ${cypher}, Params: ${JSON.stringify(params)}`);
                return {
                    records: [],
                    summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
                };
            },
            close: async () => { },
            readTransaction: async (fn) => fn({
                run: async () => ({ records: [] }),
            }),
            writeTransaction: async (fn) => fn({
                run: async () => ({ records: [] }),
            }),
        }),
        close: async () => { },
        verifyConnectivity: async () => ({}),
    };
}
export async function closeNeo4jDriver() {
    if (driver) {
        await driver.close();
        logger.info('Neo4j driver closed.');
        driver = null; // Clear the driver instance
    }
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