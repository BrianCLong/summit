import crypto from 'crypto';

export interface SessionPayload {
  runId: string;
  servers?: string[];
  scopes: string[];
}

export interface SessionTokenData extends SessionPayload {
  sid: string;
  iat: number; // epoch seconds
  exp: number; // epoch seconds
}

const ALGO = 'sha256';

export function signSession(payload: SessionPayload): {
  sid: string;
  token: string;
} {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET must be set');
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = Number(process.env.SESSION_TTL_SECONDS || 3600);
  const data: SessionTokenData = {
    sid: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSec,
    ...payload,
  };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac(ALGO, secret).update(body).digest('base64url');
  return { sid: data.sid, token: `${body}.${sig}` };
}

export function verifySessionToken(token?: string): SessionTokenData | null {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac(ALGO, secret)
    .update(body)
    .digest('base64url');
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as SessionTokenData;
    if (
      typeof data.exp === 'number' &&
      Math.floor(Date.now() / 1000) > data.exp
    )
      return null;
    return data;
  } catch {
    return null;
  }
}

// Basic in-memory revocation list and registry (ephemeral)
const revoked = new Set<string>();
export function revokeSession(sid: string) {
  revoked.add(sid);
}
export function isRevoked(sid: string) {
  return revoked.has(sid);
}
