"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResidencyGuard = exports.ResidencyViolationError = void 0;
const residency_service_js_1 = require("./residency-service.js");
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const regional_js_1 = require("../config/regional.js");
class ResidencyViolationError extends Error {
    tenantId;
    context;
    constructor(message, tenantId, context) {
        super(message);
        this.tenantId = tenantId;
        this.context = context;
        this.name = 'ResidencyViolationError';
    }
}
exports.ResidencyViolationError = ResidencyViolationError;
class ResidencyGuard {
    static instance;
    residencyService;
    currentRegion;
    configCache = new Map();
    CACHE_TTL_MS = 60 * 1000; // 1 minute
    constructor() {
        this.residencyService = new residency_service_js_1.DataResidencyService();
        this.currentRegion = process.env.SUMMIT_REGION || process.env.REGION || 'us-east-1';
    }
    static getInstance() {
        if (!ResidencyGuard.instance) {
            ResidencyGuard.instance = new ResidencyGuard();
        }
        return ResidencyGuard.instance;
    }
    /**
     * Enforces residency rules for a given operation.
     * Throws ResidencyViolationError if the operation violates the policy.
     */
    async enforce(tenantId, context) {
        const span = otel_tracing_js_1.otelService.createSpan('residency.enforce');
        try {
            // Self-check: Is the current region allowed for this tenant?
            // If targetRegion is different from currentRegion, we need to check transfer rules.
            const config = await this.getResidencyConfig(tenantId);
            if (!config) {
                // Default to strict if no config? Or allow?
                // Prompt says "No undocumented exceptions", "Only enforced boundaries with evidence".
                // Safest is to fail if no policy exists, or assume default region is the ONLY allowed region if inferred.
                // For now, if no config, we assume the tenant is native to the current region and block cross-region.
                if (context.targetRegion !== this.currentRegion) {
                    throw new ResidencyViolationError(`No residency policy found. Strictly blocking cross-region access to ${context.targetRegion}.`, tenantId, context);
                }
                return;
            }
            const isStrict = config.residencyMode === 'strict';
            // 1. Check if target region is allowed globally for the tenant
            const isPrimary = config.primaryRegion === context.targetRegion;
            const isAllowed = config.allowedRegions.includes(context.targetRegion);
            if (!isPrimary && !isAllowed) {
                // Check exceptions
                const activeException = await this.checkExceptions(tenantId, context.targetRegion, context.operation);
                if (!activeException) {
                    // v2: Cross-check with Regional Catalog for sovereign boundaries
                    if (context.operation === 'export' && config.country) {
                        const regionalPolicy = regional_js_1.REGIONAL_CATALOG[config.country];
                        if (regionalPolicy && !regionalPolicy.residency.allowedTransferTargets.includes(context.targetRegion)) {
                            throw new ResidencyViolationError(`Export to ${context.targetRegion} is prohibited by sovereign policy for ${config.country}.`, tenantId, context);
                        }
                    }
                    const errorMsg = `Region ${context.targetRegion} is not allowed for tenant ${tenantId}.`;
                    if (isStrict) {
                        throw new ResidencyViolationError(errorMsg, tenantId, context);
                    }
                    else {
                        // In preferred mode, we might log a warning but allow if it's a critical operation?
                        console.warn(`[Residency Warning] ${errorMsg} (Mode: Preferred)`);
                        otel_tracing_js_1.otelService.addSpanAttributes({ 'residency.warning': errorMsg });
                    }
                }
            }
            // 2. Check Data Classification constraints
            if (context.dataClassification) {
                const classificationRules = config.dataClassifications?.[context.dataClassification];
                if (classificationRules) {
                    const allowedForScope = classificationRules[context.operation]; // e.g. storage: ['us-east-1']
                    if (allowedForScope && !allowedForScope.includes(context.targetRegion)) {
                        const errorMsg = `Data classification ${context.dataClassification} prohibits ${context.operation} in ${context.targetRegion}.`;
                        if (isStrict) {
                            throw new ResidencyViolationError(errorMsg, tenantId, context);
                        }
                        else {
                            console.warn(`[Residency Classification Warning] ${errorMsg}`);
                        }
                    }
                }
            }
            // 3. Log success
            otel_tracing_js_1.otelService.addSpanAttributes({
                'residency.status': 'allowed',
                'residency.tenant': tenantId,
                'residency.target_region': context.targetRegion,
                'residency.mode': config.residencyMode
            });
        }
        catch (error) {
            otel_tracing_js_1.otelService.addSpanAttributes({
                'residency.status': 'violated',
                'residency.error': error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Checks if an agent is allowed to execute in the current region/target region.
     */
    async validateAgentExecution(tenantId) {
        return this.enforce(tenantId, {
            operation: 'compute',
            targetRegion: this.currentRegion,
            dataClassification: 'internal' // Default for agent execution unless specified
        });
    }
    /**
     * Checks if export to a target region is allowed.
     */
    async checkExportCompliance(tenantId, targetRegion, classification) {
        return this.enforce(tenantId, {
            operation: 'export',
            targetRegion: targetRegion,
            dataClassification: classification
        });
    }
    /**
     * Checks if a region is allowed for a tenant without throwing.
     */
    async isRegionAllowed(tenantId, region, operation = 'storage') {
        try {
            const config = await this.getResidencyConfig(tenantId);
            if (!config)
                return region === this.currentRegion;
            const isAllowed = config.primaryRegion === region || config.allowedRegions.includes(region);
            if (isAllowed)
                return true;
            return await this.checkExceptions(tenantId, region, operation);
        }
        catch (error) {
            console.error('isRegionAllowed check failed:', error);
            return false;
        }
    }
    async getResidencyConfig(tenantId) {
        const now = Date.now();
        const cached = this.configCache.get(tenantId);
        if (cached && cached.expiresAt > now) {
            return cached.config;
        }
        const pool = (0, postgres_js_1.getPostgresPool)();
        // Task #97: Join with tenant_partitions to get the authoritative region for this tenant
        const result = await pool.query(`SELECT c.*, p.region as shard_region 
             FROM data_residency_configs c
             LEFT JOIN tenant_partitions p ON c.tenant_id = p.tenant_id
             WHERE c.tenant_id = $1`, [tenantId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        // Authoritative region is from shard configuration, falling back to policy config
        const primaryRegion = row.shard_region || row.region;
        const parseSafe = (val) => {
            if (!val || val === '')
                return [];
            try {
                return typeof val === 'string' ? JSON.parse(val) : val;
            }
            catch (e) {
                return [];
            }
        };
        const allowedRegions = parseSafe(row.allowed_regions || row.allowed_transfers);
        // Ensure primary region is in allowed list if not explicitly there
        if (primaryRegion && !allowedRegions.includes(primaryRegion)) {
            allowedRegions.push(primaryRegion);
        }
        const config = {
            primaryRegion,
            allowedRegions,
            country: row.country,
            residencyMode: row.residency_mode || 'strict',
            dataClassifications: {
                'confidential': {
                    'storage': [primaryRegion], // Strict default
                    'compute': [primaryRegion],
                    'logs': [primaryRegion],
                    'backups': [primaryRegion],
                    'export': [primaryRegion]
                },
                'restricted': {
                    'storage': [primaryRegion],
                    'export': [primaryRegion]
                }
            }
        };
        this.configCache.set(tenantId, {
            config,
            expiresAt: now + this.CACHE_TTL_MS
        });
        return config;
    }
    /**
     * Checks if a specific feature is allowed for a tenant based on their regional policy.
     */
    async validateFeatureAccess(tenantId, feature) {
        const config = await this.getResidencyConfig(tenantId);
        if (!config || !config.country)
            return true; // Default to true if unknown
        const regionalPolicy = regional_js_1.REGIONAL_CATALOG[config.country];
        if (!regionalPolicy)
            return true;
        return !!regionalPolicy.features[feature];
    }
    async checkExceptions(tenantId, region, operation) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            const result = await pool.query(`SELECT * FROM residency_exceptions
                 WHERE tenant_id = $1
                 AND target_region = $2
                 AND (scope = $3 OR scope = '*')
                 AND (expires_at IS NULL OR expires_at > NOW())`, [tenantId, region, operation]);
            return result.rows.length > 0;
        }
        catch (e) {
            // Log real error unless it's just "table doesn't exist" during bootstrap
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes('relation "residency_exceptions" does not exist')) {
                console.error('Residency Exception Check Failed:', e);
            }
            return false;
        }
    }
}
exports.ResidencyGuard = ResidencyGuard;
