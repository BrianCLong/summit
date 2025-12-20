import { createSign, createVerify, sign as edSign, verify as edVerify } from 'crypto';
import { SignatureAlgorithm } from '../types';

export function signPayload(payload: string, privateKey: string, algorithm: SignatureAlgorithm): string {
  const data = Buffer.from(payload);
  if (algorithm === 'ed25519') {
    return edSign(null, data, privateKey).toString('base64');
  }
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

export function verifyPayload(payload: string, signature: string, publicKey: string, algorithm: SignatureAlgorithm): boolean {
  const data = Buffer.from(payload);
  const sig = Buffer.from(signature, 'base64');
  if (algorithm === 'ed25519') {
    return edVerify(null, data, publicKey, sig);
  }
  const verifier = createVerify('RSA-SHA256');
  verifier.update(data);
  verifier.end();
  return verifier.verify(publicKey, sig);
}
