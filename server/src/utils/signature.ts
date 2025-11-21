import crypto from 'crypto';

/**
 * Computes the HMAC (Hash-based Message Authentication Code) of a payload.
 *
 * @param {string} algorithm - The hashing algorithm to use (e.g., 'sha256', 'sha1').
 * @param {string} secret - The secret key used for signing.
 * @param {Buffer} payloadRaw - The payload to sign, as a Buffer.
 * @returns {string} The computed HMAC as a hexadecimal string.
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
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @returns {boolean} True if the strings are equal, false otherwise.
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
