/**
 * API Key Manager
 *
 * Manages API keys for service authentication
 */

import { randomBytes, createHash } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('apikey-manager');

export interface APIKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  userId: string;
  scopes: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  expiresAt?: number;
  createdAt: number;
  lastUsedAt?: number;
  metadata?: Record<string, any>;
}

export interface CreateAPIKeyRequest {
  name: string;
  userId: string;
  scopes: string[];
  expiresIn?: number; // milliseconds
  rateLimit?: {
    requests: number;
    window: number;
  };
  metadata?: Record<string, any>;
}

export class APIKeyManager {
  private keys = new Map<string, APIKey>();
  private keysByUserId = new Map<string, Set<string>>();

  createAPIKey(request: CreateAPIKeyRequest): { apiKey: APIKey; key: string } {
    const keyId = this.generateKeyId();
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    const prefix = key.substring(0, 8);

    const apiKey: APIKey = {
      id: keyId,
      name: request.name,
      keyHash,
      prefix,
      userId: request.userId,
      scopes: request.scopes,
      rateLimit: request.rateLimit,
      expiresAt: request.expiresIn ? Date.now() + request.expiresIn : undefined,
      createdAt: Date.now(),
      metadata: request.metadata,
    };

    this.keys.set(keyId, apiKey);

    // Index by user ID
    if (!this.keysByUserId.has(request.userId)) {
      this.keysByUserId.set(request.userId, new Set());
    }
    this.keysByUserId.get(request.userId)!.add(keyId);

    logger.info('API key created', { keyId, userId: request.userId, name: request.name });

    return { apiKey, key };
  }

  validateAPIKey(key: string): APIKey | null {
    const keyHash = this.hashKey(key);

    for (const apiKey of this.keys.values()) {
      if (apiKey.keyHash === keyHash) {
        // Check if expired
        if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
          logger.warn('API key expired', { keyId: apiKey.id });
          return null;
        }

        // Update last used timestamp
        apiKey.lastUsedAt = Date.now();

        logger.debug('API key validated', { keyId: apiKey.id });
        return apiKey;
      }
    }

    logger.warn('Invalid API key');
    return null;
  }

  revokeAPIKey(keyId: string): boolean {
    const apiKey = this.keys.get(keyId);

    if (!apiKey) {
      return false;
    }

    this.keys.delete(keyId);

    // Remove from user index
    const userKeys = this.keysByUserId.get(apiKey.userId);
    if (userKeys) {
      userKeys.delete(keyId);
      if (userKeys.size === 0) {
        this.keysByUserId.delete(apiKey.userId);
      }
    }

    logger.info('API key revoked', { keyId, userId: apiKey.userId });
    return true;
  }

  getAPIKey(keyId: string): APIKey | null {
    return this.keys.get(keyId) || null;
  }

  listAPIKeysByUser(userId: string): APIKey[] {
    const keyIds = this.keysByUserId.get(userId);

    if (!keyIds) {
      return [];
    }

    return Array.from(keyIds)
      .map(id => this.keys.get(id))
      .filter((key): key is APIKey => key !== undefined);
  }

  rotateAPIKey(keyId: string): { apiKey: APIKey; key: string } | null {
    const oldKey = this.keys.get(keyId);

    if (!oldKey) {
      return null;
    }

    // Create new key with same settings
    const newKeyData = this.createAPIKey({
      name: oldKey.name,
      userId: oldKey.userId,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
      metadata: oldKey.metadata,
    });

    // Revoke old key
    this.revokeAPIKey(keyId);

    logger.info('API key rotated', { oldKeyId: keyId, newKeyId: newKeyData.apiKey.id });

    return newKeyData;
  }

  private generateKeyId(): string {
    return `key_${randomBytes(16).toString('hex')}`;
  }

  private generateKey(): string {
    return `sk_${randomBytes(32).toString('base64url')}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  getStats() {
    return {
      totalKeys: this.keys.size,
      totalUsers: this.keysByUserId.size,
      activeKeys: Array.from(this.keys.values()).filter(k => !k.expiresAt || k.expiresAt > Date.now()).length,
    };
  }
}
