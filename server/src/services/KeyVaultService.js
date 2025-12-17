import { getPostgresPool } from '../config/database.js';
import { KeyService } from './security/KeyService.js';

class KeyVaultService {
  constructor() {
    this.pool = getPostgresPool();
  }

  async addKey(provider, key, expiresAt = null) {
    const encryptedKey = KeyService.encrypt(key);
    const res = await this.pool.query(
      `INSERT INTO api_keys (provider, key, expires_at) VALUES ($1,$2,$3) RETURNING id`,
      [provider, encryptedKey, expiresAt],
    );
    return res.rows[0].id;
  }

  async getActiveKey(provider) {
    const res = await this.pool.query(
      `SELECT id, key, expires_at FROM api_keys WHERE provider = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [provider],
    );
    if (!res.rows[0]) return null;

    const record = res.rows[0];
    const keyStr = record.key;

    // Check if key follows encryption format: IV(32hex):AuthTag(32hex):Ciphertext
    // AES-256-GCM: IV is usually 12 bytes (24 hex) or 16 bytes (32 hex). KeyService uses 16 bytes.
    // AuthTag is 16 bytes (32 hex).
    const parts = keyStr.split(':');
    const isEncryptedFormat = parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;

    if (isEncryptedFormat) {
        try {
            record.key = KeyService.decrypt(keyStr);
        } catch (e) {
            console.error(`Failed to decrypt key for provider ${provider}: ${e.message}`);
            // If decryption fails, it might be a corrupted key or wrong secret.
            // We return null to indicate failure to retrieve a usable key.
            return null;
        }
    } else {
        // Legacy plaintext key - return as is
    }

    return record;
  }

  // Helper method missing in original but used in consumers
  async getApiKey(provider) {
    const record = await this.getActiveKey(provider);
    return record ? record.key : null;
  }

  async rotateKey(provider, newKey, expiresAt = null) {
    await this.pool.query(
      `UPDATE api_keys SET status = 'inactive' WHERE provider=$1 AND status='active'`,
      [provider],
    );
    return this.addKey(provider, newKey, expiresAt);
  }
}

export default KeyVaultService;
