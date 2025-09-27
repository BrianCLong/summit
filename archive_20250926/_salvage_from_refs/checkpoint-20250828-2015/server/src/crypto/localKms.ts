import crypto from 'crypto';
import { Kms } from './kms';

// NOTE: This is a mock KMS for development purposes only. DO NOT USE IN PRODUCTION.
const KEYS: Record<string, Buffer> = {}; // Stores KEKs, mapping alias to key material

function getKek(alias: string): Buffer {
  // In a real scenario, this would fetch from a secure key vault.
  // For local dev, we generate and store it in memory.
  if (!KEYS[alias]) {
    console.warn(`Generating new dev KEK for alias: ${alias}`);
    KEYS[alias] = crypto.randomBytes(32); // AES-256 KEK
  }
  return KEYS[alias];
}

export class LocalKms implements Kms {
  async generateDek(keyAlias: string): Promise<{ keyId: string; dekWrapped: Buffer; dekPlain?: Buffer }> {
    const dek = crypto.randomBytes(32); // AES-256 DEK
    const kek = getKek(keyAlias);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    const dekWrapped = Buffer.concat([iv, cipher.update(dek), cipher.final(), cipher.getAuthTag()]);

    // The keyId should be a stable reference to the KEK version used.
    const keyId = `${keyAlias}-v1`; 
    return { keyId, dekWrapped, dekPlain: dek };
  }

  async decryptDek(keyId: string, dekWrapped: Buffer): Promise<Buffer> {
    const keyAlias = keyId.split('-v')[0];
    const kek = getKek(keyAlias);
    
    const iv = dekWrapped.slice(0, 12);
    const tag = dekWrapped.slice(dekWrapped.length - 16);
    const ciphertext = dekWrapped.slice(12, dekWrapped.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  async rewrapDek(oldKeyId: string, newKeyAlias: string, dekWrapped: Buffer): Promise<{ keyId: string; dekWrapped: Buffer }> {
    const dekPlain = await this.decryptDek(oldKeyId, dekWrapped);
    const newKek = getKek(newKeyAlias);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', newKek, iv);
    const newDekWrapped = Buffer.concat([iv, cipher.update(dekPlain), cipher.final(), cipher.getAuthTag()]);
    
    const newKeyId = `${newKeyAlias}-v${parseInt(oldKeyId.split('-v')[1] || '1') + 1}`;
    return { keyId: newKeyId, dekWrapped: newDekWrapped };
  }
}
