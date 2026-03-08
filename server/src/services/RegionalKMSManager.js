"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionalKMSManager = exports.RegionalKMSManager = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class RegionalKMSManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!RegionalKMSManager.instance) {
            RegionalKMSManager.instance = new RegionalKMSManager();
        }
        return RegionalKMSManager.instance;
    }
    /**
     * Retrieves the KMS configuration for a specific tenant in a target region.
     */
    async getKMSConfig(tenantId, region) {
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            const result = await pool.query(`SELECT * FROM kms_configs 
                 WHERE tenant_id = $1 AND region = $2 AND status = 'active'
                 LIMIT 1`, [tenantId, region]);
            if (result.rows.length === 0) {
                logger_js_1.default.warn({ tenantId, region }, 'No active KMS configuration found for tenant in target region');
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
        }
        catch (error) {
            logger_js_1.default.error({ error, tenantId, region }, 'Failed to fetch regional KMS configuration');
            throw error;
        }
    }
}
exports.RegionalKMSManager = RegionalKMSManager;
exports.regionalKMSManager = RegionalKMSManager.getInstance();
