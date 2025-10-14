import { Pool } from 'pg';
import dotenv from 'dotenv';
import pino from 'pino';
dotenv.config();
const logger = pino();
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_USER = process.env.POSTGRES_USER || 'intelgraph';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'devpassword';
const POSTGRES_DB = process.env.POSTGRES_DB || 'intelgraph_dev';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
let pool;
export function getPostgresPool() {
    if (!pool) {
        try {
            pool = new Pool({
                host: POSTGRES_HOST,
                user: POSTGRES_USER,
                password: POSTGRES_PASSWORD,
                database: POSTGRES_DB,
                port: POSTGRES_PORT,
                connectionTimeoutMillis: 5000,
            });
            logger.info('PostgreSQL pool initialized.');
            // Test the connection
            pool.connect().then(client => {
                client.release();
                logger.info('PostgreSQL connection verified.');
            }).catch(err => {
                logger.warn(`PostgreSQL connection failed - using mock responses. Error: ${err.message}`);
                pool = createMockPostgresPool();
            });
        }
        catch (error) {
            logger.warn(`PostgreSQL initialization failed - using development mode. Error: ${error.message}`);
            pool = createMockPostgresPool();
        }
    }
    return pool;
}
function createMockPostgresPool() {
    return {
        query: async (text, params) => {
            logger.debug(`Mock PostgreSQL query: Text: ${text}, Params: ${JSON.stringify(params)}`);
            return { rows: [], rowCount: 0, fields: [] };
        },
        connect: async () => ({
            query: async (text, params) => ({ rows: [], rowCount: 0, fields: [] }),
            release: () => { }
        }),
        end: async () => { },
        on: () => { }
    };
}
export async function closePostgresPool() {
    if (pool) {
        await pool.end();
        logger.info('PostgreSQL pool closed.');
        pool = null; // Clear the pool instance
    }
}
//# sourceMappingURL=postgres.js.map