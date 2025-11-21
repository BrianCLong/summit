/**
 * Cryptographically Secure Random Utilities
 *
 * This module provides cryptographically secure alternatives to Math.random()
 * for security-sensitive operations.
 *
 * SECURITY: Never use Math.random() for security-sensitive operations such as:
 * - Generating tokens, session IDs, or API keys
 * - Creating cryptographic nonces or IVs
 * - Generating passwords or secrets
 * - Any operation where unpredictability is a security requirement
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param length - The length of the string to generate
 * @param encoding - The encoding to use (default: 'hex')
 * @returns A cryptographically secure random string
 */
export function randomString(
  length: number = 32,
  encoding: BufferEncoding = 'hex'
): string {
  const bytes = Math.ceil(length / 2);
  return crypto.randomBytes(bytes).toString(encoding).slice(0, length);
}

/**
 * Generate a cryptographically secure random integer
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns A cryptographically secure random integer
 */
export function randomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error('min must be less than max');
  }

  return crypto.randomInt(min, max);
}

/**
 * Generate a cryptographically secure random float between 0 and 1
 * @returns A cryptographically secure random float
 */
export function randomFloat(): number {
  // Generate 4 bytes (32 bits) for good precision
  const buffer = crypto.randomBytes(4);
  const value = buffer.readUInt32BE(0);
  // Divide by max 32-bit unsigned int to get a value between 0 and 1
  return value / 0xFFFFFFFF;
}

/**
 * Generate a cryptographically secure UUID v4
 * @returns A cryptographically secure UUID
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a cryptographically secure token
 * @param bytes - Number of random bytes (default: 32)
 * @returns A cryptographically secure token in base64url format
 */
export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate a cryptographically secure ID suitable for database records
 * @param prefix - Optional prefix for the ID
 * @returns A cryptographically secure ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('base64url');

  if (prefix) {
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  return `${timestamp}_${randomPart}`;
}

/**
 * SECURITY WARNING: This function is for non-cryptographic purposes only
 * Use for things like jitter in retry logic, sampling, etc.
 * For security-sensitive operations, use the cryptographically secure alternatives above
 */
export function insecureRandom(): number {
  console.warn(
    'SECURITY WARNING: Using Math.random() for non-cryptographic purpose. ' +
    'If this is security-sensitive, use randomFloat() instead.'
  );
  return Math.random();
}
