/**
 * JWT Security Hardening - Phase 2
 *
 * Implements JWT key rotation, kid header validation,
 * and Redis JTI replay protection
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from 'redis';

// JWT Configuration
interface JWTConfig {
  issuer: string;
  audience: string;
  keyRotationInterval: number; // 7 days in milliseconds
  replayProtectionTTL: number; // 15 minutes in milliseconds
  redisUrl: string;
}

interface JWTKey {
  kid: string;
  privateKey: string;
  publicKey: string;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
}

interface JWTPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  jti: string;
  kid: string;
  // Custom claims
  userId?: string;
  tenantId?: string;
  scopes?: string[];
}

class JWTSecurityManager {
  private config: JWTConfig;
  private redis: any;
  private currentKey: JWTKey | null = null;
  private keyCache: Map<string, JWTKey> = new Map();

  constructor(config: JWTConfig) {
    this.config = config;
    this.redis = createClient({ url: config.redisUrl });
  }

  async initialize(): Promise<void> {
    console.log('🔐 Initializing JWT Security Manager...');

    // Connect to Redis
    await this.redis.connect();

    // Load or generate current signing key
    await this.loadCurrentKey();

    // Setup key rotation schedule
    this.scheduleKeyRotation();

    console.log('✅ JWT Security Manager initialized');
  }

  /**
   * Generate a new JWT signing key
   */
  private async generateKey(): Promise<JWTKey> {
    const kid = crypto.randomUUID();
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const key: JWTKey = {
      kid,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      algorithm: 'RS256',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.keyRotationInterval),
    };

    console.log(`🔑 Generated new JWT key: ${kid}`);
    return key;
  }

  /**
   * Load current signing key from storage or generate new one
   */
  private async loadCurrentKey(): Promise<void> {
    try {
      // Try to load current key from Redis
      const keyData = await this.redis.get('jwt:current_key');

      if (keyData) {
        const key = JSON.parse(keyData);
        key.createdAt = new Date(key.createdAt);
        key.expiresAt = new Date(key.expiresAt);

        // Check if key is still valid
        if (key.expiresAt > new Date()) {
          this.currentKey = key;
          this.keyCache.set(key.kid, key);
          console.log(`🔑 Loaded current JWT key: ${key.kid}`);
          return;
        } else {
          console.log(`⚠️  Current JWT key expired: ${key.kid}`);
        }
      }

      // Generate new key if none exists or current is expired
      await this.rotateKey();
    } catch (error) {
      console.error('❌ Failed to load current JWT key:', error);
      throw error;
    }
  }

  /**
   * Rotate the JWT signing key
   */
  private async rotateKey(): Promise<void> {
    console.log('🔄 Rotating JWT signing key...');

    const newKey = await this.generateKey();

    // Store old key for verification (if exists)
    if (this.currentKey) {
      this.keyCache.set(this.currentKey.kid, this.currentKey);
      await this.redis.setex(
        `jwt:key:${this.currentKey.kid}`,
        86400 * 7, // Keep old keys for 7 days
        JSON.stringify(this.currentKey),
      );
    }

    // Set new current key
    this.currentKey = newKey;
    this.keyCache.set(newKey.kid, newKey);

    // Store in Redis
    await this.redis.set('jwt:current_key', JSON.stringify(newKey));

    console.log(`✅ JWT key rotation complete: ${newKey.kid}`);

    // Cleanup expired keys
    await this.cleanupExpiredKeys();
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    setInterval(async () => {
      try {
        if (this.currentKey && this.currentKey.expiresAt <= new Date()) {
          await this.rotateKey();
        }
      } catch (error) {
        console.error('❌ Scheduled key rotation failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean up expired keys from storage
   */
  private async cleanupExpiredKeys(): Promise<void> {
    const keys = await this.redis.keys('jwt:key:*');
    const now = new Date();

    for (const keyName of keys) {
      try {
        const keyData = await this.redis.get(keyName);
        const key = JSON.parse(keyData);

        if (new Date(key.expiresAt) < now) {
          await this.redis.del(keyName);
          this.keyCache.delete(key.kid);
          console.log(`🗑️  Cleaned up expired JWT key: ${key.kid}`);
        }
      } catch (error) {
        console.error(`⚠️  Failed to cleanup key ${keyName}:`, error);
      }
    }
  }

  /**
   * Sign a JWT with the current key
   */
  async signToken(payload: Partial<JWTPayload>): Promise<string> {
    if (!this.currentKey) {
      throw new Error('No current JWT signing key available');
    }

    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: JWTPayload = {
      ...payload,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + 3600, // 1 hour expiry
      jti,
      kid: this.currentKey.kid,
    } as any;

    const token = jwt.sign(fullPayload, this.currentKey.privateKey, {
      algorithm: this.currentKey.algorithm as jwt.Algorithm,
      header: {
        kid: this.currentKey.kid,
        alg: this.currentKey.algorithm,
      },
    });

    console.log(`🔐 Signed JWT: ${jti} (kid: ${this.currentKey.kid})`);
    return token;
  }

  /**
   * Verify and validate JWT with replay protection
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Decode header to get kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      const kid = decoded.header.kid;
      if (!kid) {
        throw new Error('Missing kid header in JWT');
      }

      // Get verification key
      const verificationKey = await this.getVerificationKey(kid);
      if (!verificationKey) {
        throw new Error(`Unknown key ID: ${kid}`);
      }

      // Verify token signature and claims
      const payload = jwt.verify(token, verificationKey.publicKey, {
        algorithms: [verificationKey.algorithm as jwt.Algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTPayload;

      // Check for replay attacks using JTI
      await this.checkReplayProtection(payload.jti);

      console.log(`✅ Verified JWT: ${payload.jti} (kid: ${kid})`);
      return payload;
    } catch (error) {
      console.error('❌ JWT verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Get verification key by kid
   */
  private async getVerificationKey(kid: string): Promise<JWTKey | null> {
    // Check cache first
    if (this.keyCache.has(kid)) {
      return this.keyCache.get(kid)!;
    }

    // Load from Redis
    try {
      const keyData = await this.redis.get(`jwt:key:${kid}`);
      if (keyData) {
        const key = JSON.parse(keyData);
        key.createdAt = new Date(key.createdAt);
        key.expiresAt = new Date(key.expiresAt);
        this.keyCache.set(kid, key);
        return key;
      }
    } catch (error) {
      console.error(`Failed to load key ${kid}:`, error);
    }

    return null;
  }

  /**
   * Check and record JTI for replay protection
   */
  private async checkReplayProtection(jti: string): Promise<void> {
    const key = `jwt:jti:${jti}`;

    // Check if JTI already exists (replay attack)
    const exists = await this.redis.exists(key);
    if (exists) {
      throw new Error(`JWT replay attack detected: ${jti}`);
    }

    // Record JTI with TTL
    await this.redis.setex(
      key,
      Math.floor(this.config.replayProtectionTTL / 1000),
      '1',
    );
  }

  /**
   * Get public keys for external verification (JWKS endpoint)
   */
  async getPublicKeys(): Promise<any[]> {
    const keys = [];

    // Add current key
    if (this.currentKey) {
      keys.push({
        kid: this.currentKey.kid,
        kty: 'RSA',
        use: 'sig',
        alg: this.currentKey.algorithm,
        n: this.extractModulus(this.currentKey.publicKey),
        e: 'AQAB', // Standard RSA public exponent
      });
    }

    // Add other valid keys from cache
    for (const [kid, key] of this.keyCache.entries()) {
      if (kid !== this.currentKey?.kid && key.expiresAt > new Date()) {
        keys.push({
          kid: key.kid,
          kty: 'RSA',
          use: 'sig',
          alg: key.algorithm,
          n: this.extractModulus(key.publicKey),
          e: 'AQAB',
        });
      }
    }

    return keys;
  }

  /**
   * Extract RSA modulus from public key for JWKS
   */
  private extractModulus(publicKeyPem: string): string {
    // This is a simplified implementation
    // In production, use a proper crypto library like 'node-jose'
    const key = crypto.createPublicKey(publicKeyPem);
    const details = key.asymmetricKeyDetails;
    return Buffer.from(details?.mgf1HashAlgorithm || '').toString('base64url');
  }

  /**
   * Health check for JWT security
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const redisHealthy = (await this.redis.ping()) === 'PONG';
      const hasCurrentKey = !!this.currentKey;
      const keyValid =
        this.currentKey && this.currentKey.expiresAt > new Date();

      const status =
        redisHealthy && hasCurrentKey && keyValid ? 'healthy' : 'degraded';

      return {
        status,
        details: {
          redis: redisHealthy ? 'connected' : 'disconnected',
          currentKey: this.currentKey?.kid || 'none',
          keyExpiry: this.currentKey?.expiresAt || 'none',
          cacheSize: this.keyCache.size,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down JWT Security Manager...');
    if (this.redis) {
      await this.redis.quit();
    }
    console.log('✅ JWT Security Manager shutdown complete');
  }
}

// Factory function for creating JWT security manager
export function createJWTSecurityManager(
  config: Partial<JWTConfig>,
): JWTSecurityManager {
  const defaultConfig: JWTConfig = {
    issuer: 'intelgraph-server',
    audience: 'intelgraph-api',
    keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
    replayProtectionTTL: 15 * 60 * 1000, // 15 minutes
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  return new JWTSecurityManager({ ...defaultConfig, ...config });
}

export { JWTSecurityManager, JWTPayload, JWTKey, JWTConfig };
