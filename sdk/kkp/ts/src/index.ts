import { verify } from '@noble/ed25519';

export interface TokenRequest {
  subject: string;
  audience: string;
  backend: string;
  key_id: string;
  ttl_seconds?: number;
  policy_claims?: Record<string, unknown>;
  request_context?: Record<string, unknown>;
}

export interface Envelope {
  backend: string;
  key_id: string;
  ciphertext: string;
  nonce: string;
  encrypted_data_key: string;
  associated_data?: string;
}

export interface TokenResponse {
  token: string;
  expires_at: number;
  kid: string;
}

export interface DecryptResponse {
  plaintext: string;
  claims: TokenClaims;
}

export interface Jwk {
  kty: 'OKP';
  crv: 'Ed25519';
  kid: string;
  x: string;
  alg: 'EdDSA';
}

export interface TokenClaims {
  sub: string;
  aud: string;
  backend: string;
  key_id: string;
  policy_claims: Record<string, unknown>;
  exp: number;
  iat: number;
  jti: string;
}

export interface KkpClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class KkpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: KkpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('fetch implementation required');
    }
  }

  async issueToken(request: TokenRequest): Promise<TokenResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`token request failed: ${response.status}`);
    }
    return (await response.json()) as TokenResponse;
  }

  async decrypt(envelope: Envelope, token: string, context: Record<string, unknown> = {}): Promise<DecryptResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/envelope/decrypt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope, token, context }),
    });
    if (!response.ok) {
      throw new Error(`decrypt failed: ${response.status}`);
    }
    return (await response.json()) as DecryptResponse;
  }

  async fetchJwks(): Promise<Jwk[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/keys/jwks`);
    if (!response.ok) {
      throw new Error(`jwks fetch failed: ${response.status}`);
    }
    const body = await response.json();
    return (body.keys ?? []) as Jwk[];
  }
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): Uint8Array } }).Buffer;
  if (bufferCtor) {
    const buf = bufferCtor.from(padded, 'base64');
    return new Uint8Array(buf);
  }
  throw new Error('No base64 decoder available');
}

function decodeJson<T>(segment: string): T {
  const bytes = base64UrlDecode(segment);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

export async function verifyToken(token: string, keys: Jwk[]): Promise<TokenClaims> {
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error('token format invalid');
  }
  const header = decodeJson<{ alg: string; kid: string; typ: string }>(headerPart);
  if (header.alg !== 'EdDSA') {
    throw new Error(`unsupported algorithm: ${header.alg}`);
  }
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new Error('unknown key id');
  }
  const publicKey = base64UrlDecode(jwk.x);
  const signature = base64UrlDecode(signaturePart);
  const message = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await verify(signature, message, publicKey);
  if (!valid) {
    throw new Error('signature invalid');
  }
  const claims = decodeJson<TokenClaims>(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) {
    throw new Error('token expired');
  }
  return claims;
}
