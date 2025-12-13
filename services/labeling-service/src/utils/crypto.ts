/**
 * Cryptographic utilities for signing audit trail entries
 */

import crypto from 'crypto';
import * as ed25519 from '@noble/ed25519';

// ============================================================================
// Key Management
// ============================================================================

export interface KeyPair {
  privateKey: string; // hex-encoded
  publicKey: string; // hex-encoded
}

/**
 * Generate a new Ed25519 key pair for signing
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex'),
  };
}

// ============================================================================
// Signing and Verification
// ============================================================================

/**
 * Sign data with Ed25519 private key
 */
export async function signData(
  data: any,
  privateKeyHex: string,
): Promise<string> {
  const message = JSON.stringify(data, Object.keys(data).sort());
  const messageHash = crypto.createHash('sha256').update(message).digest();

  const privateKey = Buffer.from(privateKeyHex, 'hex');
  const signature = await ed25519.signAsync(messageHash, privateKey);

  return Buffer.from(signature).toString('hex');
}

/**
 * Verify Ed25519 signature
 */
export async function verifySignature(
  data: any,
  signatureHex: string,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const message = JSON.stringify(data, Object.keys(data).sort());
    const messageHash = crypto.createHash('sha256').update(message).digest();

    const signature = Buffer.from(signatureHex, 'hex');
    const publicKey = Buffer.from(publicKeyHex, 'hex');

    return await ed25519.verifyAsync(signature, messageHash, publicKey);
  } catch {
    return false;
  }
}

// ============================================================================
// Hashing
// ============================================================================

/**
 * Generate deterministic hash of data
 */
export function generateHash(data: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data, Object.keys(data).sort()))
    .digest('hex');
}

/**
 * Generate checksum with specified algorithm
 */
export function generateChecksum(
  content: any,
  algorithm: string = 'sha256',
): string {
  const hash = crypto.createHash(algorithm);
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(JSON.stringify(content));
  }
  return hash.digest('hex');
}

// ============================================================================
// Merkle Tree
// ============================================================================

/**
 * Compute Merkle root from array of hashes
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateChecksum(combined));
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

/**
 * Build Merkle tree and return all levels
 */
export function buildMerkleTree(hashes: string[]): string[][] {
  if (hashes.length === 0) return [[]];

  const tree: string[][] = [hashes];

  let currentLevel = hashes;
  while (currentLevel.length > 1) {
    const newLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const combined = currentLevel[i] + currentLevel[i + 1];
        newLevel.push(generateChecksum(combined));
      } else {
        newLevel.push(currentLevel[i]);
      }
    }
    tree.push(newLevel);
    currentLevel = newLevel;
  }

  return tree;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateLabelId(): string {
  return `label_${crypto.randomUUID()}`;
}

export function generateReviewId(): string {
  return `review_${crypto.randomUUID()}`;
}

export function generateQueueId(): string {
  return `queue_${crypto.randomUUID()}`;
}

export function generateAdjudicationId(): string {
  return `adj_${crypto.randomUUID()}`;
}

export function generateAuditId(): string {
  return `audit_${crypto.randomUUID()}`;
}

export function generateExportId(): string {
  return `export_${crypto.randomUUID()}`;
}
