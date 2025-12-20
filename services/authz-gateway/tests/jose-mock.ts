type JoseHeader = Record<string, unknown>;

function base64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function decode<T>(token: string): T {
  return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as T;
}

function parseExpiry(value: number | string | Date) {
  const now = Math.floor(Date.now() / 1000);
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  const match = /^([0-9]+)([smhd])?$/.exec(value);
  if (!match) {
    return now + 3600;
  }
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multiplier =
    unit === 'h' ? 3600 : unit === 'm' ? 60 : unit === 'd' ? 86400 : 1;
  return now + amount * multiplier;
}

export class SignJWT {
  private claims: Record<string, unknown>;
  private header: JoseHeader = {};

  constructor(payload: Record<string, unknown> = {}) {
    this.claims = { ...payload };
  }

  setProtectedHeader(header: JoseHeader) {
    this.header = { ...header };
    return this;
  }

  setIssuedAt(value?: number) {
    this.claims.iat =
      typeof value === 'number' ? value : Math.floor(Date.now() / 1000);
    return this;
  }

  setExpirationTime(value: number | string | Date) {
    this.claims.exp = parseExpiry(value);
    return this;
  }

  setSubject(sub: string) {
    this.claims.sub = sub;
    return this;
  }

  setIssuer(iss: string) {
    this.claims.iss = iss;
    return this;
  }

  setAudience(aud: string) {
    this.claims.aud = aud;
    return this;
  }

  sign(_key?: unknown) {
    void _key;
    const token = {
      payload: this.claims,
      header: this.header,
    };
    return Promise.resolve(base64url(JSON.stringify(token)));
  }
}

export async function jwtVerify(
  token: string,
  _key: unknown,
  options?: { audience?: string; issuer?: string },
) {
  const decoded = decode<{
    payload: Record<string, unknown>;
    header: JoseHeader;
  }>(token);
  const payload = decoded.payload || {};
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
  const now = Math.floor(Date.now() / 1000);
  if (exp && exp < now) {
    throw new Error('token_expired');
  }
  if (options?.audience && payload.aud && payload.aud !== options.audience) {
    throw new Error('audience_mismatch');
  }
  if (options?.issuer && payload.iss && payload.iss !== options.issuer) {
    throw new Error('issuer_mismatch');
  }
  return {
    payload,
    protectedHeader: { kid: (decoded.header?.kid as string) || 'mock-kid' },
  };
}

export async function generateKeyPair() {
  return {
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key',
  };
}

export async function exportJWK() {
  return { kty: 'RSA', kid: 'mock-kid', use: 'sig', alg: 'RS256' };
}

export function createRemoteJWKSet() {
  return async () => ({
    keys: [{ kid: 'mock-kid', use: 'sig', alg: 'RS256' }],
  });
}
