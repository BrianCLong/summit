// server/src/conductor/auth/jwt-rotation.ts

import { promises as fs } from 'fs';
import { randomBytes, createHash } from 'crypto';
import { promisify } from 'util';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import logger from '../../config/logger.js';

interface JWTKeyPair {
  keyId: string;
  publicKey: string;
  privateKey: string;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface JWKSResponse {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    alg: string;
    n?: string;
    e?: string;
    x5c?: string[];
  }>;
}

export class JWTRotationManager {
  private redis: Redis;
  private rotationInterval: NodeJS.Timeout | null = null;
  private keys: Map<string, JWTKeyPair> = new Map();
  private activeKeyId: string | null = null;

  constructor(
    private redisUrl: string = process.env.REDIS_URL ||
      'redis://localhost:6379',
    private keyRotationIntervalMs: number = 24 * 60 * 60 * 1000, // 24 hours
    private keyValidityMs: number = 7 * 24 * 60 * 60 * 1000, // 7 days
    private maxKeys: number = 5,
  ) {
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  /**
   * Initialize JWT rotation system
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      await this.loadKeysFromStorage();

      if (this.keys.size === 0) {
        logger.info(
          '🔑 No existing JWT keys found, generating initial key pair',
        );
        await this.generateNewKeyPair();
      }

      await this.cleanupExpiredKeys();
      this.startRotationSchedule();

      logger.info('🔐 JWT rotation manager initialized', {
        activeKeys: this.keys.size,
        activeKeyId: this.activeKeyId,
        rotationInterval: `${this.keyRotationIntervalMs / (60 * 1000)} minutes`,
      });
    } catch (error) {
      logger.error('❌ Failed to initialize JWT rotation manager', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate new JWT key pair with rotation
   */
  async generateNewKeyPair(): Promise<JWTKeyPair> {
    const keyId = this.generateKeyId();
    const keyPair = await this.generateRSAKeyPair();

    const jwtKeyPair: JWTKeyPair = {
      keyId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      algorithm: 'RS256',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.keyValidityMs),
      isActive: true,
    };

    // Deactivate previous active key but keep it valid for token verification
    if (this.activeKeyId) {
      const prevKey = this.keys.get(this.activeKeyId);
      if (prevKey) {
        prevKey.isActive = false;
        await this.saveKeyToStorage(prevKey);
      }
    }

    this.keys.set(keyId, jwtKeyPair);
    this.activeKeyId = keyId;

    await this.saveKeyToStorage(jwtKeyPair);
    await this.redis.set(
      'jwt:active_key_id',
      keyId,
      'EX',
      this.keyValidityMs / 1000,
    );

    logger.info('🔑 Generated new JWT key pair', {
      keyId,
      algorithm: jwtKeyPair.algorithm,
      expiresAt: jwtKeyPair.expiresAt.toISOString(),
    });

    return jwtKeyPair;
  }

  /**
   * Sign JWT token with active key
   */
  async signToken(
    payload: object,
    options: jwt.SignOptions = {},
  ): Promise<string> {
    if (!this.activeKeyId) {
      throw new Error('No active JWT key available for signing');
    }

    const activeKey = this.keys.get(this.activeKeyId);
    if (!activeKey) {
      throw new Error(`Active key ${this.activeKeyId} not found in key store`);
    }

    const signOptions: jwt.SignOptions = {
      algorithm: activeKey.algorithm as jwt.Algorithm,
      keyid: activeKey.keyId,
      issuer: process.env.JWT_ISSUER || 'maestro-conductor',
      audience: process.env.JWT_AUDIENCE || 'intelgraph-platform',
      expiresIn: '1h',
      ...options,
    };

    try {
      const token = jwt.sign(payload, activeKey.privateKey, signOptions);

      logger.debug('🎫 JWT token signed', {
        keyId: activeKey.keyId,
        algorithm: activeKey.algorithm,
        expiresIn: signOptions.expiresIn,
      });

      return token;
    } catch (error) {
      logger.error('❌ Failed to sign JWT token', {
        error: error.message,
        keyId: activeKey.keyId,
      });
      throw error;
    }
  }

  /**
   * Verify JWT token with any valid key
   */
  async verifyToken(token: string): Promise<jwt.JwtPayload | string> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    const keyId = decoded.header.kid;
    if (!keyId) {
      throw new Error('Token missing key ID (kid) in header');
    }

    const key = this.keys.get(keyId);
    if (!key) {
      // Try to load key from storage in case it's not in memory
      await this.loadKeyFromStorage(keyId);
      const refreshedKey = this.keys.get(keyId);
      if (!refreshedKey) {
        throw new Error(`JWT key ${keyId} not found or expired`);
      }
    }

    const verifyKey = this.keys.get(keyId)!;

    try {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [verifyKey.algorithm as jwt.Algorithm],
        issuer: process.env.JWT_ISSUER || 'maestro-conductor',
        audience: process.env.JWT_AUDIENCE || 'intelgraph-platform',
      };

      const payload = jwt.verify(token, verifyKey.publicKey, verifyOptions);

      logger.debug('✅ JWT token verified', {
        keyId: verifyKey.keyId,
        algorithm: verifyKey.algorithm,
      });

      return payload;
    } catch (error) {
      logger.error('❌ Failed to verify JWT token', {
        error: error.message,
        keyId: verifyKey.keyId,
      });
      throw error;
    }
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key distribution
   */
  async getJWKS(): Promise<JWKSResponse> {
    const validKeys = Array.from(this.keys.values())
      .filter((key) => key.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const jwks: JWKSResponse = {
      keys: validKeys.map((key) => ({
        kty: 'RSA',
        use: 'sig',
        kid: key.keyId,
        alg: key.algorithm,
        // In production, you'd extract n and e from the RSA public key
        // For now, we'll use the full certificate approach
        x5c: [Buffer.from(key.publicKey).toString('base64')],
      })),
    };

    return jwks;
  }

  /**
   * Force immediate key rotation
   */
  async rotateKeys(): Promise<void> {
    logger.info('🔄 Forcing JWT key rotation');

    await this.generateNewKeyPair();
    await this.cleanupExpiredKeys();

    logger.info('✅ JWT key rotation completed', {
      activeKeyId: this.activeKeyId,
      totalKeys: this.keys.size,
    });
  }

  /**
   * Get rotation status and metrics
   */
  getRotationStatus(): {
    activeKeyId: string | null;
    totalKeys: number;
    nextRotation: Date | null;
    keysMetrics: Array<{
      keyId: string;
      createdAt: Date;
      expiresAt: Date;
      isActive: boolean;
      algorithm: string;
    }>;
  } {
    const nextRotation = this.rotationInterval
      ? new Date(Date.now() + this.keyRotationIntervalMs)
      : null;

    return {
      activeKeyId: this.activeKeyId,
      totalKeys: this.keys.size,
      nextRotation,
      keysMetrics: Array.from(this.keys.values()).map((key) => ({
        keyId: key.keyId,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        algorithm: key.algorithm,
      })),
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    await this.redis.quit();
    logger.info('🔐 JWT rotation manager shutdown completed');
  }

  // Private methods

  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `jwt_key_${timestamp}_${random}`;
  }

  private async generateRSAKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const { generateKeyPair } = await import('crypto');
    const generateKeyPairAsync = promisify(generateKeyPair);

    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
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

    return { publicKey, privateKey };
  }

  private startRotationSchedule(): void {
    this.rotationInterval = setInterval(async () => {
      try {
        await this.generateNewKeyPair();
        await this.cleanupExpiredKeys();
      } catch (error) {
        logger.error('❌ Scheduled JWT key rotation failed', {
          error: error.message,
        });
      }
    }, this.keyRotationIntervalMs);
  }

  private async loadKeysFromStorage(): Promise<void> {
    try {
      const keyIds = await this.redis.smembers('jwt:key_ids');

      for (const keyId of keyIds) {
        await this.loadKeyFromStorage(keyId);
      }

      // Load active key ID
      const activeKeyId = await this.redis.get('jwt:active_key_id');
      if (activeKeyId && this.keys.has(activeKeyId)) {
        this.activeKeyId = activeKeyId;
      }

      logger.info('📥 Loaded JWT keys from storage', {
        keysLoaded: this.keys.size,
        activeKeyId: this.activeKeyId,
      });
    } catch (error) {
      logger.error('❌ Failed to load keys from storage', {
        error: error.message,
      });
    }
  }

  private async loadKeyFromStorage(keyId: string): Promise<void> {
    try {
      const keyData = await this.redis.hgetall(`jwt:key:${keyId}`);

      if (keyData.keyId) {
        const jwtKeyPair: JWTKeyPair = {
          keyId: keyData.keyId,
          publicKey: keyData.publicKey,
          privateKey: keyData.privateKey,
          algorithm: keyData.algorithm,
          createdAt: new Date(keyData.createdAt),
          expiresAt: new Date(keyData.expiresAt),
          isActive: keyData.isActive === 'true',
        };

        this.keys.set(keyId, jwtKeyPair);
      }
    } catch (error) {
      logger.error('❌ Failed to load key from storage', {
        keyId,
        error: error.message,
      });
    }
  }

  private async saveKeyToStorage(key: JWTKeyPair): Promise<void> {
    try {
      const keyData = {
        keyId: key.keyId,
        publicKey: key.publicKey,
        privateKey: key.privateKey,
        algorithm: key.algorithm,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt.toISOString(),
        isActive: key.isActive.toString(),
      };

      await Promise.all([
        this.redis.hmset(`jwt:key:${key.keyId}`, keyData),
        this.redis.sadd('jwt:key_ids', key.keyId),
        this.redis.expireat(
          `jwt:key:${key.keyId}`,
          Math.floor(key.expiresAt.getTime() / 1000),
        ),
      ]);
    } catch (error) {
      logger.error('❌ Failed to save key to storage', {
        keyId: key.keyId,
        error: error.message,
      });
      throw error;
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [keyId, key] of this.keys.entries()) {
      if (key.expiresAt <= now) {
        expiredKeys.push(keyId);
      }
    }

    // Keep at least one key even if expired (emergency fallback)
    if (expiredKeys.length >= this.keys.size) {
      expiredKeys.splice(-1, 1); // Keep the most recent expired key
    }

    for (const keyId of expiredKeys) {
      this.keys.delete(keyId);
      await Promise.all([
        this.redis.del(`jwt:key:${keyId}`),
        this.redis.srem('jwt:key_ids', keyId),
      ]);
    }

    // Cleanup if we have too many keys
    if (this.keys.size > this.maxKeys) {
      const sortedKeys = Array.from(this.keys.entries())
        .sort(([, a], [, b]) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(this.maxKeys);

      for (const [keyId] of sortedKeys) {
        this.keys.delete(keyId);
        await Promise.all([
          this.redis.del(`jwt:key:${keyId}`),
          this.redis.srem('jwt:key_ids', keyId),
        ]);
      }
    }

    if (expiredKeys.length > 0) {
      logger.info('🧹 Cleaned up expired JWT keys', {
        expiredKeysRemoved: expiredKeys.length,
        remainingKeys: this.keys.size,
      });
    }
  }
}

// Singleton instance for application use
export const jwtRotationManager = new JWTRotationManager();
