import { getPostgresPool } from './postgres.js';
import { neo } from './neo4j.js';
import baseLogger from '../config/logger.js';

const logger = baseLogger.child({ name: 'db-batch' });

export class PostgresBatcher<T> {
  private buffer: T[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: {
      tableName: string;
      columns: string[]; // e.g. ['id', 'name', 'created_at']
      flushSize?: number; // Default 100
      flushIntervalMs?: number; // Default 1000ms
      onFlush?: (count: number) => void;
      transform?: (item: T) => any[]; // Transform item to array of values matching columns
    }
  ) {}

  add(item: T) {
    this.buffer.push(item);
    if (this.buffer.length >= (this.options.flushSize ?? 100)) {
      this.flush();
    } else if (!this.timer && (this.options.flushIntervalMs ?? 1000) > 0) {
      this.timer = setTimeout(() => this.flush(), this.options.flushIntervalMs ?? 1000);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const items = [...this.buffer];
    this.buffer = [];

    try {
      const pool = getPostgresPool();

      const cols = this.options.columns;
      // Create placeholders like ($1, $2), ($3, $4)...
      // We need to flatten values
      const values: any[] = [];
      const placeholders: string[] = [];

      let paramIdx = 1;

      for (const item of items) {
        const itemValues = this.options.transform
          ? this.options.transform(item)
          : (cols.map(c => (item as any)[c])); // Default: expect item keys to match columns

        if (itemValues.length !== cols.length) {
             throw new Error(`Item values length ${itemValues.length} does not match columns length ${cols.length}`);
        }

        const rowPlaceholders: string[] = [];
        for (const val of itemValues) {
          values.push(val);
          rowPlaceholders.push(`$${paramIdx++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      const query = `
        INSERT INTO ${this.options.tableName} (${cols.join(', ')})
        VALUES ${placeholders.join(', ')}
      `;

      await pool.write(query, values);

      if (this.options.onFlush) {
        this.options.onFlush(items.length);
      }

      logger.debug({ table: this.options.tableName, count: items.length }, 'Flushed Postgres batch');

    } catch (error) {
      logger.error({ err: error, table: this.options.tableName }, 'Failed to flush Postgres batch');
      // In a real system we might want to retry or DLQ these items
      // For now, we log error. The items are lost from buffer.
    }
  }
}

export class Neo4jBatcher<T> {
  private buffer: T[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: {
      cypher: string; // e.g. "UNWIND $batch AS row MERGE (n:Node {id: row.id}) SET n += row.props"
      flushSize?: number;
      flushIntervalMs?: number;
      onFlush?: (count: number) => void;
    }
  ) {}

  add(item: T) {
    this.buffer.push(item);
    if (this.buffer.length >= (this.options.flushSize ?? 100)) {
      this.flush();
    } else if (!this.timer && (this.options.flushIntervalMs ?? 1000) > 0) {
      this.timer = setTimeout(() => this.flush(), this.options.flushIntervalMs ?? 1000);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await neo.run(this.options.cypher, { batch });

      if (this.options.onFlush) {
        this.options.onFlush(batch.length);
      }

      logger.debug({ count: batch.length }, 'Flushed Neo4j batch');

    } catch (error) {
      logger.error({ err: error }, 'Failed to flush Neo4j batch');
    }
  }
}
