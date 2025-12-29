import { createPrivateKey, createPublicKey, sign, verify, KeyObject } from 'node:crypto';

export type SigningKey = KeyObject | string | Buffer;

function normalizePrivateKey(key: SigningKey): KeyObject {
  return key instanceof KeyObject ? key : createPrivateKey(key);
}

function normalizePublicKey(key: SigningKey): KeyObject {
  return key instanceof KeyObject ? key : createPublicKey(key);
}

export function signSnapshot(snapshot: Buffer, privateKey: SigningKey): string {
  const signature = sign(null, snapshot, normalizePrivateKey(privateKey));
  return signature.toString('base64');
}

export function verifySnapshot(
  snapshot: Buffer,
  signatureB64: string,
  publicKey: SigningKey,
): boolean {
  const signature = Buffer.from(signatureB64, 'base64');
  return verify(null, snapshot, normalizePublicKey(publicKey), signature);
}
