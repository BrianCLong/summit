import { manifestCanonicalString, claimCanonicalString } from './common/manifest';
import {
  BrowserVerificationOptions,
  BrowserVerificationResult,
  VerificationIssue,
} from './types';

function collectIssue(message: string, level: VerificationIssue['level'] = 'error'): VerificationIssue {
  return { message, level };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

async function fingerprintPublicKey(publicKey: string): Promise<string> {
  const data = new TextEncoder().encode(publicKey.trim());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(
  manifestCanonical: string,
  signature: string,
  publicKey: string,
  algorithm: string,
): Promise<boolean> {
  if (algorithm !== 'rsa-sha256') {
    throw new Error(`Browser verification currently supports rsa-sha256 only. Requested: ${algorithm}`);
  }
  const keyData = pemToArrayBuffer(publicKey);
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );
  const signatureBuffer = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  const data = new TextEncoder().encode(manifestCanonical);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signatureBuffer, data);
}

export async function verifyManifestInBrowser(
  options: BrowserVerificationOptions,
): Promise<BrowserVerificationResult> {
  const manifest = options.manifest;
  const manifestCanonical = manifestCanonicalString(manifest);
  const issues: VerificationIssue[] = [];
  const signatureValid = await verifySignature(
    manifestCanonical,
    manifest.signature,
    options.publicKey,
    manifest.claim.signer.algorithm,
  );
  if (!signatureValid) {
    issues.push(collectIssue('Signature verification failed'));
  }

  const providedFingerprint = await fingerprintPublicKey(options.publicKey);
  if (providedFingerprint !== manifest.claim.signer.publicKeyFingerprint) {
    issues.push(collectIssue('Signer fingerprint mismatch with provided public key', 'warning'));
  }

  const digest = await crypto.subtle.digest('SHA-256', options.asset);
  const assetHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const validAssetHash = assetHash === manifest.asset.hash;
  if (!validAssetHash) {
    issues.push(collectIssue('Asset hash does not match manifest'));
  }

  const manifestHash = await sha256(manifestCanonical);
  const claimHash = await sha256(claimCanonicalString(manifest));

  return {
    validSignature: signatureValid,
    validAssetHash,
    issues,
    claimHash,
    manifestHash,
  };
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
