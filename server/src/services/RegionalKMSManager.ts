import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';

export interface KMSConfig {
    id: string;
    tenantId: string;
    region: string;
    provider: string; // e.g., 'aws', 'gcp', 'vultr'
    kmsKeyId: string;
    status: 'active' | 'rotated' | 'revoked';
}

export class RegionalKMSManager {
    private static instance: RegionalKMSManager;

    private constructor() { }

    public static getInstance(): RegionalKMSManager {
        if (!RegionalKMSManager.instance) {
            RegionalKMSManager.instance = new RegionalKMSManager();
        }
        return RegionalKMSManager.instance;
    }

    /**
     * Retrieves the KMS configuration for a specific tenant in a target region.
     */
    async getKMSConfig(tenantId: string, region: string): Promise<KMSConfig | null> {
        const pool = getPostgresPool();

        try {
            const result = await pool.query(
                `SELECT * FROM kms_configs
                 WHERE tenant_id = $1 AND region = $2 AND status = 'active'
                 LIMIT 1`,
                [tenantId, region]
            );

            if (result.rows.length === 0) {
                logger.warn({ tenantId, region }, 'No active KMS configuration found for tenant in target region');
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                tenantId: row.tenant_id,
                region: row.region,
                provider: row.provider,
                kmsKeyId: row.key_id || row.kms_key_id,
                status: row.status
            };
        } catch (error) {
            logger.error({ error, tenantId, region }, 'Failed to fetch regional KMS configuration');
            throw error;
        }
    }
}

export const regionalKMSManager = RegionalKMSManager.getInstance();
