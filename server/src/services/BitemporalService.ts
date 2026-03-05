
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

export interface BitemporalEntity {
  id: string;
  tenantId: string;
  kind: string;
  props: Record<string, any>;
  validFrom: string;
  validTo: string;
  transactionFrom: string;
  transactionTo: string;
}

type InMemoryBitemporalRow = {
  id: string;
  tenantId: string;
  kind: string;
  props: Record<string, any>;
  validFrom: Date;
  validTo: Date;
  transactionFrom: Date;
  transactionTo: Date;
};

/**
 * Service for Bitemporal Knowledge Tracking (Task #109).
 * Tracks facts across both Valid Time and Transaction Time.
 * Enables "Time-Travel" queries: "What did we know at time X about what was true at time Y?"
 */
export class BitemporalService {
  private static instance: BitemporalService;
  private FAR_FUTURE = '9999-12-31 23:59:59+00';
  private inMemoryRows: InMemoryBitemporalRow[] = [];

  private constructor() {}

  public static getInstance(): BitemporalService {
    if (!BitemporalService.instance) {
      BitemporalService.instance = new BitemporalService();
    }
    return BitemporalService.instance;
  }

  /**
   * Records a new bitemporal fact.
   */
  public async recordFact(params: {
    id: string;
    tenantId: string;
    kind: string;
    props: Record<string, any>;
    validFrom: Date;
    validTo?: Date;
    transactionFrom?: Date; // Added for testing/drills
    createdBy?: string;
  }): Promise<void> {
    const pool = getPostgresPool();
    if (!pool || (typeof pool.connect !== 'function' && typeof pool.query !== 'function')) {
      if (process.env.NODE_ENV === 'test') {
        this.recordFactInMemory(params);
        return;
      }
      throw new Error('BitemporalService: Postgres pool unavailable');
    }

    const connected =
      typeof pool?.connect === 'function' ? await pool.connect() : undefined;
    const client = connected && typeof connected.query === 'function'
      ? connected
      : (pool as { query: (sql: string, params?: unknown[]) => Promise<unknown>; release?: () => void });

    const validFromStr = params.validFrom.toISOString();
    const validToStr = params.validTo ? params.validTo.toISOString() : this.FAR_FUTURE;
    const transactionFromStr = params.transactionFrom ? params.transactionFrom.toISOString() : new Date().toISOString();
    const user = params.createdBy || 'system';

    try {
      await client.query('BEGIN');

      // 1. Retire previous system knowledge about this specific valid-time slice
      await client.query(
        `UPDATE bitemporal_entities 
         SET transaction_to = $5
         WHERE id = $1 AND tenant_id = $2 
         AND transaction_to = $3 
         AND valid_from = $4`,
        [params.id, params.tenantId, this.FAR_FUTURE, validFromStr, transactionFromStr]
      );

      // 2. Insert new knowledge
      await client.query(
        `INSERT INTO bitemporal_entities (id, tenant_id, kind, props, valid_from, valid_to, transaction_from, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [params.id, params.tenantId, params.kind, JSON.stringify(params.props), validFromStr, validToStr, transactionFromStr, user]
      );

      await client.query('COMMIT');
      logger.info({ entityId: params.id, validFrom: validFromStr, transactionFrom: transactionFromStr }, 'BitemporalService: Fact recorded');
    } catch (err) {
      if (typeof client?.query === 'function') {
        await client.query('ROLLBACK');
      }
      logger.error({ err, entityId: params.id }, 'BitemporalService: Failed to record fact');
      throw err;
    } finally {
      if (connected && typeof client?.release === 'function') {
        client.release();
      }
    }
  }

  /**
   * Performs a "Time-Travel" query.
   * Finds what the system knew (asOfTransaction) about facts that were true at (asOfValid).
   */
  public async queryAsOf(
    id: string, 
    tenantId: string, 
    asOfValid: Date = new Date(), 
    asOfTransaction: Date = new Date()
  ): Promise<BitemporalEntity | null> {
    const pool = getPostgresPool();
    if (!pool || typeof pool.query !== 'function') {
      if (process.env.NODE_ENV === 'test') {
        return this.queryAsOfInMemory(id, tenantId, asOfValid, asOfTransaction);
      }
      throw new Error('BitemporalService: Postgres pool unavailable');
    }
    
    const result = await pool.query(
      `SELECT * FROM bitemporal_entities 
       WHERE id = $1 AND tenant_id = $2
       AND valid_from <= $3 AND valid_to > $3
       AND transaction_from <= $4 AND transaction_to > $4
       ORDER BY transaction_from DESC
       LIMIT 1`,
      [id, tenantId, asOfValid.toISOString(), asOfTransaction.toISOString()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props =
      typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
    const asIso = (value: Date | string): string =>
      (value instanceof Date ? value : new Date(value)).toISOString();
    return {
      id: row.id,
      tenantId: row.tenant_id,
      kind: row.kind,
      props,
      validFrom: asIso(row.valid_from),
      validTo: asIso(row.valid_to),
      transactionFrom: asIso(row.transaction_from),
      transactionTo: asIso(row.transaction_to)
    };
  }

  private recordFactInMemory(params: {
    id: string;
    tenantId: string;
    kind: string;
    props: Record<string, any>;
    validFrom: Date;
    validTo?: Date;
    transactionFrom?: Date;
  }): void {
    const validFrom = params.validFrom;
    const validTo = params.validTo ?? new Date(this.FAR_FUTURE);
    const transactionFrom = params.transactionFrom ?? new Date();
    const farFuture = new Date(this.FAR_FUTURE);

    for (const row of this.inMemoryRows) {
      if (
        row.id === params.id &&
        row.tenantId === params.tenantId &&
        row.validFrom.toISOString() === validFrom.toISOString() &&
        row.transactionTo.toISOString() === farFuture.toISOString()
      ) {
        row.transactionTo = new Date(transactionFrom);
      }
    }

    this.inMemoryRows.push({
      id: params.id,
      tenantId: params.tenantId,
      kind: params.kind,
      props: { ...params.props },
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      transactionFrom: new Date(transactionFrom),
      transactionTo: farFuture,
    });
  }

  private queryAsOfInMemory(
    id: string,
    tenantId: string,
    asOfValid: Date,
    asOfTransaction: Date
  ): BitemporalEntity | null {
    const validAt = asOfValid.getTime();
    const txAt = asOfTransaction.getTime();

    const row = this.inMemoryRows
      .filter((item) => {
        return (
          item.id === id &&
          item.tenantId === tenantId &&
          item.validFrom.getTime() <= validAt &&
          item.validTo.getTime() > validAt &&
          item.transactionFrom.getTime() <= txAt &&
          item.transactionTo.getTime() > txAt
        );
      })
      .sort((a, b) => b.transactionFrom.getTime() - a.transactionFrom.getTime())[0];

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      kind: row.kind,
      props: row.props,
      validFrom: row.validFrom.toISOString(),
      validTo: row.validTo.toISOString(),
      transactionFrom: row.transactionFrom.toISOString(),
      transactionTo: row.transactionTo.toISOString(),
    };
  }
}

export const bitemporalService = BitemporalService.getInstance();
