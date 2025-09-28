import { Buffer } from 'node:buffer';
import nacl from 'tweetnacl';

type FetchImpl = typeof fetch;

export interface ExportRequest {
  partnerId: string;
  purpose: string;
  jurisdiction?: string;
  dryRun?: boolean;
}

export interface ExportFilters {
  purpose: string;
  jurisdiction: string;
  dryRun: boolean;
}

export interface SanitizedRecord {
  id: string;
  dataset: string;
  fullName: string;
  region: string;
  emailToken: string;
  ssn: string;
  capturedAt: string;
}

export interface RecordProof {
  recordId: string;
  hash: string;
}

export interface DatasetManifest {
  name: string;
  recordCount: number;
  proofs: RecordProof[];
  transforms: string[];
}

export interface ExportManifest {
  id: string;
  partnerId: string;
  generatedAt: string;
  filters: ExportFilters;
  proofAlgorithm: string;
  datasets: DatasetManifest[];
  signature: string;
}

export interface ExportResult {
  exportId: string;
  records: SanitizedRecord[];
  manifest: ExportManifest;
  preview: boolean;
}

export interface Attestation {
  partnerId: string;
  statement: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

export interface AttestationResult {
  partnerId: string;
  valid: boolean;
  reason?: string;
}

const MANIFEST_PUBLIC_KEY_HEX = '4221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc';

export class CSDBClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;

  constructor(baseUrl: string, fetchImpl: FetchImpl = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  async createExport(request: ExportRequest): Promise<ExportResult> {
    return this.post<ExportResult>('/exports', request);
  }

  async previewExport(request: ExportRequest): Promise<ExportResult> {
    return this.post<ExportResult>('/exports/preview', request);
  }

  async getManifest(exportId: string): Promise<ExportManifest> {
    return this.get<ExportManifest>(`/manifests/${encodeURIComponent(exportId)}`);
  }

  async validateAttestation(attestation: Attestation): Promise<AttestationResult> {
    return this.post<AttestationResult>('/attestations/verify', attestation);
  }

  async verifyManifest(manifest: ExportManifest): Promise<boolean> {
    return verifyManifest(manifest);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return this.parseResponse<T>(response);
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`);
    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || response.statusText);
    }
    return (await response.json()) as T;
  }
}

export function buildAttestationPayload(attestation: Attestation): string {
  return [
    attestation.partnerId,
    attestation.statement,
    new Date(attestation.timestamp).toISOString(),
    attestation.nonce,
  ].join('|');
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('hex string must have an even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function canonicalManifest(manifest: ExportManifest): Uint8Array {
  const normalised = {
    id: manifest.id,
    partnerId: manifest.partnerId,
    generatedAt: manifest.generatedAt,
    filters: {
      purpose: manifest.filters.purpose,
      jurisdiction: manifest.filters.jurisdiction,
      dryRun: manifest.filters.dryRun ?? false,
    },
    proofAlgorithm: manifest.proofAlgorithm,
    datasets: manifest.datasets.map((dataset) => ({
      name: dataset.name,
      recordCount: dataset.recordCount,
      proofs: [...dataset.proofs]
        .map((proof) => ({ recordId: proof.recordId, hash: proof.hash }))
        .sort((a, b) => a.recordId.localeCompare(b.recordId)),
      transforms: [...dataset.transforms].sort(),
    })),
    signature: '',
  };
  return new TextEncoder().encode(JSON.stringify(normalised));
}

export async function verifyManifest(manifest: ExportManifest): Promise<boolean> {
  const signatureBytes = Uint8Array.from(Buffer.from(manifest.signature, 'base64'));
  const message = canonicalManifest(manifest);
  const publicKey = hexToBytes(MANIFEST_PUBLIC_KEY_HEX);
  return nacl.sign.detached.verify(message, signatureBytes, publicKey);
}

export const manifestPublicKeyHex = MANIFEST_PUBLIC_KEY_HEX;
