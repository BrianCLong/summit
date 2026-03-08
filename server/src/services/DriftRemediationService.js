"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftRemediationService = exports.DriftRemediationService = void 0;
const logger_js_1 = require("../config/logger.js");
const postgres_js_1 = require("../db/postgres.js");
const tenantRouter_js_1 = require("../db/tenantRouter.js");
/**
 * Service for Auto-Remediation of Configuration Drift (Task #104).
 * Ensures that live routing and residency configs match the desired state.
 */
class DriftRemediationService {
    static instance;
    intervalId = null;
    constructor() { }
    static getInstance() {
        if (!DriftRemediationService.instance) {
            DriftRemediationService.instance = new DriftRemediationService();
        }
        return DriftRemediationService.instance;
    }
    start() {
        if (this.intervalId)
            return;
        logger_js_1.logger.info('DriftRemediationService: Starting drift correction loop');
        this.intervalId = setInterval(() => this.remediateDrift(), 300000); // Every 5 minutes
    }
    /**
     * Performs drift detection and remediation.
     */
    async remediateDrift() {
        logger_js_1.logger.info('DriftRemediation: Checking for configuration drift...');
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            // 1. Audit tenant_partitions against tenant_partition_map
            // Ensure every mapping points to a valid partition
            const orphanedMappings = await pool.query(`
        SELECT m.tenant_id, m.partition_key 
        FROM tenant_partition_map m
        LEFT JOIN tenant_partitions p ON m.partition_key = p.partition_key
        WHERE p.partition_key IS NULL
      `);
            if (orphanedMappings.rows.length > 0) {
                logger_js_1.logger.warn({ count: orphanedMappings.rows.length }, 'DriftRemediation: Found orphaned tenant mappings');
                for (const mapping of orphanedMappings.rows) {
                    logger_js_1.logger.info({ tenantId: mapping.tenant_id }, 'DriftRemediation: Resetting orphaned mapping to primary');
                    await pool.query("UPDATE tenant_partition_map SET partition_key = 'primary', updated_at = NOW() WHERE tenant_id = $1", [mapping.tenant_id]);
                }
                await tenantRouter_js_1.tenantRouter.refresh();
            }
            // 2. Audit residency configs for missing defaults
            // (Simplified example: ensure every tenant has a residency config)
            const missingConfigs = await pool.query(`
        SELECT t.id 
        FROM tenants t
        LEFT JOIN data_residency_configs c ON t.id = c.tenant_id
        WHERE c.tenant_id IS NULL AND t.is_active = true
      `);
            if (missingConfigs.rows.length > 0) {
                logger_js_1.logger.warn({ count: missingConfigs.rows.length }, 'DriftRemediation: Missing data residency configs');
                for (const tenant of missingConfigs.rows) {
                    logger_js_1.logger.info({ tenantId: tenant.id }, 'DriftRemediation: Creating default residency config');
                    await pool.query(`
            INSERT INTO data_residency_configs (id, tenant_id, region, country, jurisdiction, created_at)
            VALUES ($1, $2, 'us-east-1', 'US', 'US', NOW())
          `, [`residency-${tenant.id}-auto`, tenant.id]);
                }
            }
            logger_js_1.logger.info('DriftRemediation: Sync complete');
        }
        catch (err) {
            logger_js_1.logger.error({ err }, 'DriftRemediation: Error during drift correction');
        }
    }
}
exports.DriftRemediationService = DriftRemediationService;
exports.driftRemediationService = DriftRemediationService.getInstance();
