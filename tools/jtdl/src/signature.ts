import crypto from 'node:crypto';
import { ImpactSignature } from './types.js';
import { stableStringify } from './stable-stringify.js';

const ALGORITHM = 'HS256';

export const signPayload = (
  payload: unknown,
  signingKey: string,
  keyId: string,
): ImpactSignature => {
  const canonical = stableStringify(payload);
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(canonical);
  const signature = hmac.digest('base64url');
  return {
    algorithm: ALGORITHM,
    signature,
    keyId,
  };
};

export const verifySignature = (
  payload: unknown,
  signature: ImpactSignature,
  signingKey: string,
): boolean => {
  if (signature.algorithm !== ALGORITHM) {
    return false;
  }
  const canonical = stableStringify(payload);
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(canonical);
  const expected = hmac.digest('base64url');
  return crypto.timingSafeEqual(
    Buffer.from(signature.signature),
    Buffer.from(expected),
  );
};
