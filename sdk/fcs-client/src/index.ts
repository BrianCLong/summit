import { verify } from '@noble/ed25519';
import type {
  AttributionReport,
  CanaryRecord,
  CanarySpec,
  Detection,
  Provenance,
} from './types.js';

export interface ClientOptions {
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

const textEncoder = new TextEncoder();

function normaliseBaseUrl(baseUrl: string): string {
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('baseUrl must include protocol (http or https)');
  }
  return baseUrl.replace(/\/$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingNeeded);
  const maybeBuffer = (globalThis as { Buffer?: { from(data: string, encoding: string): Uint8Array | ArrayLike<number> } }).Buffer;
  if (maybeBuffer) {
    const bufferResult = maybeBuffer.from(padded, 'base64');
    return bufferResult instanceof Uint8Array ? bufferResult : new Uint8Array(bufferResult);
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function createProvenanceMessage(prov: Provenance): Uint8Array {
  const seeded = Math.floor(new Date(prov.seededAt).getTime() / 1000);
  const expires = Math.floor(new Date(prov.expiresAt).getTime() / 1000);
  const payload = `${prov.canaryId}|${prov.scope}|${prov.ttlSeconds}|${seeded}|${expires}|${prov.retrievalSignature}`;
  return textEncoder.encode(payload);
}

export class FCSClient {
  private readonly baseUrl: string;

  private readonly fetcher: typeof fetch;

  private readonly defaultHeaders: HeadersInit | undefined;

  constructor(baseUrl: string, options: ClientOptions = {}) {
    this.baseUrl = normaliseBaseUrl(baseUrl);
    this.fetcher = options.fetch ?? fetch;
    this.defaultHeaders = options.headers;
  }

  async seedCanary(spec: CanarySpec): Promise<CanaryRecord> {
    return this.request<CanaryRecord>('/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spec),
    });
  }

  async scanDetections(): Promise<Detection[]> {
    return this.request<Detection[]>('/detector/scan', { method: 'GET' });
  }

  async getAttributionReport(): Promise<AttributionReport> {
    return this.request<AttributionReport>('/reports/attribution', { method: 'GET' });
  }

  async getCanary(canaryId: string): Promise<CanaryRecord> {
    if (!canaryId) {
      throw new Error('canaryId is required');
    }
    return this.request<CanaryRecord>(`/canaries/${encodeURIComponent(canaryId)}`, { method: 'GET' });
  }

  async getPublicKey(): Promise<string> {
    const result = await this.request<{ publicKey: string }>('/provenance/public-key', { method: 'GET' });
    return result.publicKey;
  }

  async verifyProvenance(prov: Provenance, publicKeyHex: string): Promise<boolean> {
    const signature = base64UrlToBytes(prov.signature);
    const publicKey = hexToBytes(publicKeyHex);
    const message = createProvenanceMessage(prov);
    return verify(signature, message, publicKey);
  }

  async verifyRecord(record: CanaryRecord, publicKeyHex: string): Promise<boolean> {
    return this.verifyProvenance(record.provenance, publicKeyHex);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...init.headers,
    };
    const response = await this.fetcher(url, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`request failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }
}

export type { AttributionReport, CanaryRecord, CanarySpec, Detection, Provenance } from './types.js';
