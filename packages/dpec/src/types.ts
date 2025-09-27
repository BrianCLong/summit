export interface CacheKeyComponents {
  modelHash: string;
  tokenizerHash: string;
  params: Record<string, unknown>;
  toolsGraphHash: string;
  promptHash: string;
}

export type CacheArtifact = Buffer | Uint8Array | string | Record<string, unknown> | Array<unknown>;

export interface CacheFetcherResult {
  artifact: CacheArtifact;
  metadata?: Record<string, unknown>;
}

export type CacheFetcher = (
  key: CacheKeyComponents
) => Promise<CacheFetcherResult> | CacheFetcherResult;

export interface CacheManifestEntry {
  key: string;
  canonicalKey: string;
  artifactDigest: string;
  insertedAt: string;
  lastAccessedAt: string;
  hits: number;
  sequence: number;
  accessCounter: number;
  metadataDigest: string;
}

export interface CacheManifest {
  createdAt: string;
  digest: string;
  entries: CacheManifestEntry[];
}

export interface CacheHitProof {
  type: 'hit';
  key: string;
  artifactDigest: string;
  manifestDigest: string;
  timestamp: string;
  hits: number;
  sequence: number;
  eventDigest: string;
}

export interface EvictionProof {
  type: 'eviction';
  algorithm: 'LRU';
  timestamp: string;
  victim: CacheManifestEntry;
  survivors: Array<Pick<CacheManifestEntry, 'key' | 'accessCounter'>>;
  eventDigest: string;
}

export interface MissFillTrace {
  type: 'miss-fill';
  key: string;
  canonicalKey: string;
  input: CacheKeyComponents;
  artifactDigest: string;
  artifactBase64: string;
  metadataDigest: string;
  timestamp: string;
  eventDigest: string;
}

export interface CacheHitResult {
  type: 'hit';
  artifact: Buffer;
  proof: CacheHitProof;
  entry: CacheManifestEntry;
}

export interface CacheMissResult {
  type: 'miss';
  artifact: Buffer;
  trace: MissFillTrace;
  entry: CacheManifestEntry;
  evictionProofs: EvictionProof[];
}

export type CacheResolution = CacheHitResult | CacheMissResult;

export interface AdapterResolution<TResponse> {
  response: TResponse;
  hit: boolean;
  proof?: CacheHitProof;
  trace?: MissFillTrace;
  evictionProofs?: EvictionProof[];
  entry: CacheManifestEntry;
}
