import { BulkOperationPayload, BulkOperationResponse, BulkItemResult, BulkContext, BulkItemInput } from './types.js';
import { handlers } from './handlers.js';
import { getPostgresPool } from '../db/postgres.js';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'BulkOperationService' });

export class BulkOperationService {
  private pgPool: any;

  constructor() {
      // Lazy load logic usually handled by getPool, but here we can try to init.
  }

  public setPool(pool: any) {
    this.pgPool = pool;
  }

  private getPool() {
      if (!this.pgPool) {
          try {
            this.pgPool = getPostgresPool();
          } catch (e: any) {
            // Ignore failure to load pool here
          }
      }
      return this.pgPool;
  }

  async process(context: BulkContext, payload: BulkOperationPayload): Promise<BulkOperationResponse> {
    const { operationType, items, atomic, dryRun } = payload;

    const handler = handlers[operationType];
    if (!handler) {
        throw new Error(`Unsupported bulk operation: ${operationType}`);
    }

    await handler.validate(payload.params);

    if (dryRun) {
        return {
            requestId: payload.requestId,
            summary: {
                total: items.length,
                success: items.length,
                failed: 0,
                ignored: 0
            },
            results: items.map(item => ({ itemId: item.id, status: 'success' }))
        };
    }

    // Check Idempotency
    const idempotencyResults = await this.checkIdempotency(context, items, payload);
    const itemsToProcess = items.filter(item => {
        const existing = idempotencyResults.find(r => r.itemId === item.id);
        return !existing; // Only process if not found in ledger
    });

    let newResults: BulkItemResult[] = [];
    if (itemsToProcess.length > 0) {
        if (atomic) {
            const opRes = await this.executeAtomic(context, itemsToProcess, payload, handler);
            newResults = opRes.results;
        } else {
            const opRes = await this.executeBestEffort(context, itemsToProcess, payload, handler);
            newResults = opRes.results;
        }
    }

    // Merge previous idempotency results with new results
    const allResults = [...idempotencyResults, ...newResults];

    // Save new results to ledger
    if (newResults.length > 0) {
        await this.recordResults(context, payload, newResults);
    }

    const summary = {
          total: items.length,
          success: allResults.filter(r => r.status === 'success').length,
          failed: allResults.filter(r => r.status === 'failure').length,
          ignored: allResults.filter(r => r.status === 'ignored').length
    };

    return {
        requestId: payload.requestId,
        summary,
        results: allResults
    };
  }

  private async checkIdempotency(context: BulkContext, items: BulkItemInput[], payload: BulkOperationPayload): Promise<BulkItemResult[]> {
      const results: BulkItemResult[] = [];
      const pool = this.getPool();
      if (!pool) return []; // Cannot check

      // We only check items that have an idempotency key
      const itemsWithKeys = items.filter(i => i.idempotencyKey);
      if (itemsWithKeys.length === 0) return [];

      try {
          // Check ledger
          // Assuming simple query for now.
          const keys = itemsWithKeys.map(i => i.idempotencyKey);
          const { rows } = await pool.query(
              `SELECT item_id, status, result_code, result_message
               FROM maestro.bulk_operations_ledger
               WHERE request_id = $1 AND idempotency_key = ANY($2::text[])`,
              [payload.requestId, keys]
          );

          for (const row of rows) {
              results.push({
                  itemId: row.item_id,
                  status: row.status,
                  code: row.result_code,
                  message: row.result_message
              });
          }
      } catch (e: any) {
          serviceLogger.warn({ error: e }, 'Failed to check idempotency ledger');
      }
      return results;
  }

  private async recordResults(context: BulkContext, payload: BulkOperationPayload, results: BulkItemResult[]) {
      const pool = this.getPool();
      if (!pool) return;

      // Map results back to inputs to get keys?
      // The results array has itemId. We need to find the input to get the key.
      const inputsMap = new Map(payload.items.map(i => [i.id, i]));

      const records = results.map(r => {
          const input = inputsMap.get(r.itemId);
          if (!input || !input.idempotencyKey) return null;
          return {
              request_id: payload.requestId,
              item_id: r.itemId,
              idempotency_key: input.idempotencyKey,
              tenant_id: context.tenantId || 'system',
              operation_type: payload.operationType,
              status: r.status,
              result_code: r.code,
              result_message: r.message
          };
      }).filter(Boolean);

      if (records.length === 0) return;

      try {
          // Batch insert
          // Construct query manually or loop? Loop is safer for now.
          // Or UNNEST
          const requestIds = records.map(r => r!.request_id);
          const itemIds = records.map(r => r!.item_id);
          const keys = records.map(r => r!.idempotency_key);
          const tenantIds = records.map(r => r!.tenant_id);
          const ops = records.map(r => r!.operation_type);
          const statuses = records.map(r => r!.status);
          const codes = records.map(r => r!.result_code);
          const messages = records.map(r => r!.result_message);

          await pool.query(
              `INSERT INTO maestro.bulk_operations_ledger
               (request_id, item_id, idempotency_key, tenant_id, operation_type, status, result_code, result_message)
               SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
               ON CONFLICT (request_id, item_id) DO NOTHING`,
              [requestIds, itemIds, keys, tenantIds, ops, statuses, codes, messages]
          );
      } catch (e: any) {
          serviceLogger.warn({ error: e }, 'Failed to record results to ledger');
      }
  }

  private async executeAtomic(
    context: BulkContext,
    items: BulkItemInput[],
    payload: BulkOperationPayload,
    handler: any
  ): Promise<BulkOperationResponse> {
      // @ts-ignore
      const pool = this.getPool();
      if (!pool) {
          throw new Error('Database pool not initialized');
      }
      const client = await pool.connect();
      try {
          await client.query('BEGIN');

          const atomicContext: BulkContext = {
              ...context,
              txClient: client
          };

          const results = await handler.execute(items, payload.params, atomicContext);
          const failures = results.filter((r: BulkItemResult) => r.status === 'failure');

          if (failures.length > 0) {
              await client.query('ROLLBACK');

              const finalResults = results.map((r: BulkItemResult) => {
                  if (r.status === 'success') {
                      return { ...r, status: 'failure', code: 'ATOMIC_ROLLBACK', message: 'Rolled back due to peer failure' };
                  }
                  return r;
              });

              return {
                  requestId: payload.requestId,
                  summary: {
                      total: items.length,
                      success: 0,
                      failed: items.length,
                      ignored: 0
                  },
                  results: finalResults as BulkItemResult[]
              };
          }

          await client.query('COMMIT');
          return {
              requestId: payload.requestId,
              summary: {
                  total: items.length,
                  success: results.length,
                  failed: 0,
                  ignored: 0
              },
              results
          };

      } catch (err: any) {
          await client.query('ROLLBACK');
          serviceLogger.error({ err, requestId: payload.requestId }, 'Atomic bulk operation failed systemically');
          throw err;
      } finally {
          client.release();
      }
  }

  private async executeBestEffort(
      context: BulkContext,
      items: BulkItemInput[],
      payload: BulkOperationPayload,
      handler: any
  ): Promise<BulkOperationResponse> {
      const results = await handler.execute(items, payload.params, context);

      const summary = {
          total: items.length,
          success: results.filter((r: BulkItemResult) => r.status === 'success').length,
          failed: results.filter((r: BulkItemResult) => r.status === 'failure').length,
          ignored: results.filter((r: BulkItemResult) => r.status === 'ignored').length
      };

      return {
          requestId: payload.requestId,
          summary,
          results
      };
  }
}
