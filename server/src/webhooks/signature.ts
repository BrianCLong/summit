import crypto from 'crypto';

const SIGNATURE_VERSION = 'v1';

export function signPayload(
  secret: string,
  payload: unknown,
  timestamp: number,
  idempotencyKey: string,
): string {
  const body =
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${idempotencyKey}.${body}`);
  return `${SIGNATURE_VERSION}=${hmac.digest('hex')}`;
}

export function verifySignature(
  secret: string,
  payload: unknown,
  timestamp: number,
  idempotencyKey: string,
  signature: string,
): boolean {
  const expected = signPayload(secret, payload, timestamp, idempotencyKey);
  const normalizedGiven = Buffer.from(signature || '');
  const normalizedExpected = Buffer.from(expected);

  if (normalizedExpected.length !== normalizedGiven.length) {
    return false;
  }

  return crypto.timingSafeEqual(normalizedExpected, normalizedGiven);
}
