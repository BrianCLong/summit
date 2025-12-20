import crypto from 'crypto';

/**
 * Generates an HMAC hex digest for a given payload and secret using the specified algorithm.
 *
 * @param algorithm - The hashing algorithm to use (e.g., 'sha256' or 'sha1')
 * @param secret - The secret key for the HMAC
 * @param payloadRaw - The data to sign as a Buffer
 * @returns The hex-encoded HMAC signature
 */
export function hmacHex(
  algorithm: 'sha256' | 'sha1',
  secret: string,
  payloadRaw: Buffer,
): string {
  return crypto.createHmac(algorithm, secret).update(payloadRaw).digest('hex');
}

/**
 * Performs a timing-safe equality comparison between two strings.
 * This is used to prevent timing attacks when comparing sensitive values like signatures.
 *
 * @param a - The first string to compare
 * @param b - The second string to compare
 * @returns True if the strings are equal, false otherwise
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
