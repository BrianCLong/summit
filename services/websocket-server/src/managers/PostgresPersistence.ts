import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

export class PostgresPersistence {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS collab_documents (
          name TEXT PRIMARY KEY,
          content BYTEA,
          json_content JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      logger.info('Collab persistence initialized (Postgres)');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize collab persistence');
      throw error;
    }
  }

  async load(name: string): Promise<Uint8Array | null> {
    const res = await this.pool.query('SELECT content FROM collab_documents WHERE name = $1', [name]);
    if (res.rows.length > 0) {
      return res.rows[0].content;
    }
    return null;
  }

  async save(name: string, content: Uint8Array, jsonContent?: any): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO collab_documents (name, content, json_content, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (name) DO UPDATE SET content = $2, json_content = $3, updated_at = NOW()`,
        [name, Buffer.from(content), jsonContent ? JSON.stringify(jsonContent) : null]
      );
    } catch (error) {
      logger.error({ error, name }, 'Failed to save collab document');
    }
  }

  async close() {
    await this.pool.end();
  }
}
