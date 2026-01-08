import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { EncryptedEnvelope } from './types.js';

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly KEY_LENGTH = 32;

  // Allow injection of random bytes generator for deterministic testing
  private static randomBytesProvider: (size: number) => Buffer = crypto.randomBytes;

  static setRandomBytesProvider(provider: (size: number) => Buffer) {
    this.randomBytesProvider = provider;
  }

  static resetRandomBytesProvider() {
    this.randomBytesProvider = crypto.randomBytes;
  }

  static generateKey(): Buffer {
    return this.randomBytesProvider(this.KEY_LENGTH);
  }

  static encrypt(
    plaintext: Buffer | string,
    key: Buffer,
    keyId: string,
    aad: any
  ): EncryptedEnvelope {
    if (key.length !== this.KEY_LENGTH) {
      throw new Error(`Invalid key length. Expected ${this.KEY_LENGTH}, got ${key.length}`);
    }

    const iv = this.randomBytesProvider(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const aadString = stringify(aad);
    cipher.setAAD(Buffer.from(aadString, 'utf-8'));

    const input = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      v: 1,
      k: keyId,
      iv: iv.toString('base64'),
      d: encrypted.toString('base64'),
      t: tag.toString('base64'),
      aad,
    };
  }

  static decrypt(envelope: EncryptedEnvelope, key: Buffer): Buffer {
    if (envelope.v !== 1) {
      throw new Error(`Unsupported envelope version: ${envelope.v}`);
    }

    if (key.length !== this.KEY_LENGTH) {
      throw new Error(`Invalid key length. Expected ${this.KEY_LENGTH}, got ${key.length}`);
    }

    const iv = Buffer.from(envelope.iv, 'base64');
    const ciphertext = Buffer.from(envelope.d, 'base64');
    const tag = Buffer.from(envelope.t, 'base64');
    const aadString = stringify(envelope.aad);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from(aadString, 'utf-8'));
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
