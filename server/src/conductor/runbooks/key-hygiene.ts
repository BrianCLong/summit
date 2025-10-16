// server/src/conductor/runbooks/key-hygiene.ts

import {
  createHash,
  createSign,
  createVerify,
  generateKeyPairSync,
  randomBytes,
} from 'crypto';
import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface RunbookSignature {
  runbookId: string;
  version: string;
  signature: string;
  publicKey: string;
  signedBy: string;
  signedAt: Date;
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  keyFingerprint: string;
}

interface KeyRotationEvent {
  keyId: string;
  action: 'generated' | 'activated' | 'deactivated' | 'revoked';
  reason: string;
  actor: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface SigningKey {
  keyId: string;
  publicKey: string;
  privateKey: string; // Encrypted in storage
  fingerprint: string;
  algorithm: string;
  status: 'active' | 'deactivated' | 'revoked';
  createdAt: Date;
  expiresAt: Date;
  rotationDue: Date;
}

interface RunbookIntegrity {
  runbookId: string;
  isValid: boolean;
  signatureValid: boolean;
  keyValid: boolean;
  contentHash: string;
  lastVerified: Date;
  violations: string[];
}

export class KeyHygieneManager {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  private keyRotationIntervalDays: number;
  private signatureValidityDays: number;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.keyRotationIntervalDays = parseInt(
      process.env.KEY_ROTATION_DAYS || '90',
    );
    this.signatureValidityDays = parseInt(
      process.env.SIGNATURE_VALIDITY_DAYS || '365',
    );
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Generate new signing key pair with automatic rotation scheduling
   */
  async generateSigningKey(
    keyId: string,
    algorithm: 'RSA-SHA256' | 'ECDSA-SHA256' = 'RSA-SHA256',
  ): Promise<SigningKey> {
    try {
      const keyPair = this.createKeyPair(algorithm);
      const fingerprint = this.calculateKeyFingerprint(keyPair.publicKey);

      const signingKey: SigningKey = {
        keyId,
        publicKey: keyPair.publicKey,
        privateKey: await this.encryptPrivateKey(keyPair.privateKey),
        fingerprint,
        algorithm,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(
          Date.now() + this.signatureValidityDays * 24 * 60 * 60 * 1000,
        ),
        rotationDue: new Date(
          Date.now() + this.keyRotationIntervalDays * 24 * 60 * 60 * 1000,
        ),
      };

      // Store key securely
      await this.storeSigningKey(signingKey);

      // Record key generation event
      await this.recordKeyEvent({
        keyId,
        action: 'generated',
        reason: 'New signing key generated',
        actor: 'system',
        timestamp: new Date(),
        metadata: {
          algorithm,
          fingerprint,
          rotationDue: signingKey.rotationDue.toISOString(),
        },
      });

      // Schedule rotation reminder
      await this.scheduleRotationReminder(signingKey);

      logger.info('Signing key generated', { keyId, fingerprint, algorithm });
      return signingKey;
    } catch (error) {
      logger.error('Failed to generate signing key', {
        error: error.message,
        keyId,
      });
      throw error;
    }
  }

  /**
   * Sign runbook with cryptographic signature
   */
  async signRunbook(
    runbookId: string,
    version: string,
    content: string,
    signedBy: string,
  ): Promise<RunbookSignature> {
    try {
      // Get active signing key
      const activeKey = await this.getActiveSigningKey();
      if (!activeKey) {
        throw new Error('No active signing key available');
      }

      // Check if key needs rotation
      if (new Date() >= activeKey.rotationDue) {
        logger.warn('Signing key rotation overdue', {
          keyId: activeKey.keyId,
          rotationDue: activeKey.rotationDue,
        });
      }

      // Create signature
      const contentHash = createHash('sha256').update(content).digest('hex');
      const signaturePayload = JSON.stringify({
        runbookId,
        version,
        contentHash,
        signedBy,
        timestamp: new Date().toISOString(),
      });

      const privateKey = await this.decryptPrivateKey(activeKey.privateKey);
      const sign = createSign('sha256');
      sign.update(signaturePayload);
      const signature = sign.sign(privateKey, 'base64');

      const runbookSignature: RunbookSignature = {
        runbookId,
        version,
        signature,
        publicKey: activeKey.publicKey,
        signedBy,
        signedAt: new Date(),
        algorithm: activeKey.algorithm,
        keyFingerprint: activeKey.fingerprint,
      };

      // Store signature
      await this.storeRunbookSignature(runbookSignature);

      // Update metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_signed',
        true,
        {
          runbook_id: runbookId,
          signed_by: signedBy,
        },
      );

      logger.info('Runbook signed successfully', {
        runbookId,
        version,
        signedBy,
      });
      return runbookSignature;
    } catch (error) {
      logger.error('Failed to sign runbook', {
        error: error.message,
        runbookId,
      });
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_sign_error',
        false,
      );
      throw error;
    }
  }

  /**
   * Verify runbook signature and integrity
   */
  async verifyRunbook(
    runbookId: string,
    version: string,
    content: string,
  ): Promise<RunbookIntegrity> {
    try {
      const signature = await this.getRunbookSignature(runbookId, version);
      const violations: string[] = [];

      if (!signature) {
        return {
          runbookId,
          isValid: false,
          signatureValid: false,
          keyValid: false,
          contentHash: createHash('sha256').update(content).digest('hex'),
          lastVerified: new Date(),
          violations: ['no_signature_found'],
        };
      }

      // Verify content hash
      const contentHash = createHash('sha256').update(content).digest('hex');
      const signaturePayload = JSON.stringify({
        runbookId,
        version,
        contentHash,
        signedBy: signature.signedBy,
        timestamp: signature.signedAt.toISOString(),
      });

      // Verify signature
      const verify = createVerify('sha256');
      verify.update(signaturePayload);
      const signatureValid = verify.verify(
        signature.publicKey,
        signature.signature,
        'base64',
      );

      if (!signatureValid) {
        violations.push('invalid_signature');
      }

      // Check key validity
      const key = await this.getSigningKeyByFingerprint(
        signature.keyFingerprint,
      );
      let keyValid = true;

      if (!key) {
        violations.push('key_not_found');
        keyValid = false;
      } else if (key.status === 'revoked') {
        violations.push('key_revoked');
        keyValid = false;
      } else if (key.status === 'deactivated') {
        violations.push('key_deactivated');
        keyValid = false;
      } else if (new Date() > key.expiresAt) {
        violations.push('key_expired');
        keyValid = false;
      }

      // Check signature age
      const daysSinceSigning =
        (Date.now() - signature.signedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSigning > this.signatureValidityDays) {
        violations.push('signature_expired');
      }

      const isValid = signatureValid && keyValid && violations.length === 0;

      const integrity: RunbookIntegrity = {
        runbookId,
        isValid,
        signatureValid,
        keyValid,
        contentHash,
        lastVerified: new Date(),
        violations,
      };

      // Store verification result
      await this.storeVerificationResult(integrity);

      // Update metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_verified',
        isValid,
        {
          runbook_id: runbookId,
          violations: violations.join(','),
        },
      );

      logger.info('Runbook verification completed', {
        runbookId,
        version,
        isValid,
        violations: violations.length,
      });

      return integrity;
    } catch (error) {
      logger.error('Runbook verification failed', {
        error: error.message,
        runbookId,
      });
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_verify_error',
        false,
      );
      throw error;
    }
  }

  /**
   * Rotate signing keys proactively
   */
  async rotateSigningKeys(reason: string = 'scheduled_rotation'): Promise<{
    oldKeyId: string;
    newKeyId: string;
    rotationId: string;
  }> {
    try {
      const rotationId = `rotation-${Date.now()}`;
      const oldKey = await this.getActiveSigningKey();

      if (!oldKey) {
        throw new Error('No active key to rotate');
      }

      // Generate new key
      const newKeyId = `key-${Date.now()}`;
      const newKey = await this.generateSigningKey(newKeyId);

      // Deactivate old key (don't revoke - allow verification of old signatures)
      await this.deactivateSigningKey(oldKey.keyId, reason);

      // Record rotation event
      await this.recordKeyEvent({
        keyId: newKeyId,
        action: 'activated',
        reason: `Key rotation: ${reason}`,
        actor: 'system',
        timestamp: new Date(),
        metadata: {
          rotationId,
          previousKeyId: oldKey.keyId,
          previousKeyFingerprint: oldKey.fingerprint,
        },
      });

      logger.info('Key rotation completed', {
        rotationId,
        oldKeyId: oldKey.keyId,
        newKeyId,
      });

      return {
        oldKeyId: oldKey.keyId,
        newKeyId,
        rotationId,
      };
    } catch (error) {
      logger.error('Key rotation failed', { error: error.message, reason });
      throw error;
    }
  }

  /**
   * Audit all runbook signatures and key hygiene
   */
  async auditKeyHygiene(): Promise<{
    totalRunbooks: number;
    validSignatures: number;
    invalidSignatures: number;
    expiredKeys: number;
    rotationNeeded: string[];
    violations: Array<{ runbookId: string; violations: string[] }>;
  }> {
    try {
      const client = await this.pool.connect();

      // Get all signed runbooks
      const runbookResult = await client.query(`
        SELECT DISTINCT runbook_id, version 
        FROM runbook_signatures 
        WHERE created_at > NOW() - INTERVAL '1 year'
      `);

      let validSignatures = 0;
      let invalidSignatures = 0;
      const violations = [];

      for (const row of runbookResult.rows) {
        // Get runbook content (simplified - would integrate with runbook storage)
        const content = await this.getRunbookContent(
          row.runbook_id,
          row.version,
        );
        if (content) {
          const integrity = await this.verifyRunbook(
            row.runbook_id,
            row.version,
            content,
          );

          if (integrity.isValid) {
            validSignatures++;
          } else {
            invalidSignatures++;
            if (integrity.violations.length > 0) {
              violations.push({
                runbookId: row.runbook_id,
                violations: integrity.violations,
              });
            }
          }
        }
      }

      // Check key expiration and rotation needs
      const keyResult = await client.query(`
        SELECT key_id, expires_at, rotation_due, status
        FROM signing_keys 
        WHERE status IN ('active', 'deactivated')
      `);

      let expiredKeys = 0;
      const rotationNeeded = [];

      for (const key of keyResult.rows) {
        if (new Date() > key.expires_at) {
          expiredKeys++;
        }
        if (new Date() > key.rotation_due && key.status === 'active') {
          rotationNeeded.push(key.key_id);
        }
      }

      client.release();

      const auditResult = {
        totalRunbooks: runbookResult.rows.length,
        validSignatures,
        invalidSignatures,
        expiredKeys,
        rotationNeeded,
        violations,
      };

      // Record audit metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'key_hygiene_audit_total',
        auditResult.totalRunbooks,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'key_hygiene_violations',
        auditResult.violations.length,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'key_hygiene_rotations_needed',
        rotationNeeded.length,
      );

      logger.info('Key hygiene audit completed', auditResult);
      return auditResult;
    } catch (error) {
      logger.error('Key hygiene audit failed', { error: error.message });
      throw error;
    }
  }

  private createKeyPair(algorithm: string): {
    publicKey: string;
    privateKey: string;
  } {
    if (algorithm === 'RSA-SHA256') {
      return generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
    } else if (algorithm === 'ECDSA-SHA256') {
      return generateKeyPairSync('ec', {
        namedCurve: 'secp384r1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  private calculateKeyFingerprint(publicKey: string): string {
    return createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 16);
  }

  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // In production, use HSM or proper key encryption
    const key = process.env.KEY_ENCRYPTION_KEY || 'default-key-for-dev';
    const cipher = require('crypto').createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    const key = process.env.KEY_ENCRYPTION_KEY || 'default-key-for-dev';
    const decipher = require('crypto').createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async storeSigningKey(key: SigningKey): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO signing_keys (
          key_id, public_key, private_key_encrypted, fingerprint, 
          algorithm, status, created_at, expires_at, rotation_due
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          key.keyId,
          key.publicKey,
          key.privateKey,
          key.fingerprint,
          key.algorithm,
          key.status,
          key.createdAt,
          key.expiresAt,
          key.rotationDue,
        ],
      );
    } finally {
      client.release();
    }
  }

  private async getActiveSigningKey(): Promise<SigningKey | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM signing_keys 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        keyId: row.key_id,
        publicKey: row.public_key,
        privateKey: row.private_key_encrypted,
        fingerprint: row.fingerprint,
        algorithm: row.algorithm,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        rotationDue: row.rotation_due,
      };
    } finally {
      client.release();
    }
  }

  private async getSigningKeyByFingerprint(
    fingerprint: string,
  ): Promise<SigningKey | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM signing_keys WHERE fingerprint = $1
      `,
        [fingerprint],
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        keyId: row.key_id,
        publicKey: row.public_key,
        privateKey: row.private_key_encrypted,
        fingerprint: row.fingerprint,
        algorithm: row.algorithm,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        rotationDue: row.rotation_due,
      };
    } finally {
      client.release();
    }
  }

  private async storeRunbookSignature(
    signature: RunbookSignature,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO runbook_signatures (
          runbook_id, version, signature, public_key, signed_by, 
          signed_at, algorithm, key_fingerprint, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
        [
          signature.runbookId,
          signature.version,
          signature.signature,
          signature.publicKey,
          signature.signedBy,
          signature.signedAt,
          signature.algorithm,
          signature.keyFingerprint,
        ],
      );
    } finally {
      client.release();
    }
  }

  private async getRunbookSignature(
    runbookId: string,
    version: string,
  ): Promise<RunbookSignature | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM runbook_signatures 
        WHERE runbook_id = $1 AND version = $2 
        ORDER BY signed_at DESC 
        LIMIT 1
      `,
        [runbookId, version],
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        runbookId: row.runbook_id,
        version: row.version,
        signature: row.signature,
        publicKey: row.public_key,
        signedBy: row.signed_by,
        signedAt: row.signed_at,
        algorithm: row.algorithm,
        keyFingerprint: row.key_fingerprint,
      };
    } finally {
      client.release();
    }
  }

  private async deactivateSigningKey(
    keyId: string,
    reason: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE signing_keys 
        SET status = 'deactivated', updated_at = NOW() 
        WHERE key_id = $1
      `,
        [keyId],
      );

      await this.recordKeyEvent({
        keyId,
        action: 'deactivated',
        reason,
        actor: 'system',
        timestamp: new Date(),
        metadata: {},
      });
    } finally {
      client.release();
    }
  }

  private async recordKeyEvent(event: KeyRotationEvent): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO key_rotation_log (
          key_id, action, reason, actor, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          event.keyId,
          event.action,
          event.reason,
          event.actor,
          event.timestamp,
          JSON.stringify(event.metadata),
        ],
      );
    } finally {
      client.release();
    }
  }

  private async scheduleRotationReminder(key: SigningKey): Promise<void> {
    const reminderTime = key.rotationDue.getTime() - 7 * 24 * 60 * 60 * 1000; // 7 days before
    await this.redis.zadd('key_rotation_reminders', reminderTime, key.keyId);
  }

  private async storeVerificationResult(
    integrity: RunbookIntegrity,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO runbook_verifications (
          runbook_id, is_valid, signature_valid, key_valid, 
          content_hash, verified_at, violations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          integrity.runbookId,
          integrity.isValid,
          integrity.signatureValid,
          integrity.keyValid,
          integrity.contentHash,
          integrity.lastVerified,
          JSON.stringify(integrity.violations),
        ],
      );
    } finally {
      client.release();
    }
  }

  private async getRunbookContent(
    runbookId: string,
    version: string,
  ): Promise<string | null> {
    // Placeholder - would integrate with actual runbook storage
    // This could be S3, database, or other storage system
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `
        SELECT content FROM runbooks WHERE id = $1 AND version = $2
      `,
        [runbookId, version],
      );
      client.release();

      return result.rows[0]?.content || null;
    } catch (error) {
      logger.warn('Could not retrieve runbook content', { runbookId, version });
      return null;
    }
  }
}
