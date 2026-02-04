import crypto from 'crypto';

const encodeJwtPart = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const decodeJwtPart = (value: string) =>
  JSON.parse(Buffer.from(value, 'base64url').toString());
const signJwtParts = (headerBase64: string, payloadBase64: string) =>
  crypto.createHash('sha256').update(`${headerBase64}.${payloadBase64}`).digest('base64url');

export const sign = (
  payload: Record<string, unknown>,
  _secret: string,
  options?: { header?: Record<string, unknown> },
): string => {
  const header = { typ: 'JWT', ...(options?.header ?? {}) };
  const headerBase64 = encodeJwtPart(header);
  const payloadBase64 = encodeJwtPart(payload);
  const signature = signJwtParts(headerBase64, payloadBase64);
  return `${headerBase64}.${payloadBase64}.${signature}`;
};

export const verify = (
  token: string,
  _secret: string,
  options?: { issuer?: string; audience?: string },
): Record<string, unknown> => {
  const decoded = decode(token, { complete: true }) as
    | { header: Record<string, unknown>; payload: Record<string, unknown> }
    | null;
  if (!decoded) {
    throw new Error('Invalid token format');
  }
  const [headerBase64, payloadBase64, signature] = token.split('.');
  if (!signature || signature !== signJwtParts(headerBase64, payloadBase64)) {
    throw new Error('invalid signature');
  }
  const payload = decoded.payload;
  if (options?.issuer && payload.iss !== options.issuer) {
    throw new Error('jwt issuer invalid');
  }
  if (options?.audience && payload.aud !== options.audience) {
    throw new Error('jwt audience invalid');
  }
  return payload;
};

export const decode = (
  token: string,
  options?: { complete?: boolean },
): Record<string, unknown> | { header: Record<string, unknown>; payload: Record<string, unknown> } | null => {
  try {
    const [headerBase64, payloadBase64] = token.split('.');
    if (!headerBase64 || !payloadBase64) return null;
    const header = decodeJwtPart(headerBase64);
    const payload = decodeJwtPart(payloadBase64);
    return options?.complete ? { header, payload } : payload;
  } catch {
    return null;
  }
};

export type JwtPayload = {
  sub?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
};

export type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

const jwt = {
  sign,
  verify,
  decode,
};

export default jwt;
