"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresConfigRepository = void 0;
/**
 * PostgreSQL-backed configuration repository
 * Provides persistent storage for configuration versions with full audit trail
 */
class PostgresConfigRepository {
    pool;
    schema;
    constructor(config) {
        this.pool = config.pool;
        this.schema = config.schema || 'public';
    }
    /**
     * Initialize database schema
     */
    async initialize() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Config versions table
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.config_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          config JSONB NOT NULL,
          overrides JSONB DEFAULT '{}'::jsonb,
          checksum VARCHAR(64) NOT NULL,
          metadata JSONB NOT NULL,
          ab_test JSONB,
          canary JSONB,
          feature_flags JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by VARCHAR(255) NOT NULL,
          UNIQUE(config_id, version)
        );
      `);
            // Audit trail table
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.config_audit (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          actor VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          message TEXT,
          changes JSONB,
          FOREIGN KEY (config_id, version)
            REFERENCES ${this.schema}.config_versions(config_id, version)
            ON DELETE CASCADE
        );
      `);
            // Applied state table
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.config_applied_state (
          config_id VARCHAR(255) NOT NULL,
          environment VARCHAR(50) NOT NULL,
          version INTEGER NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
          PRIMARY KEY (config_id, environment)
        );
      `);
            // Indexes for performance
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_config_versions_config_id
          ON ${this.schema}.config_versions(config_id);
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_config_versions_created_at
          ON ${this.schema}.config_versions(created_at DESC);
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_config_audit_config_id
          ON ${this.schema}.config_audit(config_id);
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_config_audit_timestamp
          ON ${this.schema}.config_audit(timestamp DESC);
      `);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async saveVersion(configId, version, auditEntry) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Insert config version
            await client.query(`
        INSERT INTO ${this.schema}.config_versions (
          config_id, version, config, overrides, checksum, metadata,
          ab_test, canary, feature_flags, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (config_id, version) DO UPDATE SET
          config = EXCLUDED.config,
          overrides = EXCLUDED.overrides,
          checksum = EXCLUDED.checksum,
          metadata = EXCLUDED.metadata,
          ab_test = EXCLUDED.ab_test,
          canary = EXCLUDED.canary,
          feature_flags = EXCLUDED.feature_flags
      `, [
                configId,
                version.metadata.version,
                JSON.stringify(version.config),
                JSON.stringify(version.overrides),
                version.checksum,
                JSON.stringify(version.metadata),
                version.abTest ? JSON.stringify(version.abTest) : null,
                version.canary ? JSON.stringify(version.canary) : null,
                version.featureFlags ? JSON.stringify(version.featureFlags) : null,
                version.metadata.createdAt,
                version.metadata.createdBy,
            ]);
            // Insert audit entry
            await client.query(`
        INSERT INTO ${this.schema}.config_audit (
          config_id, version, actor, timestamp, message, changes
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                configId,
                auditEntry.version,
                auditEntry.actor,
                auditEntry.timestamp,
                auditEntry.message,
                auditEntry.changes ? JSON.stringify(auditEntry.changes) : null,
            ]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getLatestVersion(configId) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.schema}.config_versions
      WHERE config_id = $1
      ORDER BY version DESC
      LIMIT 1
    `, [configId]);
        if (result.rows.length === 0) {
            return undefined;
        }
        return this.mapRowToConfigVersion(result.rows[0]);
    }
    async getVersion(configId, versionNumber) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.schema}.config_versions
      WHERE config_id = $1 AND version = $2
    `, [configId, versionNumber]);
        if (result.rows.length === 0) {
            return undefined;
        }
        return this.mapRowToConfigVersion(result.rows[0]);
    }
    async listVersions(configId) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.schema}.config_versions
      WHERE config_id = $1
      ORDER BY version DESC
    `, [configId]);
        return result.rows.map((row) => this.mapRowToConfigVersion(row));
    }
    async recordAppliedState(configId, state) {
        await this.pool.query(`
      INSERT INTO ${this.schema}.config_applied_state (
        config_id, environment, version, checksum, applied_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (config_id, environment) DO UPDATE SET
        version = EXCLUDED.version,
        checksum = EXCLUDED.checksum,
        applied_at = EXCLUDED.applied_at
    `, [
            configId,
            state.environment,
            state.version,
            state.checksum,
            state.appliedAt,
        ]);
    }
    async getAppliedState(configId, environment) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.schema}.config_applied_state
      WHERE config_id = $1 AND environment = $2
    `, [configId, environment]);
        if (result.rows.length === 0) {
            return undefined;
        }
        const row = result.rows[0];
        return {
            environment: row.environment,
            version: row.version,
            checksum: row.checksum,
            appliedAt: new Date(row.applied_at),
        };
    }
    async getAuditTrail(configId) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.schema}.config_audit
      WHERE config_id = $1
      ORDER BY timestamp DESC
    `, [configId]);
        return result.rows.map((row) => ({
            version: row.version,
            actor: row.actor,
            timestamp: new Date(row.timestamp),
            message: row.message,
            changes: row.changes,
        }));
    }
    /**
     * Get all configuration IDs
     */
    async listConfigs() {
        const result = await this.pool.query(`
      SELECT DISTINCT config_id FROM ${this.schema}.config_versions
      ORDER BY config_id
    `);
        return result.rows.map((row) => row.config_id);
    }
    /**
     * Delete a configuration and all its versions
     */
    async deleteConfig(configId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Delete applied state
            await client.query(`DELETE FROM ${this.schema}.config_applied_state WHERE config_id = $1`, [configId]);
            // Delete versions (cascade will delete audit entries)
            await client.query(`DELETE FROM ${this.schema}.config_versions WHERE config_id = $1`, [configId]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Clean up old versions, keeping specified number of recent versions
     */
    async cleanupOldVersions(configId, keepVersions = 10) {
        const result = await this.pool.query(`
      DELETE FROM ${this.schema}.config_versions
      WHERE config_id = $1 AND version NOT IN (
        SELECT version FROM ${this.schema}.config_versions
        WHERE config_id = $1
        ORDER BY version DESC
        LIMIT $2
      )
    `, [configId, keepVersions]);
        return result.rowCount || 0;
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const result = await this.pool.query('SELECT 1');
            return result.rows.length === 1;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Close pool connections
     */
    async close() {
        await this.pool.end();
    }
    mapRowToConfigVersion(row) {
        return {
            id: row.config_id,
            config: row.config,
            overrides: row.overrides || {},
            metadata: {
                ...row.metadata,
                createdAt: new Date(row.metadata.createdAt || row.created_at),
            },
            checksum: row.checksum,
            abTest: row.ab_test || undefined,
            canary: row.canary || undefined,
            featureFlags: row.feature_flags || undefined,
        };
    }
}
exports.PostgresConfigRepository = PostgresConfigRepository;
exports.default = PostgresConfigRepository;
