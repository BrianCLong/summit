import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

export interface RecordAttributes {
  [key: string]: unknown;
}

export interface DatasetRecord {
  id: string;
  geo: string;
  consented_partners: string[];
  consent_tags: string[];
  attributes?: RecordAttributes;
  metadata?: RecordAttributes;
}

export interface Dataset {
  records: DatasetRecord[];
}

export interface StratumRequest {
  name: string;
  target: number;
  geo?: string[];
  consentTags?: string[];
}

export interface SamplingRequest {
  partnerId: string;
  seed: string;
  strata: StratumRequest[];
  exclusions?: string[];
}

export interface StratumCertificate {
  name: string;
  target: number;
  geo?: string[];
  consentTags?: string[];
  sampledIds: string[];
  seedOutput: string;
  seedProof: string;
}

export interface SamplingCertificate {
  partnerId: string;
  seed: string;
  vrfPublicKey: string;
  strata: StratumCertificate[];
  exclusions: string[];
  generatedAt: string;
}

export interface SamplingResponse {
  samples: Record<string, DatasetRecord[]>;
  certificate: SamplingCertificate;
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  samples?: Record<string, DatasetRecord[]>;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class PSBClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string, fetchImpl?: FetchLike) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    const resolvedFetch = fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
    if (!resolvedFetch) {
      throw new Error('fetch implementation is required');
    }
    this.fetchImpl = resolvedFetch;
  }

  async sample(request: SamplingRequest): Promise<SamplingResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`sampling request failed: ${res.status} ${res.statusText} ${message}`);
    }
    return res.json();
  }

  async verifyRemote(certificate: SamplingCertificate): Promise<VerificationResult> {
    const res = await this.fetchImpl(`${this.baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certificate),
    });
    if (!res.ok) {
      const body = await res.text();
      return { valid: false, errors: [`remote verification failed: ${body}`] };
    }
    const data = await res.json();
    return { valid: true, errors: [], samples: data.samples };
  }

  verifyOffline(certificate: SamplingCertificate, dataset: Dataset): VerificationResult {
    return replaySamples(dataset, certificate);
  }
}

export function replaySamples(dataset: Dataset, certificate: SamplingCertificate): VerificationResult {
  const errors: string[] = [];
  const samples: Record<string, DatasetRecord[]> = {};
  const exclusionSet = new Set(certificate.exclusions ?? []);
  const datasetIndex = new Map(dataset.records.map((record) => [record.id, record] as const));
  const already = new Set<string>();

  for (const stratum of certificate.strata) {
    let proofBytes: Uint8Array;
    let seedOutput: Uint8Array;
    try {
      proofBytes = decodeHex(stratum.seedProof);
      seedOutput = decodeHex(stratum.seedOutput);
    } catch (err) {
      errors.push(`invalid hex for ${stratum.name}: ${String(err)}`);
      continue;
    }

    const message = new TextEncoder().encode(`${certificate.seed}:${stratum.name}`);
    if (!verifySeed(message, proofBytes, certificate.vrfPublicKey)) {
      errors.push(`seed proof failed for stratum ${stratum.name}`);
      continue;
    }

    const digest = sha256(proofBytes);
    if (!constantEquals(digest, seedOutput)) {
      errors.push(`seed output mismatch for stratum ${stratum.name}`);
      continue;
    }

    const candidates = dataset.records.filter((record) => {
      if (exclusionSet.has(record.id) || already.has(record.id)) {
        return false;
      }
      if (!record.consented_partners.includes(certificate.partnerId)) {
        return false;
      }
      if (stratum.geo && stratum.geo.length > 0 && !stratum.geo.includes(record.geo)) {
        return false;
      }
      if (stratum.consentTags && !stratum.consentTags.every((tag) => record.consent_tags.includes(tag))) {
        return false;
      }
      return true;
    });

    const ranked = candidates
      .map((record) => ({
        record,
        score: sha256(concat(seedOutput, `:${record.id}`)),
      }))
      .sort((a, b) => lexicographicCompare(a.score, b.score));

    const expected = Math.min(stratum.target, ranked.length);
    if (stratum.sampledIds.length !== expected) {
      errors.push(`stratum ${stratum.name} expected ${expected} ids but has ${stratum.sampledIds.length}`);
      continue;
    }

    const selected: DatasetRecord[] = [];
    for (let i = 0; i < expected; i += 1) {
      const expectedId = ranked[i].record.id;
      if (stratum.sampledIds[i] !== expectedId) {
        errors.push(`stratum ${stratum.name} mismatch at index ${i}`);
        break;
      }
      const record = datasetIndex.get(expectedId);
      if (!record) {
        errors.push(`record ${expectedId} missing from dataset`);
        break;
      }
      selected.push(record);
      already.add(expectedId);
    }

    if (selected.length === expected) {
      samples[stratum.name] = selected;
    }
  }

  return { valid: errors.length === 0, errors, samples: Object.keys(samples).length ? samples : undefined };
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest());
}

function concat(seed: Uint8Array, suffix: string): Uint8Array {
  const suffixBytes = new TextEncoder().encode(suffix);
  const combined = new Uint8Array(seed.length + suffixBytes.length);
  combined.set(seed, 0);
  combined.set(suffixBytes, seed.length);
  return combined;
}

function decodeHex(value: string): Uint8Array {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw new Error('invalid hex string');
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
}

function constantEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function lexicographicCompare(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

function verifySeed(message: Uint8Array, proof: Uint8Array, publicKeyHex: string): boolean {
  const publicKeyBytes = decodeHex(publicKeyHex);
  const prefix = Buffer.from('302a300506032b6570032100', 'hex');
  const spki = Buffer.concat([prefix, Buffer.from(publicKeyBytes)]);
  const keyObject = createPublicKey({ key: spki, format: 'der', type: 'spki' });
  return verifySignature(null, Buffer.from(message), keyObject, Buffer.from(proof));
}
