import crypto from 'crypto';

export type JWTPayload = Record<string, unknown>;
export type JWK = Record<string, unknown>;

function base64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function decodePayload(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('invalid_token');
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload) as JWTPayload;
}

function parseExpiry(value: number | string) {
  if (typeof value === 'number') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith('h')) {
    const hours = Number(trimmed.replace('h', '')) || 0;
    return Math.floor(Date.now() / 1000) + hours * 60 * 60;
  }
  if (trimmed.endsWith('m')) {
    const minutes = Number(trimmed.replace('m', '')) || 0;
    return Math.floor(Date.now() / 1000) + minutes * 60;
  }
  return Math.floor(Date.now() / 1000) + Number(trimmed || 0);
}

export class SignJWT {
  private claims: JWTPayload;
  private header: Record<string, unknown> = {};

  constructor(payload: JWTPayload) {
    this.claims = { ...payload };
  }

  setProtectedHeader(header: Record<string, unknown>) {
    this.header = header;
    return this;
  }

  setIssuedAt(timestamp?: number) {
    const now = Math.floor(Date.now() / 1000);
    this.claims.iat = timestamp ?? now;
    return this;
  }

  setExpirationTime(expiry: number | string) {
    this.claims.exp = parseExpiry(expiry);
    return this;
  }

  setIssuer(issuer: string) {
    this.claims.iss = issuer;
    return this;
  }

  async sign(key: unknown) {
    void key;
    const header = base64url(JSON.stringify(this.header || { alg: 'RS256' }));
    const payload = base64url(JSON.stringify(this.claims));
    const signature = crypto
      .createHash('sha256')
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }
}

export async function jwtVerify(
  token: string,
  key: unknown,
  options: { issuer?: string } = {},
) {
  void key;
  const payload = decodePayload(token);
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp || 0);
  if (exp && exp < now) {
    throw new Error('token_expired');
  }
  if (options.issuer && payload.iss && payload.iss !== options.issuer) {
    throw new Error('issuer_mismatch');
  }
  return { payload };
}

export async function createRemoteJWKSet(url: URL) {
  void url;
  return {};
}

export async function exportJWK(key: unknown): Promise<JWK> {
  void key;
  return { kty: 'oct', k: 'stub' };
}

export async function generateKeyPair(alg: string) {
  void alg;
  return { privateKey: 'stub-private', publicKey: 'stub-public' };
}
