import { createHash } from 'crypto';
import fs from 'fs';

/**
 * Verifies the integrity of a model weights file using SHA-256 checksum.
 * Reads the file, computes its hash, and compares it with the expected hash.
 *
 * @param path - The file path to the weights file.
 * @param expectedSha256 - The expected SHA-256 checksum string.
 * @returns The parsed JSON object from the weights file if verification succeeds.
 * @throws Error if the checksum does not match.
 */
export function verifyWeights(path: string, expectedSha256: string) {
  const buf = fs.readFileSync(path);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== expectedSha256) {
    throw new Error('weights_checksum_mismatch');
  }
  return JSON.parse(buf.toString());
}
