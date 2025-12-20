import { readFileSync } from 'node:fs';
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from 'node:crypto';
import { SignatureBlock } from './types.js';

function loadPrivateKey(privateKeyPath: string) {
  const pem = readFileSync(privateKeyPath, 'utf8');
  return createPrivateKey(pem);
}

function resolvePublicKey(privateKeyPath: string, publicKeyPath?: string): string {
  if (publicKeyPath) {
    return readFileSync(publicKeyPath, 'utf8');
  }
  const privateKey = loadPrivateKey(privateKeyPath);
  const publicKey = createPublicKey(privateKey);
  return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

export function signCanonicalPayload(
  canonicalPayload: string,
  privateKeyPath: string,
  publicKeyPath?: string
): SignatureBlock {
  const privateKey = loadPrivateKey(privateKeyPath);
  const signature = edSign(null, Buffer.from(canonicalPayload), privateKey);
  const publicKey = resolvePublicKey(privateKeyPath, publicKeyPath);

  return {
    algorithm: 'ed25519',
    publicKey,
    value: signature.toString('base64'),
  };
}

export function verifySignature(
  canonicalPayload: string,
  signature: SignatureBlock
): boolean {
  const publicKey = createPublicKey(signature.publicKey);
  return edVerify(null, Buffer.from(canonicalPayload), publicKey, Buffer.from(signature.value, 'base64'));
}
