
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

/**
 * Service for Bitemporal Knowledge Tracking (Task #109).
 * Tracks facts across both Valid Time and Transaction Time.
 */
export class BitemporalService {
  private static instance: BitemporalService;

  private constructor() {}

  public static getInstance(): BitemporalService {
    if (!BitemporalService.instance) {
      BitemporalService.instance = new BitemporalService();
    }
    return BitemporalService.instance;
  }

  /**
   * Records a new bitemporal fact.
   * If a fact already exists for the given ID and Valid Time, it "retires" the old system record.
   */
  public async recordFact(entity: Omit<BitemporalEntity, 'validTo' | 'transactionFrom' | 'transactionTo'>): Promise<void> {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. "Retire" the previous system record for this entity/valid-time slice
      // by setting transactionTo = NOW()
      await client.query(
        `UPDATE bitemporal_entities 
         SET transaction_to = NOW() 
         WHERE id = $1 AND tenant_id = $2 AND transaction_to = '9999-12-31 23:59:59+00' AND valid_from = $3`,
        [entity.id, entity.tenantId, entity.validFrom]
      );

      // 2. Insert the new system record
      await client.query(
        `INSERT INTO bitemporal_entities (id, tenant_id, kind, props, valid_from, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entity.id, entity.tenantId, entity.kind, JSON.stringify(entity.props), entity.validFrom, 'system']
      );

      await client.query('COMMIT');
      logger.info({ entityId: entity.id }, 'BitemporalService: Fact recorded');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err }, 'BitemporalService: Failed to record fact');
      throw err;
    } finally {
      client.release();
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
    
    const result = await pool.query(
      `SELECT * FROM bitemporal_entities 
       WHERE id = $1 AND tenant_id = $2
       AND valid_from <= $3 AND valid_to > $3
       AND transaction_from <= $4 AND transaction_to > $4
       LIMIT 1`,
      [id, tenantId, asOfValid.toISOString(), asOfTransaction.toISOString()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      kind: row.kind,
      props: row.props,
      validFrom: row.valid_from.toISOString(),
      validTo: row.valid_to.toISOString(),
      transactionFrom: row.transaction_from.toISOString(),
      transactionTo: row.transaction_to.toISOString()
    };
  }
}

export const bitemporalService = BitemporalService.getInstance();
