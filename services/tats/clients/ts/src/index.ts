import base64url from 'base64url';
import nacl from 'tweetnacl';

type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface IssueTokenRequest {
  audience: string;
  dataset_ids: string[];
  row_scopes?: Record<string, string[]>;
  purposes: string[];
  ttl_seconds?: number;
  nonce?: string;
}

export interface TokenResponse {
  token: string;
  token_id: string;
  expires_at: number;
}

export interface AttenuationRequest {
  parent_token: string;
  dataset_ids?: string[];
  row_scopes?: Record<string, string[]>;
  purposes?: string[];
  ttl_seconds?: number;
  nonce?: string;
}

export interface TokenHeader {
  alg: string;
  typ: string;
  kid?: string;
}

export interface TokenClaims {
  jti: string;
  parent?: string;
  audience: string;
  dataset_ids: string[];
  row_scopes?: Record<string, string[]>;
  purposes: string[];
  issued_at: number;
  expires_at: number;
  nonce: string;
}

export interface VerificationOptions {
  expectedAudience?: string;
  requiredDatasets?: string[];
  requiredRowScopes?: Record<string, string[]>;
  requiredPurposes?: string[];
  now?: () => number;
}

export interface ReplayCache {
  checkAndStore(jti: string, expiresAt: number): boolean;
}

export class InMemoryReplayCache implements ReplayCache {
  private readonly store = new Map<string, number>();

  constructor(private readonly now: () => number = () => Math.floor(Date.now() / 1000)) {}

  checkAndStore(jti: string, expiresAt: number): boolean {
    const now = this.now();
    for (const [key, exp] of this.store.entries()) {
      if (exp <= now) {
        this.store.delete(key);
      }
    }
    if (this.store.has(jti)) {
      return false;
    }
    this.store.set(jti, expiresAt);
    return true;
  }
}

export class TatsClient {
  constructor(private readonly baseUrl: string, private readonly fetchImpl: FetchLike = fetch) {}

  async issueToken(request: IssueTokenRequest): Promise<TokenResponse> {
    return this.post<TokenResponse>('/v1/tokens', request);
  }

  async attenuate(request: AttenuationRequest): Promise<TokenResponse> {
    return this.post<TokenResponse>('/v1/attenuate', request);
  }

  async publicKey(): Promise<string> {
    const response = await this.fetchImpl(new URL('/v1/keys', this.baseUrl), {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`failed to fetch public key: ${response.status}`);
    }
    const payload = await response.json();
    return payload.public_key as string;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(new URL(path, this.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`request failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }
}

export function verifyToken(
  token: string,
  publicKey: string | Uint8Array,
  cache: ReplayCache,
  options: VerificationOptions = {}
): TokenClaims {
  const parsed = parseToken(token);
  const message = new TextEncoder().encode(`${parsed.headerB64}.${parsed.payloadB64}`);
  const signature = base64url.toBuffer(parsed.signatureB64);
  const key = typeof publicKey === 'string' ? decodeBase64(publicKey) : publicKey;
  const valid = nacl.sign.detached.verify(message, signature, key);
  if (!valid) {
    throw new Error('invalid signature');
  }

  const nowFn = options.now ?? (() => Math.floor(Date.now() / 1000));
  if (parsed.claims.expires_at <= nowFn()) {
    throw new Error('token expired');
  }
  if (options.expectedAudience && parsed.claims.audience !== options.expectedAudience) {
    throw new Error('audience mismatch');
  }
  if (options.requiredDatasets) {
    for (const dataset of options.requiredDatasets) {
      if (!parsed.claims.dataset_ids.includes(dataset)) {
        throw new Error('dataset mismatch');
      }
    }
  }
  if (options.requiredRowScopes) {
    for (const [dataset, rows] of Object.entries(options.requiredRowScopes)) {
      const allowed = parsed.claims.row_scopes?.[dataset];
      if (!allowed) {
        if (!parsed.claims.dataset_ids.includes(dataset)) {
          throw new Error('row scope mismatch');
        }
        continue;
      }
      for (const row of rows) {
        if (!allowed.includes(row)) {
          throw new Error('row scope mismatch');
        }
      }
    }
  }
  if (options.requiredPurposes) {
    for (const purpose of options.requiredPurposes) {
      if (!parsed.claims.purposes.includes(purpose)) {
        throw new Error('purpose mismatch');
      }
    }
  }
  if (!cache.checkAndStore(parsed.claims.jti, parsed.claims.expires_at)) {
    throw new Error('replay detected');
  }
  return parsed.claims;
}

interface ParsedToken {
  header: TokenHeader;
  claims: TokenClaims;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
}

function parseToken(token: string): ParsedToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('token format invalid');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const decoder = new TextDecoder();
  const header: TokenHeader = JSON.parse(decoder.decode(base64url.toBuffer(headerB64)));
  const claims: TokenClaims = JSON.parse(decoder.decode(base64url.toBuffer(payloadB64)));
  return { header, claims, headerB64, payloadB64, signatureB64 };
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
