import { EventEmitter } from 'events';
import { Pool } from 'pg';
import crypto from 'crypto';
import { SecretReference, SecretResolver } from './types';

export interface RotationPolicy {
  secretId: string;
  rotationIntervalDays: number;
  rotationLambda?: string;
  notifyOnRotation?: string[];
  gracePeriodDays: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  enabled: boolean;
}

export interface SecretVersion {
  secretId: string;
  version: number;
  value: string;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  status: 'active' | 'pending' | 'expired' | 'revoked';
}

export interface SecretsManagerConfig {
  pool?: Pool;
  resolvers: Map<string, SecretResolver>;
  rotationCheckInterval?: number; // milliseconds
  defaultGracePeriodDays?: number;
}

/**
 * Secrets Manager with automatic rotation policies
 *
 * Features:
 * - Multi-provider support (AWS, GCP, Azure, Vault)
 * - Automatic secret rotation
 * - Graceful migration (old + new valid during grace period)
 * - Version tracking
 * - Audit trail
 */
export class SecretsManager {
  private readonly pool?: Pool;
  private readonly resolvers: Map<string, SecretResolver>;
  private readonly events = new EventEmitter();
  private readonly rotationCheckInterval: number;
  private readonly defaultGracePeriodDays: number;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: SecretsManagerConfig) {
    this.pool = config.pool;
    this.resolvers = config.resolvers;
    this.rotationCheckInterval = config.rotationCheckInterval || 3600000; // 1 hour
    this.defaultGracePeriodDays = config.defaultGracePeriodDays || 7;

    // Start rotation scheduler
    this.startRotationScheduler();
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (!this.pool) {
      return; // No persistent storage
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Rotation policies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS secret_rotation_policies (
          secret_id VARCHAR(255) PRIMARY KEY,
          rotation_interval_days INTEGER NOT NULL,
          rotation_lambda VARCHAR(255),
          notify_on_rotation TEXT[],
          grace_period_days INTEGER NOT NULL DEFAULT 7,
          last_rotated_at TIMESTAMP,
          next_rotation_at TIMESTAMP,
          enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Secret versions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS secret_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          secret_id VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          value_encrypted TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          UNIQUE(secret_id, version)
        );
      `);

      // Rotation audit trail
      await client.query(`
        CREATE TABLE IF NOT EXISTS secret_rotation_audit (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          secret_id VARCHAR(255) NOT NULL,
          old_version INTEGER,
          new_version INTEGER,
          rotated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          rotated_by VARCHAR(255) NOT NULL,
          rotation_method VARCHAR(50) NOT NULL,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          FOREIGN KEY (secret_id)
            REFERENCES secret_rotation_policies(secret_id)
            ON DELETE CASCADE
        );
      `);

      // Indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_secret_rotation_next_rotation
          ON secret_rotation_policies(next_rotation_at)
          WHERE enabled = true;
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_secret_versions_status
          ON secret_versions(secret_id, status);
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create or update a rotation policy
   */
  async setRotationPolicy(policy: RotationPolicy): Promise<void> {
    if (!this.pool) {
      throw new Error('Persistent storage not configured');
    }

    const nextRotation = this.calculateNextRotation(
      policy.lastRotatedAt || new Date(),
      policy.rotationIntervalDays,
    );

    await this.pool.query(
      `
      INSERT INTO secret_rotation_policies (
        secret_id, rotation_interval_days, rotation_lambda,
        notify_on_rotation, grace_period_days, last_rotated_at,
        next_rotation_at, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (secret_id) DO UPDATE SET
        rotation_interval_days = EXCLUDED.rotation_interval_days,
        rotation_lambda = EXCLUDED.rotation_lambda,
        notify_on_rotation = EXCLUDED.notify_on_rotation,
        grace_period_days = EXCLUDED.grace_period_days,
        next_rotation_at = EXCLUDED.next_rotation_at,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `,
      [
        policy.secretId,
        policy.rotationIntervalDays,
        policy.rotationLambda,
        policy.notifyOnRotation || [],
        policy.gracePeriodDays,
        policy.lastRotatedAt || new Date(),
        nextRotation,
        policy.enabled,
      ],
    );

    this.events.emit('policy:updated', policy);
  }

  /**
   * Get rotation policy for a secret
   */
  async getRotationPolicy(secretId: string): Promise<RotationPolicy | undefined> {
    if (!this.pool) {
      return undefined;
    }

    const result = await this.pool.query(
      'SELECT * FROM secret_rotation_policies WHERE secret_id = $1',
      [secretId],
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRowToPolicy(result.rows[0]);
  }

  /**
   * List all rotation policies
   */
  async listRotationPolicies(enabledOnly: boolean = false): Promise<RotationPolicy[]> {
    if (!this.pool) {
      return [];
    }

    const query = enabledOnly
      ? 'SELECT * FROM secret_rotation_policies WHERE enabled = true ORDER BY next_rotation_at'
      : 'SELECT * FROM secret_rotation_policies ORDER BY secret_id';

    const result = await this.pool.query(query);
    return result.rows.map((row) => this.mapRowToPolicy(row));
  }

  /**
   * Rotate a secret manually
   */
  async rotateSecret(
    secretId: string,
    newValue: string,
    actor: string,
  ): Promise<SecretVersion> {
    const policy = await this.getRotationPolicy(secretId);

    if (!policy) {
      throw new Error(`No rotation policy found for secret ${secretId}`);
    }

    // Get current version
    const currentVersion = await this.getCurrentVersion(secretId);
    const newVersionNumber = currentVersion ? currentVersion.version + 1 : 1;

    // Create new version
    const newVersion: SecretVersion = {
      secretId,
      version: newVersionNumber,
      value: newValue,
      createdAt: new Date(),
      createdBy: actor,
      status: 'active',
    };

    // Store new version
    if (this.pool) {
      await this.storeSecretVersion(newVersion);

      // Mark old version as pending expiration
      if (currentVersion) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + policy.gracePeriodDays);

        await this.pool.query(
          `
          UPDATE secret_versions
          SET status = 'pending', expires_at = $1
          WHERE secret_id = $2 AND version = $3
        `,
          [expiresAt, secretId, currentVersion.version],
        );
      }

      // Update rotation policy
      const nextRotation = this.calculateNextRotation(
        new Date(),
        policy.rotationIntervalDays,
      );

      await this.pool.query(
        `
        UPDATE secret_rotation_policies
        SET last_rotated_at = NOW(), next_rotation_at = $1, updated_at = NOW()
        WHERE secret_id = $2
      `,
        [nextRotation, secretId],
      );

      // Record audit entry
      await this.pool.query(
        `
        INSERT INTO secret_rotation_audit (
          secret_id, old_version, new_version, rotated_by, rotation_method, success
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          secretId,
          currentVersion?.version,
          newVersionNumber,
          actor,
          'manual',
          true,
        ],
      );
    }

    this.events.emit('secret:rotated', {
      secretId,
      oldVersion: currentVersion?.version,
      newVersion: newVersionNumber,
    });

    // Send notifications
    if (policy.notifyOnRotation && policy.notifyOnRotation.length > 0) {
      this.events.emit('notify:rotation', {
        secretId,
        recipients: policy.notifyOnRotation,
        newVersion: newVersionNumber,
      });
    }

    return newVersion;
  }

  /**
   * Resolve a secret reference
   */
  async resolve(reference: SecretReference): Promise<string> {
    const resolver = this.resolvers.get(reference.provider);

    if (!resolver) {
      throw new Error(`No resolver configured for provider: ${reference.provider}`);
    }

    return await resolver.resolve(reference);
  }

  /**
   * Get current (active) version of a secret
   */
  async getCurrentVersion(secretId: string): Promise<SecretVersion | undefined> {
    if (!this.pool) {
      return undefined;
    }

    const result = await this.pool.query(
      `
      SELECT * FROM secret_versions
      WHERE secret_id = $1 AND status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `,
      [secretId],
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRowToVersion(result.rows[0]);
  }

  /**
   * Get all versions of a secret
   */
  async getVersionHistory(secretId: string): Promise<SecretVersion[]> {
    if (!this.pool) {
      return [];
    }

    const result = await this.pool.query(
      `
      SELECT * FROM secret_versions
      WHERE secret_id = $1
      ORDER BY version DESC
    `,
      [secretId],
    );

    return result.rows.map((row) => this.mapRowToVersion(row));
  }

  /**
   * Revoke a secret version
   */
  async revokeVersion(secretId: string, version: number): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.query(
      `
      UPDATE secret_versions
      SET status = 'revoked'
      WHERE secret_id = $1 AND version = $2
    `,
      [secretId, version],
    );

    this.events.emit('secret:revoked', { secretId, version });
  }

  /**
   * Clean up expired secrets
   */
  async cleanupExpired(): Promise<number> {
    if (!this.pool) {
      return 0;
    }

    const result = await this.pool.query(
      `
      UPDATE secret_versions
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
      RETURNING secret_id, version
    `,
    );

    const expired = result.rowCount || 0;

    if (expired > 0) {
      this.events.emit('cleanup:expired', { count: expired });
    }

    return expired;
  }

  /**
   * Check for secrets that need rotation
   */
  async checkRotations(): Promise<RotationPolicy[]> {
    if (!this.pool) {
      return [];
    }

    const result = await this.pool.query(
      `
      SELECT * FROM secret_rotation_policies
      WHERE enabled = true AND next_rotation_at <= NOW()
      ORDER BY next_rotation_at
    `,
    );

    return result.rows.map((row) => this.mapRowToPolicy(row));
  }

  /**
   * Stop rotation scheduler and cleanup
   */
  async close(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }

  /**
   * Listen for events
   */
  on(
    event: 'secret:rotated' | 'policy:updated' | 'notify:rotation' | 'cleanup:expired',
    listener: (...args: any[]) => void,
  ): void {
    this.events.on(event, listener);
  }

  private async storeSecretVersion(version: SecretVersion): Promise<void> {
    if (!this.pool) {
      return;
    }

    // Encrypt the secret value before storing
    const encrypted = this.encryptValue(version.value);

    await this.pool.query(
      `
      INSERT INTO secret_versions (
        secret_id, version, value_encrypted, created_by, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        version.secretId,
        version.version,
        encrypted,
        version.createdBy,
        version.expiresAt,
        version.status,
      ],
    );
  }

  private startRotationScheduler(): void {
    // Initial check
    this.runRotationCheck().catch((error) => {
      console.error('Initial rotation check failed:', error);
    });

    // Periodic checks
    this.rotationTimer = setInterval(async () => {
      try {
        await this.runRotationCheck();
      } catch (error) {
        console.error('Rotation check error:', error);
      }
    }, this.rotationCheckInterval);
  }

  private async runRotationCheck(): Promise<void> {
    // Clean up expired secrets
    await this.cleanupExpired();

    // Check for secrets that need rotation
    const needsRotation = await this.checkRotations();

    if (needsRotation.length > 0) {
      this.events.emit('rotation:needed', {
        count: needsRotation.length,
        secrets: needsRotation.map((p) => p.secretId),
      });

      console.info(`${needsRotation.length} secrets need rotation`);
    }
  }

  private calculateNextRotation(lastRotation: Date, intervalDays: number): Date {
    const next = new Date(lastRotation);
    next.setDate(next.getDate() + intervalDays);
    return next;
  }

  private encryptValue(value: string): string {
    // Use AES-256-GCM for encryption
    // In production, use a proper KMS key
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    });
  }

  private decryptValue(encryptedData: string): string {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData);
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private mapRowToPolicy(row: any): RotationPolicy {
    return {
      secretId: row.secret_id,
      rotationIntervalDays: row.rotation_interval_days,
      rotationLambda: row.rotation_lambda,
      notifyOnRotation: row.notify_on_rotation,
      gracePeriodDays: row.grace_period_days,
      lastRotatedAt: row.last_rotated_at ? new Date(row.last_rotated_at) : undefined,
      nextRotationAt: row.next_rotation_at ? new Date(row.next_rotation_at) : undefined,
      enabled: row.enabled,
    };
  }

  private mapRowToVersion(row: any): SecretVersion {
    return {
      secretId: row.secret_id,
      version: row.version,
      value: this.decryptValue(row.value_encrypted),
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      status: row.status,
    };
  }
}

export default SecretsManager;
