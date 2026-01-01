import { getPostgresPool } from '../../config/database.js';
import { QuotaManager } from '../../lib/resources/quota-manager.js';
import logger from '../../config/logger.js';

export class SubscriptionPersistence {
    private static instance: SubscriptionPersistence;

    private constructor() {}

    public static getInstance(): SubscriptionPersistence {
        if (!SubscriptionPersistence.instance) {
            SubscriptionPersistence.instance = new SubscriptionPersistence();
        }
        return SubscriptionPersistence.instance;
    }

    /**
     * Initializes the subscription tables if they don't exist.
     * In a real production system, this should be a migration.
     */
    public async initializeSchema(): Promise<void> {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS tenant_subscriptions (
                    tenant_id VARCHAR(255) PRIMARY KEY,
                    tier VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            logger.info('SubscriptionPersistence: Schema initialized.');
        } catch (error) {
            logger.error('SubscriptionPersistence: Failed to initialize schema', error);
            throw error;
        } finally {
            client.release();
        }
    }

    public async getSubscription(tenantId: string): Promise<string | null> {
        const pool = getPostgresPool();
        const result = await pool.read(
            `SELECT tier FROM tenant_subscriptions WHERE tenant_id = $1`,
            [tenantId]
        );

        if (result.rowCount && result.rowCount > 0) {
            return result.rows[0].tier;
        }
        return null;
    }

    /**
     * Retrieves all active subscriptions.
     * Used for hydration on startup.
     */
    public async getAllSubscriptions(): Promise<Array<{ tenantId: string, tier: string }>> {
        const pool = getPostgresPool();
        const result = await pool.read(
            `SELECT tenant_id, tier FROM tenant_subscriptions`
        );

        return result.rows.map(row => ({
            tenantId: row.tenant_id,
            tier: row.tier
        }));
    }

    public async upsertSubscription(tenantId: string, tier: string): Promise<void> {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO tenant_subscriptions (tenant_id, tier, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (tenant_id)
                DO UPDATE SET tier = EXCLUDED.tier, updated_at = NOW()
            `, [tenantId, tier]);
        } finally {
            client.release();
        }
    }
}

export const subscriptionPersistence = SubscriptionPersistence.getInstance();
