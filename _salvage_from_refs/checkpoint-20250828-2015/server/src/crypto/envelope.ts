import crypto from 'crypto';
import { Kms } from './kms';

export type Encrypted = { 
  keyId: string; 
  dekWrapped: Buffer; 
  iv: Buffer; 
  tag: Buffer; 
  ciphertext: Buffer 
};

export async function encryptField(kms: Kms, keyAlias: string, plain: Buffer): Promise<Encrypted> {
  const { keyId, dekWrapped, dekPlain } = await kms.generateDek(keyAlias);
  if (!dekPlain) {
    throw new Error('KMS did not return a plaintext DEK for encryption. This should only happen in production.');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dekPlain, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { keyId, dekWrapped, iv, tag, ciphertext };
}

export async function decryptField(kms: Kms, e: Encrypted): Promise<Buffer> {
  const dek = await kms.decryptDek(e.keyId, e.dekWrapped);
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, e.iv);
  decipher.setAuthTag(e.tag);
  return Buffer.concat([decipher.update(e.ciphertext), decipher.final()]);
}
