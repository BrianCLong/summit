import { Pool } from 'pg';
import EmbeddingService from '../services/EmbeddingService.js';
import pino from 'pino';

const logger = pino({ name: 'BackfillEmbeddings' });
const embeddingService = new EmbeddingService();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
      } catch (err) {
        logger.error({ err, id: row.id }, 'Failed to index case');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
  logger.info('Backfill complete.');
}

backfill().catch(err => logger.error({ err }, 'Fatal error'));
