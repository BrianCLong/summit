import crypto from 'crypto';

export function hmacHex(
  algorithm: 'sha256' | 'sha1',
  secret: string,
  payloadRaw: Buffer,
): string {
  return crypto.createHmac(algorithm, secret).update(payloadRaw).digest('hex');
}

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
