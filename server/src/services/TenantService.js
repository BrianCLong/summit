"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = exports.TenantService = exports.createTenantSchema = exports.createTenantBaseSchema = void 0;
exports.buildSettingsWithHistory = buildSettingsWithHistory;
exports.buildRollbackSettings = buildRollbackSettings;
// @ts-nocheck
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const GAEnrollmentService_js_1 = __importDefault(require("./GAEnrollmentService.js"));
const metrics_js_1 = require("../utils/metrics.js");
// Input Validation Schema
exports.createTenantBaseSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    residency: zod_1.z.enum(['US', 'EU']),
    region: zod_1.z.string().optional(),
});
exports.createTenantSchema = exports.createTenantBaseSchema.transform(data => {
    // Default region based on residency
    if (!data.region) {
        data.region = data.residency === 'EU' ? 'eu-central-1' : 'us-east-1';
    }
    return data;
}).refine(data => {
    // Validate residency/region alignment
    if (data.residency === 'EU' && !data.region.startsWith('eu-')) {
        return false;
    }
    if (data.residency === 'US' && !data.region.startsWith('us-')) {
        return false;
    }
    return true;
}, {
    message: "Region must match residency (e.g., 'eu-central-1' for 'EU')",
    path: ["region"]
});
const SETTINGS_HISTORY_KEY = 'settings_history';
const SETTINGS_HISTORY_LIMIT = 10;
function sanitizeSettingsSnapshot(settings) {
    const snapshot = { ...(settings || {}) };
    delete snapshot[SETTINGS_HISTORY_KEY];
    return snapshot;
}
function buildSettingsWithHistory(currentSettings, updates, actorId, reason) {
    const sanitizedCurrent = sanitizeSettingsSnapshot(currentSettings);
    const history = Array.isArray(currentSettings?.[SETTINGS_HISTORY_KEY])
        ? currentSettings?.[SETTINGS_HISTORY_KEY]
        : [];
    const historyEntry = {
        id: (0, crypto_1.randomUUID)(),
        timestamp: new Date().toISOString(),
        actorId,
        reason,
        settings: sanitizedCurrent,
    };
    const nextHistory = [historyEntry, ...history].slice(0, SETTINGS_HISTORY_LIMIT);
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates[SETTINGS_HISTORY_KEY];
    return {
        settings: {
            ...sanitizedCurrent,
            ...sanitizedUpdates,
            [SETTINGS_HISTORY_KEY]: nextHistory,
        },
        historyEntry,
    };
}
function buildRollbackSettings(currentSettings, actorId, reason) {
    const history = Array.isArray(currentSettings?.[SETTINGS_HISTORY_KEY])
        ? currentSettings?.[SETTINGS_HISTORY_KEY]
        : [];
    if (!history.length) {
        throw new Error('No rollback history available');
    }
    const [latest, ...rest] = history;
    const sanitizedCurrent = sanitizeSettingsSnapshot(currentSettings);
    const rollbackEntry = {
        id: (0, crypto_1.randomUUID)(),
        timestamp: new Date().toISOString(),
        actorId,
        reason,
        settings: sanitizedCurrent,
    };
    const nextHistory = [rollbackEntry, ...rest].slice(0, SETTINGS_HISTORY_LIMIT);
    return {
        settings: {
            ...(latest.settings || {}),
            [SETTINGS_HISTORY_KEY]: nextHistory,
        },
        rolledBackTo: latest,
    };
}
class TenantService {
    static instance;
    metrics;
    constructor() {
        this.metrics = new metrics_js_1.PrometheusMetrics('summit_tenancy');
        this.metrics.createHistogram('tenant_creation_duration_seconds', 'Time taken to create a tenant', ['residency', 'tier']);
    }
    static getInstance() {
        if (!TenantService.instance) {
            TenantService.instance = new TenantService();
        }
        return TenantService.instance;
    }
    /**
     * Create a new tenant with self-serve guardrails
     */
    async createTenant(input, actorId) {
        const start = process.hrtime();
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            // 1. Validate Input
            const validated = exports.createTenantSchema.parse(input);
            // GA Enrollment Check for Tenant Creation
            const enrollmentCheck = await GAEnrollmentService_js_1.default.checkTenantEnrollmentEligibility(validated.region);
            if (!enrollmentCheck.eligible) {
                throw new Error(`Tenant creation rejected: ${enrollmentCheck.reason}`);
            }
            await client.query('BEGIN');
            // 2. Idempotency Check
            // If a tenant with the same slug exists, check if it was created by the same actor.
            // If so, return it (idempotency). If not, throw conflict.
            const existing = await client.query('SELECT * FROM tenants WHERE slug = $1', [validated.slug]);
            if (existing.rowCount && existing.rowCount > 0) {
                const existingTenant = this.mapRowToTenant(existing.rows[0]);
                if (existingTenant.createdBy === actorId) {
                    logger_js_1.default.info(`Idempotent creation for tenant ${existingTenant.slug} by user ${actorId}`);
                    await client.query('ROLLBACK');
                    return existingTenant;
                }
                throw new Error(`Tenant slug '${validated.slug}' is already taken.`);
            }
            // 3. Define Defaults (Guardrails)
            const defaults = {
                tier: 'starter',
                status: 'active',
                config: {
                    features: {
                        sso: false,
                        audit_logs: false,
                    },
                    security: {
                        mfa_enforced: false,
                    },
                },
                settings: {
                    theme: 'light',
                },
            };
            // 4. Create Tenant in DB
            const tenantId = (0, crypto_1.randomUUID)();
            const insertQuery = `
        INSERT INTO tenants (
          id, name, slug, residency, region, tier, status, config, settings, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
      `;
            const result = await client.query(insertQuery, [
                tenantId,
                validated.name,
                validated.slug,
                validated.residency,
                validated.region,
                defaults.tier,
                defaults.status,
                defaults.config,
                defaults.settings,
                actorId
            ]);
            const tenant = this.mapRowToTenant(result.rows[0]);
            // 5. Initialize Quotas
            logger_js_1.default.info(`Initialized quotas for tenant ${tenantId} (Tier: starter)`);
            // 6. Record Audit Event
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'TENANT_CREATED',
                actor: {
                    id: actorId || 'system',
                    role: 'admin'
                },
                metadata: {
                    tenantId: tenant.id,
                    residency: tenant.residency,
                    tier: tenant.tier
                },
                artifacts: []
            });
            // 7. Associate User with Tenant (Set as their active tenant and grant admin)
            // Assuming 'users' table has tenant_id.
            // Also assuming we want to move the user into this tenant.
            await client.query('UPDATE users SET tenant_id = $1, role = $2 WHERE id = $3', [tenantId, 'ADMIN', actorId]);
            await client.query('COMMIT');
            logger_js_1.default.info(`Tenant created successfully: ${tenant.slug} (${tenant.id})`);
            const [seconds, nanoseconds] = process.hrtime(start);
            const duration = seconds + nanoseconds / 1e9;
            this.metrics.observeHistogram('tenant_creation_duration_seconds', {
                residency: tenant.residency,
                tier: tenant.tier
            }, duration);
            return tenant;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to create tenant:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get tenant by ID
     */
    async getTenant(id) {
        const pool = (0, database_js_1.getPostgresPool)();
        const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToTenant(result.rows[0]);
    }
    /**
     * Get tenant by Slug
     */
    async getTenantBySlug(slug) {
        const pool = (0, database_js_1.getPostgresPool)();
        const result = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToTenant(result.rows[0]);
    }
    async listTenants(limit = 100, offset = 0) {
        const pool = (0, database_js_1.getPostgresPool)();
        const result = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows.map(this.mapRowToTenant);
    }
    async updateSettings(tenantId, settings, actorId, reason = 'settings_update') {
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
            if (!existing.rowCount) {
                throw new Error('Tenant not found');
            }
            const { settings: mergedSettings } = buildSettingsWithHistory(existing.rows[0].settings || {}, settings, actorId, reason);
            const result = await client.query('UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [mergedSettings, tenantId]);
            const tenant = this.mapRowToTenant(result.rows[0]);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'TENANT_SETTINGS_UPDATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    updatedKeys: Object.keys(settings),
                    reason,
                    settingsHash: (0, crypto_1.createHash)('sha256')
                        .update(JSON.stringify(mergedSettings))
                        .digest('hex'),
                },
                artifacts: [],
            });
            await client.query('COMMIT');
            return tenant;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to update tenant settings', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async disableTenant(tenantId, actorId, reason) {
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
            if (!existing.rowCount) {
                throw new Error('Tenant not found');
            }
            const current = this.mapRowToTenant(existing.rows[0]);
            if (current.status === 'disabled') {
                await client.query('ROLLBACK');
                return current;
            }
            const enrichedConfig = {
                ...(current.config || {}),
                lifecycle: {
                    ...(current.config?.lifecycle || {}),
                    disabledAt: new Date().toISOString(),
                    reason,
                    actorId,
                },
            };
            const result = await client.query('UPDATE tenants SET status = $1, config = $2, updated_at = NOW() WHERE id = $3 RETURNING *', ['disabled', enrichedConfig, tenantId]);
            const tenant = this.mapRowToTenant(result.rows[0]);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'TENANT_DISABLED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    previousStatus: current.status,
                    reason,
                },
                artifacts: [],
            });
            await client.query('COMMIT');
            return tenant;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to disable tenant', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async rollbackSettings(tenantId, actorId, reason = 'settings_rollback') {
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
            if (!existing.rowCount) {
                throw new Error('Tenant not found');
            }
            const { settings: mergedSettings, rolledBackTo } = buildRollbackSettings(existing.rows[0].settings || {}, actorId, reason);
            const result = await client.query('UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [mergedSettings, tenantId]);
            const tenant = this.mapRowToTenant(result.rows[0]);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'TENANT_SETTINGS_ROLLBACK',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    reason,
                    rolledBackTo: rolledBackTo.id,
                },
                artifacts: [],
            });
            await client.query('COMMIT');
            return { tenant, rolledBackTo };
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to rollback tenant settings', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getTenantSettings(id) {
        const tenant = await this.getTenant(id);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return {
            id: tenant.id,
            settings: tenant.settings,
            config: tenant.config,
            status: tenant.status,
        };
    }
    mapRowToTenant(row) {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            region: row.region,
            residency: row.residency,
            tier: row.tier,
            status: row.status,
            config: row.config,
            settings: row.settings,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.TenantService = TenantService;
exports.tenantService = TenantService.getInstance();
