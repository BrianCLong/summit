import pg from 'pg';
import { createHash, createSign } from 'crypto';
import type {
  BitemporalRecord,
  TemporalSnapshot,
  TemporalDiff,
  TemporalQueryOptions,
  UpsertOptions,
  SignedAudit,
} from './types.js';
import type { Logger } from 'pino';

const { Pool } = pg;

const MAX_DATE = new Date('9999-12-31T23:59:59Z');

export class BitemporalStore<T = any> {
  private pool: pg.Pool;
  private tableName: string;
  private logger?: Logger;

  constructor(
    connectionString: string,
    tableName: string = 'bitemporal_entities',
    logger?: Logger
  ) {
    this.pool = new Pool({ connectionString, max: 20 });
    this.tableName = tableName;
    this.logger = logger;
  }

  /**
   * Initialize bitemporal schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Load and execute schema from schema.sql
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_key TEXT NOT NULL,
          data JSONB NOT NULL,
          valid_from TIMESTAMPTZ NOT NULL,
          valid_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
          tx_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tx_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
          created_by TEXT,
          modified_by TEXT,
          metadata JSONB,
          CHECK (valid_from < valid_to),
          CHECK (tx_from < tx_to)
        );

        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_key ON ${this.tableName}(entity_key);
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_valid_time ON ${this.tableName} USING gist(tstzrange(valid_from, valid_to));
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tx_time ON ${this.tableName} USING gist(tstzrange(tx_from, tx_to));
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_combined ON ${this.tableName}(entity_key, valid_from, valid_to, tx_from, tx_to);

        CREATE TABLE IF NOT EXISTS bitemporal_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_key TEXT NOT NULL,
          operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
          valid_time TIMESTAMPTZ NOT NULL,
          tx_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id TEXT,
          data JSONB NOT NULL,
          hash TEXT NOT NULL,
          signature TEXT,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_entity_key ON bitemporal_audit_log(entity_key);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON bitemporal_audit_log(timestamp);
      `);

      this.logger?.info({ tableName: this.tableName }, 'Bitemporal schema initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Upsert a record with temporal semantics
   */
  async upsert(
    entityKey: string,
    data: T,
    options: UpsertOptions
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const validTo = options.validTo || MAX_DATE;

      // Close any overlapping records
      await client.query(
        `UPDATE ${this.tableName}
         SET tx_to = $1
         WHERE entity_key = $2
           AND tx_to = '9999-12-31 23:59:59+00'
           AND tstzrange(valid_from, valid_to) && tstzrange($3, $4)`,
        [now, entityKey, options.validFrom, validTo]
      );

      // Insert new version
      const result = await client.query(
        `INSERT INTO ${this.tableName} (
          entity_key, data, valid_from, valid_to, tx_from, tx_to,
          created_by, modified_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          entityKey,
          JSON.stringify(data),
          options.validFrom,
          validTo,
          now,
          MAX_DATE,
          options.userId,
          options.userId,
          options.metadata ? JSON.stringify(options.metadata) : null,
        ]
      );

      const newId = result.rows[0].id;

      // Log to audit
      const hash = this.calculateHash(data);
      await client.query(
        `INSERT INTO bitemporal_audit_log (
          entity_key, operation, valid_time, tx_time, user_id, data, hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [entityKey, 'UPDATE', options.validFrom, now, options.userId, JSON.stringify(data), hash]
      );

      await client.query('COMMIT');

      this.logger?.debug({ entityKey, id: newId }, 'Bitemporal upsert completed');

      return newId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current state of an entity
   */
  async getCurrent(entityKey: string): Promise<BitemporalRecord<T> | null> {
    const now = new Date();
    return this.getAsOf(entityKey, now, now);
  }

  /**
   * Get state as of specific valid and transaction time
   */
  async getAsOf(
    entityKey: string,
    validTime: Date,
    txTime: Date
  ): Promise<BitemporalRecord<T> | null> {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName}
       WHERE entity_key = $1
         AND $2 BETWEEN valid_from AND valid_to
         AND $3 BETWEEN tx_from AND tx_to
       LIMIT 1`,
      [entityKey, validTime, txTime]
    );

    if (result.rows.length === 0) return null;

    return this.mapRow(result.rows[0]);
  }

  /**
   * Query with temporal options
   */
  async query(options: TemporalQueryOptions): Promise<TemporalSnapshot<T>> {
    const validTime = options.asOfValidTime || new Date();
    const txTime = options.asOfTxTime || new Date();

    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Valid time constraint
    if (options.validTimeRange) {
      query += ` AND tstzrange(valid_from, valid_to) && tstzrange($${paramIndex}, $${paramIndex + 1})`;
      params.push(options.validTimeRange.from, options.validTimeRange.to);
      paramIndex += 2;
    } else {
      query += ` AND $${paramIndex} BETWEEN valid_from AND valid_to`;
      params.push(validTime);
      paramIndex++;
    }

    // Transaction time constraint
    if (options.txTimeRange) {
      query += ` AND tstzrange(tx_from, tx_to) && tstzrange($${paramIndex}, $${paramIndex + 1})`;
      params.push(options.txTimeRange.from, options.txTimeRange.to);
      paramIndex += 2;
    } else {
      query += ` AND $${paramIndex} BETWEEN tx_from AND tx_to`;
      params.push(txTime);
      paramIndex++;
    }

    query += ' ORDER BY entity_key, valid_from DESC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
      paramIndex++;
    }

    const result = await this.pool.query(query, params);

    return {
      asOfValidTime: validTime,
      asOfTxTime: txTime,
      records: result.rows.map(row => this.mapRow(row)),
      totalCount: result.rowCount || 0,
    };
  }

  /**
   * Get temporal diff between two snapshots
   */
  async diff(
    fromValidTime: Date,
    fromTxTime: Date,
    toValidTime: Date,
    toTxTime: Date
  ): Promise<TemporalDiff<T>> {
    // Get both snapshots
    const fromSnapshot = await this.query({
      asOfValidTime: fromValidTime,
      asOfTxTime: fromTxTime,
    });

    const toSnapshot = await this.query({
      asOfValidTime: toValidTime,
      asOfTxTime: toTxTime,
    });

    // Build maps for comparison
    const fromMap = new Map(fromSnapshot.records.map(r => [r.entityKey, r]));
    const toMap = new Map(toSnapshot.records.map(r => [r.entityKey, r]));

    const added: BitemporalRecord<T>[] = [];
    const removed: BitemporalRecord<T>[] = [];
    const modified: Array<{
      before: BitemporalRecord<T>;
      after: BitemporalRecord<T>;
      changes: Array<{ field: string; oldValue: any; newValue: any }>;
    }> = [];

    // Find added and modified
    for (const [key, toRecord] of toMap) {
      const fromRecord = fromMap.get(key);
      if (!fromRecord) {
        added.push(toRecord);
      } else {
        const changes = this.detectChanges(fromRecord.data, toRecord.data);
        if (changes.length > 0) {
          modified.push({ before: fromRecord, after: toRecord, changes });
        }
      }
    }

    // Find removed
    for (const [key, fromRecord] of fromMap) {
      if (!toMap.has(key)) {
        removed.push(fromRecord);
      }
    }

    return {
      fromSnapshot: { validTime: fromValidTime, txTime: fromTxTime },
      toSnapshot: { validTime: toValidTime, txTime: toTxTime },
      added,
      removed,
      modified,
    };
  }

  /**
   * Export signed audit trail
   */
  async exportAudit(
    entityKey: string,
    privateKey?: string
  ): Promise<SignedAudit[]> {
    const result = await this.pool.query(
      `SELECT * FROM bitemporal_audit_log
       WHERE entity_key = $1
       ORDER BY tx_time ASC`,
      [entityKey]
    );

    const audits: SignedAudit[] = result.rows.map(row => ({
      id: row.id,
      entityKey: row.entity_key,
      operation: row.operation,
      validTime: new Date(row.valid_time),
      txTime: new Date(row.tx_time),
      userId: row.user_id,
      data: row.data,
      hash: row.hash,
      signature: row.signature,
      timestamp: new Date(row.timestamp),
    }));

    // Sign if private key provided
    if (privateKey) {
      for (const audit of audits) {
        audit.signature = this.signAudit(audit, privateKey);
      }
    }

    return audits;
  }

  /**
   * Get all versions of an entity
   */
  async getAllVersions(entityKey: string): Promise<BitemporalRecord<T>[]> {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName}
       WHERE entity_key = $1
       ORDER BY valid_from DESC, tx_from DESC`,
      [entityKey]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Calculate hash of data
   */
  private calculateHash(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Sign audit record
   */
  private signAudit(audit: SignedAudit, privateKey: string): string {
    const sign = createSign('SHA256');
    sign.update(JSON.stringify({
      entityKey: audit.entityKey,
      operation: audit.operation,
      validTime: audit.validTime,
      txTime: audit.txTime,
      hash: audit.hash,
    }));
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Detect changes between two objects
   */
  private detectChanges(
    oldData: any,
    newData: any
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue });
      }
    }

    return changes;
  }

  /**
   * Map database row to BitemporalRecord
   */
  private mapRow(row: any): BitemporalRecord<T> {
    return {
      id: row.id,
      entityKey: row.entity_key,
      data: row.data,
      validFrom: new Date(row.valid_from),
      validTo: new Date(row.valid_to),
      txFrom: new Date(row.tx_from),
      txTo: new Date(row.tx_to),
      createdBy: row.created_by,
      modifiedBy: row.modified_by,
      metadata: row.metadata,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger?.info('Bitemporal store connections closed');
  }
}
