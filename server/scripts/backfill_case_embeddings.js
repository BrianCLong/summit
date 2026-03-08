"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const EmbeddingService_js_1 = __importDefault(require("../services/EmbeddingService.js"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'BackfillEmbeddings' });
const embeddingService = new EmbeddingService_js_1.default();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function backfill() {
    logger.info('Starting backfill of case embeddings...');
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, title, description FROM cases WHERE embedding IS NULL');
        logger.info(`Found ${res.rows.length} cases to index.`);
        for (const row of res.rows) {
            const text = `${row.title} ${row.description || ''}`;
            try {
                const vector = await embeddingService.generateEmbedding({ text });
                const vectorStr = `[${vector.join(',')}]`;
                await client.query('UPDATE cases SET embedding = $1::vector WHERE id = $2', [vectorStr, row.id]);
                logger.info({ id: row.id }, 'Indexed case');
            }
            catch (err) {
                logger.error({ err, id: row.id }, 'Failed to index case');
            }
        }
    }
    finally {
        client.release();
        await pool.end();
    }
    logger.info('Backfill complete.');
}
backfill().catch(err => logger.error({ err }, 'Fatal error'));
