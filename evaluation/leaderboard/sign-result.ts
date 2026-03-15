import * as crypto from 'node:crypto';
import stringify from 'fast-json-stable-stringify';

export interface ResultBundlePayload {
  protocolVersion: string;
  benchmarkVersion: string;
  report: Record<string, any>;
  metrics: Record<string, any>;
  stamp: Record<string, any>;
}

export interface SignedResultBundle extends ResultBundlePayload {
  signature: string;
}

/**
 * Signs a benchmark result bundle using an ed25519 private key.
 *
 * @param payload - The bundle data to sign
 * @param privateKeyHex - The hex-encoded ed25519 private key
 * @returns A signed bundle including the signature
 */
export function signResultBundle(payload: ResultBundlePayload, privateKeyHex: string): SignedResultBundle {
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyHex, 'hex'),
    format: 'der',
    type: 'pkcs8'
  });

  const dataToSign = Buffer.from(stringify(payload));
  const signature = crypto.sign(null, dataToSign, privateKey).toString('hex');

  return {
    ...payload,
    signature
  };
}
