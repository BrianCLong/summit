/**
 * Cryptographic hash utilities for content integrity
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash of content
 */
export function generateHash(content: unknown): string {
  const normalized = typeof content === 'string'
    ? content
    : JSON.stringify(content, Object.keys(content as object).sort());

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex');
}

/**
 * Generate content hash with specified algorithm
 */
export function generateContentHash(
  content: string | Buffer | object,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256',
): string {
  const hash = crypto.createHash(algorithm);

  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content, 'utf8');
  } else {
    hash.update(JSON.stringify(content, Object.keys(content).sort()));
  }

  return hash.digest('hex');
}

/**
 * Verify content against expected hash
 */
export function verifyHash(
  content: unknown,
  expectedHash: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256',
): boolean {
  const actualHash = typeof content === 'string' || Buffer.isBuffer(content)
    ? generateContentHash(content, algorithm)
    : generateHash(content);

  return actualHash === expectedHash;
}

/**
 * Compute Merkle root from list of hashes
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateContentHash(combined));
    } else {
      // Odd number of hashes, carry the last one up
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

/**
 * Generate Merkle proof for a hash at given index
 */
export function generateMerkleProof(
  hashes: string[],
  index: number,
): { proof: string[]; directions: ('left' | 'right')[] } {
  if (index < 0 || index >= hashes.length) {
    throw new Error('Index out of bounds');
  }

  const proof: string[] = [];
  const directions: ('left' | 'right')[] = [];
  let currentIndex = index;
  let currentLevel = [...hashes];

  while (currentLevel.length > 1) {
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
      directions.push(isRightNode ? 'left' : 'right');
    }

    // Move to next level
    const newLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        newLevel.push(generateContentHash(currentLevel[i] + currentLevel[i + 1]));
      } else {
        newLevel.push(currentLevel[i]);
      }
    }
    currentLevel = newLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return { proof, directions };
}

/**
 * Verify Merkle proof
 */
export function verifyMerkleProof(
  hash: string,
  proof: string[],
  directions: ('left' | 'right')[],
  merkleRoot: string,
): boolean {
  let currentHash = hash;

  for (let i = 0; i < proof.length; i++) {
    const sibling = proof[i];
    currentHash = directions[i] === 'left'
      ? generateContentHash(sibling + currentHash)
      : generateContentHash(currentHash + sibling);
  }

  return currentHash === merkleRoot;
}
