import { createPrivateKey, createPublicKey, sign as signRaw, verify as verifyRaw } from 'node:crypto';

export function signPayload(payload: string, privateKeyPem: string | Buffer): string {
  const key = createPrivateKey(privateKeyPem);
  const signature = signRaw(null, Buffer.from(payload, 'utf8'), key);
  return signature.toString('base64');
}

export function verifyPayload(payload: string, publicKeyPem: string | Buffer, signatureB64: string): boolean {
  const key = createPublicKey(publicKeyPem);
  return verifyRaw(null, Buffer.from(payload, 'utf8'), key, Buffer.from(signatureB64, 'base64'));
}
