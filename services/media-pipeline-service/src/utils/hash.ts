/**
 * Hashing Utilities
 *
 * Provides cryptographic hashing for checksums and integrity verification.
 */

import { createHash, randomUUID } from 'crypto';
import { createReadStream } from 'fs';

/**
 * Compute SHA256 hash of a string
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute SHA256 hash of a buffer
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute SHA256 hash of a file by streaming
 */
export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Compute SHA256 hash of JSON object (deterministic)
 */
export function hashObject(obj: unknown): string {
  const normalized = JSON.stringify(obj, Object.keys(obj as object).sort());
  return hashString(normalized);
}

/**
 * Generate a new UUID v4
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Verify checksum matches expected value
 */
export function verifyChecksum(data: string | Buffer, expectedChecksum: string): boolean {
  const actualChecksum = typeof data === 'string' ? hashString(data) : hashBuffer(data);
  return actualChecksum === expectedChecksum;
}
