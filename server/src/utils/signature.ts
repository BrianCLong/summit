import crypto from 'crypto';

/**
 * Computes an HMAC digest in hexadecimal format.
 *
 * @param algorithm - The hashing algorithm to use ('sha256' or 'sha1').
 * @param secret - The secret key for the HMAC.
 * @param payloadRaw - The data to sign as a Buffer.
 * @returns The hexadecimal string representation of the HMAC digest.
 */
export function hmacHex(
  algorithm: 'sha256' | 'sha1',
  secret: string,
  payloadRaw: Buffer,
): string {
  return crypto.createHmac(algorithm, secret).update(payloadRaw).digest('hex');
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @returns True if the strings are equal, false otherwise.
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
