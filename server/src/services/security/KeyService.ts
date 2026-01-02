import crypto from 'crypto';
import config from '../../config/secrets.js';
import { randomString } from '../../utils/crypto-secure-random.js';

export class KeyService {
  private static readonly ALGORITHM = 'aes-256-gcm';

  /**
   * Generates a new API key with a prefix.
   * Format: prefix_randomString
   * Returns the plain key (to show once) and the hash (to store).
   */
  static async generateApiKey(prefix: string = 'summit_sk'): Promise<{ key: string; hash: string }> {
    const key = `${prefix}_${randomString(32, 'base64url')}`;
    const hash = await this.hashKey(key);
    return { key, hash };
  }

  /**
   * Hashes a key for secure storage (one-way).
   * Uses scrypt.
   */
  static async hashKey(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(key, salt, 64, (err: any, derivedKey: any) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies a key against a stored hash.
   */
  static async verifyKey(key: string, hash: string): Promise<boolean> {
    const [salt, storedHash] = hash.split(':');
    if (!salt || !storedHash) return false;

    return new Promise((resolve, reject) => {
      crypto.scrypt(key, salt, 64, (err: any, derivedKey: any) => {
        if (err) reject(err);
        resolve(derivedKey.toString('hex') === storedHash);
      });
    });
  }

  /**
   * Encrypts sensitive data (like an external API key) for storage.
   */
  static encrypt(text: string): string {
    if (!config.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }
    // config.ENCRYPTION_KEY is hex string (64 chars = 32 bytes)
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(KeyService.ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts sensitive data.
   */
  static decrypt(encryptedText: string): string {
    if (!config.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(KeyService.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
