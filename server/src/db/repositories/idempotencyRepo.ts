import { pg } from '../pg.js';

export interface IdempotencyRecord {
    key: string;
    tenantId: string;
    resourceId?: string;
    responsePayload?: any;
    createdAt: Date;
    expiresAt?: Date;
}

export class IdempotencyRepository {
    async findByKey(tenantId: string, key: string): Promise<IdempotencyRecord | null> {
        return pg.oneOrNone(
            `SELECT key, tenant_id as "tenantId", resource_id as "resourceId", 
              response_payload as "responsePayload", created_at as "createdAt", 
              expires_at as "expiresAt"
       FROM idempotency_keys
       WHERE tenant_id = $1 AND key = $2`,
            [tenantId, key],
            { tenantId }
        );
    }

    async save(record: Partial<IdempotencyRecord> & { key: string; tenantId: string }): Promise<void> {
        await pg.write(
            `INSERT INTO idempotency_keys (key, tenant_id, resource_id, response_payload, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, key) 
       DO UPDATE SET 
         resource_id = EXCLUDED.resource_id,
         response_payload = EXCLUDED.response_payload,
         expires_at = EXCLUDED.expires_at`,
            [
                record.key,
                record.tenantId,
                record.resourceId || null,
                record.responsePayload ? JSON.stringify(record.responsePayload) : null,
                record.expiresAt || null
            ],
            { tenantId: record.tenantId }
        );
    }

    async deleteExpired(): Promise<number> {
        const result = await pg.write(
            'DELETE FROM idempotency_keys WHERE expires_at < NOW()',
            []
        );
        return result.rowCount || 0;
    }
}

export const idempotencyRepo = new IdempotencyRepository();
