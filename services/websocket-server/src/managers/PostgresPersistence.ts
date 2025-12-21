
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

export class PostgresPersistence {
  private pool: Pool;
  private tableName = 'collab_documents';

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/intelgraph',
    });

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle client');
    });
  }

  async setup(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          name TEXT PRIMARY KEY,
          content BYTEA NOT NULL,
          json_content JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      logger.info(`Table ${this.tableName} verified`);
    } catch (err) {
      logger.error({ err }, 'Failed to setup Postgres persistence');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveDocument(name: string, content: Uint8Array, jsonContent: any): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO ${this.tableName} (name, content, json_content, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (name) DO UPDATE
         SET content = $2, json_content = $3, updated_at = NOW()`,
        [name, Buffer.from(content), jsonContent]
      );
    } catch (err) {
      logger.error({ err }, `Failed to save document ${name}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async loadDocument(name: string): Promise<Uint8Array | null> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT content FROM ${this.tableName} WHERE name = $1`,
        [name]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0].content;
    } catch (err) {
      logger.error({ err }, `Failed to load document ${name}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
