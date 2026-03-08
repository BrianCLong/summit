"use strict";
// @ts-nocheck
/**
 * CompanyOS User and Role Sync Service
 * Bi-directional synchronization between CompanyOS and Summit RBAC systems
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyOSSyncService = void 0;
const eventemitter3_1 = require("eventemitter3");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const node_cron_1 = __importDefault(require("node-cron"));
const types_js_1 = require("./types.js");
class CompanyOSSyncService extends eventemitter3_1.EventEmitter {
    db;
    redis;
    logger;
    configs = new Map();
    syncJobs = new Map();
    isProcessing = new Map();
    constructor(config) {
        super();
        this.db = config.postgres;
        this.redis = config.redis;
        this.logger = config.logger || (0, pino_1.default)({ name: 'companyos-sync' });
    }
    /**
     * Initialize the sync service
     */
    async initialize() {
        await this.createTables();
        await this.loadConfigurations();
        this.logger.info('CompanyOS Sync Service initialized');
    }
    /**
     * Create necessary database tables
     */
    async createTables() {
        await this.db.query(`
      CREATE SCHEMA IF NOT EXISTS companyos_sync;

      CREATE TABLE IF NOT EXISTS companyos_sync.users (
        id UUID PRIMARY KEY,
        external_id VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        title VARCHAR(255),
        companyos_roles TEXT[] DEFAULT '{}',
        teams TEXT[] DEFAULT '{}',
        tenant_id VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        on_call_eligible BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS companyos_sync.role_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        companyos_role VARCHAR(50) NOT NULL,
        summit_roles TEXT[] NOT NULL,
        permissions TEXT[] DEFAULT '{}',
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, companyos_role)
      );

      CREATE TABLE IF NOT EXISTS companyos_sync.sync_events (
        id UUID PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        target VARCHAR(50) NOT NULL,
        user_id UUID,
        tenant_id VARCHAR(255) NOT NULL,
        changes JSONB DEFAULT '{}',
        previous_state JSONB,
        new_state JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        error TEXT,
        correlation_id UUID NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        FOREIGN KEY (user_id) REFERENCES companyos_sync.users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS companyos_sync.sync_configs (
        tenant_id VARCHAR(255) PRIMARY KEY,
        enabled BOOLEAN DEFAULT true,
        direction VARCHAR(50) DEFAULT 'bidirectional',
        sync_interval INTEGER DEFAULT 300,
        conflict_resolution VARCHAR(50) DEFAULT 'latest_wins',
        field_mappings JSONB DEFAULT '{}',
        exclude_patterns TEXT[] DEFAULT '{}',
        webhook_url VARCHAR(500),
        retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoffMs": 1000, "maxBackoffMs": 30000}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS companyos_sync.conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        field VARCHAR(255) NOT NULL,
        companyos_value JSONB,
        summit_value JSONB,
        resolved_value JSONB,
        strategy VARCHAR(50),
        resolved_at TIMESTAMPTZ,
        resolved_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES companyos_sync.users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sync_users_tenant ON companyos_sync.users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sync_users_email ON companyos_sync.users(email);
      CREATE INDEX IF NOT EXISTS idx_sync_events_tenant ON companyos_sync.sync_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sync_events_status ON companyos_sync.sync_events(status);
      CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON companyos_sync.sync_events(timestamp);
    `);
    }
    /**
     * Load sync configurations from database
     */
    async loadConfigurations() {
        const result = await this.db.query('SELECT * FROM companyos_sync.sync_configs');
        for (const row of result.rows) {
            const config = {
                tenantId: row.tenant_id,
                enabled: row.enabled,
                direction: row.direction,
                syncInterval: row.sync_interval,
                conflictResolution: row.conflict_resolution,
                roleMappings: await this.loadRoleMappings(row.tenant_id),
                fieldMappings: row.field_mappings,
                excludePatterns: row.exclude_patterns,
                webhookUrl: row.webhook_url,
                retryPolicy: row.retry_policy,
            };
            this.configs.set(row.tenant_id, config);
            if (config.enabled) {
                this.scheduleSyncJob(config);
            }
        }
    }
    /**
     * Load role mappings for a tenant
     */
    async loadRoleMappings(tenantId) {
        const result = await this.db.query(`SELECT * FROM companyos_sync.role_mappings
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY priority DESC`, [tenantId]);
        if (result.rows.length === 0) {
            return types_js_1.DEFAULT_ROLE_MAPPINGS;
        }
        return result.rows.map((row) => ({
            companyOSRole: row.companyos_role,
            summitRoles: row.summit_roles,
            permissions: row.permissions,
            priority: row.priority,
        }));
    }
    /**
     * Configure sync for a tenant
     */
    async configureTenant(config) {
        await this.db.query(`INSERT INTO companyos_sync.sync_configs
       (tenant_id, enabled, direction, sync_interval, conflict_resolution, field_mappings, exclude_patterns, webhook_url, retry_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         direction = EXCLUDED.direction,
         sync_interval = EXCLUDED.sync_interval,
         conflict_resolution = EXCLUDED.conflict_resolution,
         field_mappings = EXCLUDED.field_mappings,
         exclude_patterns = EXCLUDED.exclude_patterns,
         webhook_url = EXCLUDED.webhook_url,
         retry_policy = EXCLUDED.retry_policy,
         updated_at = NOW()`, [
            config.tenantId,
            config.enabled,
            config.direction,
            config.syncInterval,
            config.conflictResolution,
            JSON.stringify(config.fieldMappings),
            config.excludePatterns || [],
            config.webhookUrl,
            JSON.stringify(config.retryPolicy),
        ]);
        // Save role mappings
        for (const mapping of config.roleMappings) {
            await this.db.query(`INSERT INTO companyos_sync.role_mappings
         (tenant_id, companyos_role, summit_roles, permissions, priority)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, companyos_role) DO UPDATE SET
           summit_roles = EXCLUDED.summit_roles,
           permissions = EXCLUDED.permissions,
           priority = EXCLUDED.priority,
           updated_at = NOW()`, [config.tenantId, mapping.companyOSRole, mapping.summitRoles, mapping.permissions, mapping.priority]);
        }
        this.configs.set(config.tenantId, config);
        // Update scheduled job
        if (this.syncJobs.has(config.tenantId)) {
            this.syncJobs.get(config.tenantId)?.stop();
            this.syncJobs.delete(config.tenantId);
        }
        if (config.enabled) {
            this.scheduleSyncJob(config);
        }
        this.logger.info({ tenantId: config.tenantId }, 'Tenant sync configuration updated');
    }
    /**
     * Schedule periodic sync job
     */
    scheduleSyncJob(config) {
        const intervalMinutes = Math.max(1, Math.floor(config.syncInterval / 60));
        const cronExpression = `*/${intervalMinutes} * * * *`;
        const job = node_cron_1.default.schedule(cronExpression, async () => {
            try {
                await this.syncTenant(config.tenantId);
            }
            catch (error) {
                this.logger.error({ tenantId: config.tenantId, error }, 'Scheduled sync failed');
            }
        });
        this.syncJobs.set(config.tenantId, job);
        this.logger.info({ tenantId: config.tenantId, interval: intervalMinutes }, 'Sync job scheduled');
    }
    /**
     * Sync all users for a tenant
     */
    async syncTenant(tenantId) {
        const config = this.configs.get(tenantId);
        if (!config || !config.enabled) {
            throw new Error(`Sync not configured or disabled for tenant: ${tenantId}`);
        }
        if (this.isProcessing.get(tenantId)) {
            this.logger.warn({ tenantId }, 'Sync already in progress');
            return this.getStats(tenantId);
        }
        this.isProcessing.set(tenantId, true);
        const correlationId = (0, crypto_1.randomUUID)();
        const startTime = Date.now();
        const stats = {
            lastSyncAt: new Date(),
            totalSynced: 0,
            usersCreated: 0,
            usersUpdated: 0,
            usersDeleted: 0,
            rolesAssigned: 0,
            rolesRevoked: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            errors: 0,
            averageSyncDurationMs: 0,
        };
        try {
            this.emit('sync:started', correlationId);
            await this.recordEvent({
                type: 'sync_started',
                source: 'companyos',
                target: 'summit',
                tenantId,
                correlationId,
            });
            // Fetch users from CompanyOS
            const companyOSUsers = await this.fetchCompanyOSUsers(tenantId);
            // Fetch users from Summit
            const summitUsers = await this.fetchSummitUsers(tenantId);
            // Create maps for comparison
            const companyOSMap = new Map(companyOSUsers.map((u) => [u.email, u]));
            const summitMap = new Map(summitUsers.map((u) => [u.email, u]));
            // Process users based on sync direction
            if (config.direction === 'bidirectional' || config.direction === 'companyos_to_summit') {
                for (const [email, cosUser] of companyOSMap) {
                    try {
                        const summitUser = summitMap.get(email);
                        if (summitUser) {
                            // Update existing user
                            const conflicts = this.detectConflicts(cosUser, summitUser);
                            if (conflicts.length > 0) {
                                stats.conflictsDetected += conflicts.length;
                                for (const conflict of conflicts) {
                                    const resolution = await this.resolveConflict(conflict, config.conflictResolution);
                                    stats.conflictsResolved++;
                                    this.emit('conflict:resolved', resolution);
                                }
                            }
                            await this.syncUserToSummit(cosUser, summitUser, config);
                            stats.usersUpdated++;
                        }
                        else {
                            // Create new user in Summit
                            await this.createSummitUser(cosUser, config);
                            stats.usersCreated++;
                        }
                        stats.totalSynced++;
                    }
                    catch (error) {
                        this.logger.error({ email, error }, 'Failed to sync user');
                        stats.errors++;
                    }
                }
            }
            if (config.direction === 'bidirectional' || config.direction === 'summit_to_companyos') {
                for (const [email, summitUser] of summitMap) {
                    if (!companyOSMap.has(email)) {
                        try {
                            // Create user in CompanyOS
                            await this.createCompanyOSUser(summitUser, config);
                            stats.usersCreated++;
                            stats.totalSynced++;
                        }
                        catch (error) {
                            this.logger.error({ email, error }, 'Failed to sync user to CompanyOS');
                            stats.errors++;
                        }
                    }
                }
            }
            stats.averageSyncDurationMs = Date.now() - startTime;
            await this.recordEvent({
                type: 'sync_completed',
                source: 'companyos',
                target: 'summit',
                tenantId,
                correlationId,
                changes: stats,
            });
            // Cache stats
            await this.redis.set(`companyos-sync:stats:${tenantId}`, JSON.stringify(stats), 'EX', 3600);
            this.emit('sync:completed', stats);
            this.logger.info({ tenantId, stats }, 'Sync completed');
            return stats;
        }
        catch (error) {
            await this.recordEvent({
                type: 'sync_failed',
                source: 'companyos',
                target: 'summit',
                tenantId,
                correlationId,
                error: error.message,
            });
            this.emit('sync:failed', error);
            throw error;
        }
        finally {
            this.isProcessing.set(tenantId, false);
        }
    }
    /**
     * Fetch users from CompanyOS
     */
    async fetchCompanyOSUsers(tenantId) {
        const result = await this.db.query(`SELECT * FROM companyos_sync.users WHERE tenant_id = $1 AND source = 'companyos'`, [tenantId]);
        return result.rows.map((row) => this.rowToCompanyOSUser(row));
    }
    /**
     * Fetch users from Summit
     */
    async fetchSummitUsers(tenantId) {
        const result = await this.db.query(`SELECT * FROM maestro.users WHERE tenant_id = $1`, [tenantId]);
        return result.rows.map((row) => this.rowToSummitUser(row));
    }
    /**
     * Create user in Summit from CompanyOS data
     */
    async createSummitUser(cosUser, config) {
        const mappedRoles = this.mapRolesToSummit(cosUser.companyOSRoles, config.roleMappings);
        const permissions = this.aggregatePermissions(cosUser.companyOSRoles, config.roleMappings);
        await this.db.query(`INSERT INTO maestro.users
       (id, external_id, email, name, role, tenant_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (email, tenant_id) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         updated_at = NOW()`, [
            cosUser.id,
            cosUser.externalId,
            cosUser.email,
            cosUser.displayName,
            mappedRoles[0] || 'viewer',
            cosUser.tenantId,
        ]);
        // Store permissions in Redis for fast lookup
        await this.redis.sadd(`user:permissions:${cosUser.id}`, ...permissions);
        await this.redis.expire(`user:permissions:${cosUser.id}`, 3600);
        await this.recordEvent({
            type: 'user_created',
            source: 'companyos',
            target: 'summit',
            userId: cosUser.id,
            tenantId: cosUser.tenantId,
            correlationId: (0, crypto_1.randomUUID)(),
            newState: cosUser,
        });
        this.emit('user:created', cosUser);
    }
    /**
     * Create user in CompanyOS from Summit data
     */
    async createCompanyOSUser(summitUser, config) {
        const companyOSRoles = this.mapRolesToCompanyOS(summitUser.role, config.roleMappings);
        const cosUser = {
            id: summitUser.id,
            externalId: summitUser.externalId,
            email: summitUser.email,
            firstName: summitUser.name.split(' ')[0] || '',
            lastName: summitUser.name.split(' ').slice(1).join(' ') || '',
            displayName: summitUser.name,
            companyOSRoles,
            teams: [],
            tenantId: summitUser.tenantId,
            source: 'summit',
            isActive: summitUser.isActive,
            onCallEligible: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.db.query(`INSERT INTO companyos_sync.users
       (id, external_id, email, first_name, last_name, display_name, companyos_roles, teams, tenant_id, source, is_active, on_call_eligible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (email, tenant_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         display_name = EXCLUDED.display_name,
         companyos_roles = EXCLUDED.companyos_roles,
         updated_at = NOW()`, [
            cosUser.id,
            cosUser.externalId,
            cosUser.email,
            cosUser.firstName,
            cosUser.lastName,
            cosUser.displayName,
            cosUser.companyOSRoles,
            cosUser.teams,
            cosUser.tenantId,
            cosUser.source,
            cosUser.isActive,
            cosUser.onCallEligible,
        ]);
        this.emit('user:created', cosUser);
    }
    /**
     * Sync existing user to Summit
     */
    async syncUserToSummit(cosUser, summitUser, config) {
        const mappedRoles = this.mapRolesToSummit(cosUser.companyOSRoles, config.roleMappings);
        const permissions = this.aggregatePermissions(cosUser.companyOSRoles, config.roleMappings);
        await this.db.query(`UPDATE maestro.users SET
         name = $1,
         role = $2,
         updated_at = NOW()
       WHERE id = $3`, [cosUser.displayName, mappedRoles[0] || summitUser.role, summitUser.id]);
        // Update permissions cache
        await this.redis.del(`user:permissions:${summitUser.id}`);
        if (permissions.length > 0) {
            await this.redis.sadd(`user:permissions:${summitUser.id}`, ...permissions);
            await this.redis.expire(`user:permissions:${summitUser.id}`, 3600);
        }
        // Update local sync record
        await this.db.query(`UPDATE companyos_sync.users SET last_synced_at = NOW() WHERE id = $1`, [cosUser.id]);
        await this.recordEvent({
            type: 'user_updated',
            source: 'companyos',
            target: 'summit',
            userId: cosUser.id,
            tenantId: cosUser.tenantId,
            correlationId: (0, crypto_1.randomUUID)(),
            previousState: summitUser,
            newState: cosUser,
        });
        this.emit('user:updated', cosUser, { displayName: cosUser.displayName });
    }
    /**
     * Map CompanyOS roles to Summit roles
     */
    mapRolesToSummit(companyOSRoles, mappings) {
        const summitRoles = new Set();
        for (const cosRole of companyOSRoles) {
            const mapping = mappings.find((m) => m.companyOSRole === cosRole);
            if (mapping) {
                mapping.summitRoles.forEach((r) => summitRoles.add(r));
            }
        }
        // Return highest priority role first
        const roleOrder = ['admin', 'emergency', 'operator', 'analyst', 'viewer'];
        return roleOrder.filter((r) => summitRoles.has(r));
    }
    /**
     * Map Summit role to CompanyOS roles
     */
    mapRolesToCompanyOS(summitRole, mappings) {
        const result = [];
        for (const mapping of mappings) {
            if (mapping.summitRoles.includes(summitRole)) {
                result.push(mapping.companyOSRole);
            }
        }
        return result.length > 0 ? result : ['ReadOnly'];
    }
    /**
     * Aggregate permissions from role mappings
     */
    aggregatePermissions(companyOSRoles, mappings) {
        const permissions = new Set();
        for (const cosRole of companyOSRoles) {
            const mapping = mappings.find((m) => m.companyOSRole === cosRole);
            if (mapping) {
                mapping.permissions.forEach((p) => permissions.add(p));
            }
        }
        return Array.from(permissions);
    }
    /**
     * Detect conflicts between CompanyOS and Summit user data
     */
    detectConflicts(cosUser, summitUser) {
        const conflicts = [];
        // Check name mismatch
        if (cosUser.displayName !== summitUser.name) {
            conflicts.push({
                userId: cosUser.id,
                field: 'displayName',
                companyOSValue: cosUser.displayName,
                summitValue: summitUser.name,
            });
        }
        // Check active status mismatch
        if (cosUser.isActive !== summitUser.isActive) {
            conflicts.push({
                userId: cosUser.id,
                field: 'isActive',
                companyOSValue: cosUser.isActive,
                summitValue: summitUser.isActive,
            });
        }
        return conflicts;
    }
    /**
     * Resolve conflict based on configured strategy
     */
    async resolveConflict(conflict, strategy) {
        let resolvedValue;
        switch (strategy) {
            case 'companyos_wins':
                resolvedValue = conflict.companyOSValue;
                break;
            case 'summit_wins':
                resolvedValue = conflict.summitValue;
                break;
            case 'latest_wins':
                // For simplicity, prefer CompanyOS as "latest" (would check timestamps in real impl)
                resolvedValue = conflict.companyOSValue;
                break;
            case 'manual':
                // Store for manual resolution
                await this.db.query(`INSERT INTO companyos_sync.conflicts
           (user_id, field, companyos_value, summit_value, strategy)
           VALUES ($1, $2, $3, $4, $5)`, [
                    conflict.userId,
                    conflict.field,
                    JSON.stringify(conflict.companyOSValue),
                    JSON.stringify(conflict.summitValue),
                    strategy,
                ]);
                resolvedValue = null;
                break;
            default:
                resolvedValue = conflict.companyOSValue;
        }
        const resolution = {
            userId: conflict.userId,
            field: conflict.field,
            companyOSValue: conflict.companyOSValue,
            summitValue: conflict.summitValue,
            resolvedValue,
            strategy,
            resolvedAt: new Date(),
        };
        this.emit('conflict:detected', resolution);
        return resolution;
    }
    /**
     * Record sync event
     */
    async recordEvent(event) {
        await this.db.query(`INSERT INTO companyos_sync.sync_events
       (id, type, source, target, user_id, tenant_id, changes, previous_state, new_state, status, error, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10, $11)`, [
            (0, crypto_1.randomUUID)(),
            event.type,
            event.source,
            event.target,
            event.userId,
            event.tenantId,
            JSON.stringify(event.changes || {}),
            JSON.stringify(event.previousState || null),
            JSON.stringify(event.newState || null),
            event.error,
            event.correlationId,
        ]);
    }
    /**
     * Get sync statistics for a tenant
     */
    async getStats(tenantId) {
        const cached = await this.redis.get(`companyos-sync:stats:${tenantId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        const result = await this.db.query(`SELECT
         COUNT(*) FILTER (WHERE type = 'user_created') as users_created,
         COUNT(*) FILTER (WHERE type = 'user_updated') as users_updated,
         COUNT(*) FILTER (WHERE type = 'user_deleted') as users_deleted,
         COUNT(*) FILTER (WHERE type = 'role_assigned') as roles_assigned,
         COUNT(*) FILTER (WHERE type = 'role_revoked') as roles_revoked,
         COUNT(*) FILTER (WHERE type = 'conflict_detected') as conflicts_detected,
         COUNT(*) FILTER (WHERE type = 'conflict_resolved') as conflicts_resolved,
         COUNT(*) FILTER (WHERE status = 'failed') as errors,
         MAX(timestamp) as last_sync_at
       FROM companyos_sync.sync_events
       WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'`, [tenantId]);
        const row = result.rows[0];
        return {
            lastSyncAt: row.last_sync_at,
            totalSynced: parseInt(row.users_created) + parseInt(row.users_updated),
            usersCreated: parseInt(row.users_created),
            usersUpdated: parseInt(row.users_updated),
            usersDeleted: parseInt(row.users_deleted),
            rolesAssigned: parseInt(row.roles_assigned),
            rolesRevoked: parseInt(row.roles_revoked),
            conflictsDetected: parseInt(row.conflicts_detected),
            conflictsResolved: parseInt(row.conflicts_resolved),
            errors: parseInt(row.errors),
            averageSyncDurationMs: 0,
        };
    }
    /**
     * Import user from CompanyOS
     */
    async importUser(user) {
        const validated = types_js_1.CompanyOSUserSchema.parse(user);
        await this.db.query(`INSERT INTO companyos_sync.users
       (id, external_id, email, first_name, last_name, display_name, department, title, companyos_roles, teams, tenant_id, source, is_active, on_call_eligible, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (email, tenant_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         display_name = EXCLUDED.display_name,
         department = EXCLUDED.department,
         title = EXCLUDED.title,
         companyos_roles = EXCLUDED.companyos_roles,
         teams = EXCLUDED.teams,
         is_active = EXCLUDED.is_active,
         on_call_eligible = EXCLUDED.on_call_eligible,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`, [
            validated.id,
            validated.externalId,
            validated.email,
            validated.firstName,
            validated.lastName,
            validated.displayName,
            validated.department,
            validated.title,
            validated.companyOSRoles,
            validated.teams,
            validated.tenantId,
            validated.source,
            validated.isActive,
            validated.onCallEligible,
            JSON.stringify(validated.metadata || {}),
        ]);
        this.emit('user:created', validated);
        this.logger.info({ userId: validated.id, email: validated.email }, 'User imported');
    }
    /**
     * Assign roles to user
     */
    async assignRoles(userId, roles) {
        await this.db.query(`UPDATE companyos_sync.users SET companyos_roles = $1, updated_at = NOW() WHERE id = $2`, [roles, userId]);
        this.emit('role:assigned', userId, roles);
        this.logger.info({ userId, roles }, 'Roles assigned');
    }
    /**
     * Revoke roles from user
     */
    async revokeRoles(userId, roles) {
        await this.db.query(`UPDATE companyos_sync.users
       SET companyos_roles = array_remove(companyos_roles, ANY($1)), updated_at = NOW()
       WHERE id = $2`, [roles, userId]);
        this.emit('role:revoked', userId, roles);
        this.logger.info({ userId, roles }, 'Roles revoked');
    }
    /**
     * Helper: Convert database row to CompanyOSUser
     */
    rowToCompanyOSUser(row) {
        return {
            id: row.id,
            externalId: row.external_id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            displayName: row.display_name,
            department: row.department,
            title: row.title,
            companyOSRoles: row.companyos_roles || [],
            teams: row.teams || [],
            tenantId: row.tenant_id,
            source: row.source,
            isActive: row.is_active,
            onCallEligible: row.on_call_eligible,
            metadata: row.metadata,
            lastSyncedAt: row.last_synced_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    /**
     * Helper: Convert database row to SummitUser
     */
    rowToSummitUser(row) {
        return {
            id: row.id,
            externalId: row.external_id,
            email: row.email,
            name: row.name,
            role: row.role,
            permissions: row.permissions || [],
            tenantId: row.tenant_id,
            clearanceLevel: row.clearance_level || 0,
            budgetLimit: row.budget_limit,
            rateLimit: row.rate_limit,
            isActive: row.is_active !== false,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        for (const [tenantId, job] of this.syncJobs) {
            job.stop();
            this.logger.info({ tenantId }, 'Sync job stopped');
        }
        this.syncJobs.clear();
        this.logger.info('CompanyOS Sync Service shutdown');
    }
}
exports.CompanyOSSyncService = CompanyOSSyncService;
