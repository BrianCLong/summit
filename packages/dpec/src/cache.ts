import { canonicalDigest, sha256, stableStringify } from './hash.js';
import type {
  CacheFetcher,
  CacheHitProof,
  CacheHitResult,
  CacheKeyComponents,
  CacheManifest,
  CacheManifestEntry,
  CacheMissResult,
  CacheResolution,
  EvictionProof,
  MissFillTrace
} from './types.js';
import type { CacheArtifact, CacheFetcherResult } from './types.js';

interface CacheEntry {
  key: string;
  canonicalKey: string;
  components: CacheKeyComponents;
  artifact: Buffer;
  metadataDigest: string;
  artifactDigest: string;
  insertedAt: string;
  lastAccessedAt: string;
  hits: number;
  sequence: number;
  accessCounter: number;
}

export interface DeterministicPromptExecutionCacheOptions {
  maxEntries?: number;
  clock?: () => number;
}

const DEFAULT_MAX_ENTRIES = 256;

function normalizeArtifact(artifact: CacheArtifact): Buffer {
  if (artifact instanceof Uint8Array) {
    return Buffer.from(artifact);
  }
  if (typeof artifact === 'string') {
    return Buffer.from(artifact, 'utf8');
  }
  if (Buffer.isBuffer(artifact)) {
    return Buffer.from(artifact);
  }
  return Buffer.from(stableStringify(artifact));
}

function canonicalKey(components: CacheKeyComponents): string {
  return stableStringify({
    modelHash: components.modelHash,
    tokenizerHash: components.tokenizerHash,
    params: components.params,
    toolsGraphHash: components.toolsGraphHash,
    promptHash: components.promptHash
  });
}

function computeKey(components: CacheKeyComponents): string {
  return sha256(canonicalKey(components));
}

function nowISO(clock: () => number): string {
  return new Date(clock()).toISOString();
}

export class DeterministicPromptExecutionCache {
  private readonly entries = new Map<string, CacheEntry>();

  private readonly traces: MissFillTrace[] = [];

  private readonly options: Required<DeterministicPromptExecutionCacheOptions>;

  private accessCounter = 0;

  private sequence = 0;

  constructor(options: DeterministicPromptExecutionCacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
      clock: options.clock ?? (() => Date.now())
    };
  }

  async resolve(
    components: CacheKeyComponents,
    fetcher: CacheFetcher
  ): Promise<CacheResolution> {
    const key = computeKey(components);
    const canonical = canonicalKey(components);
    const existing = this.entries.get(key);

    if (existing) {
      existing.hits += 1;
      existing.lastAccessedAt = nowISO(this.options.clock);
      existing.accessCounter = ++this.accessCounter;
      const entryManifest = this.toManifestEntry(existing);
      const proof = this.buildHitProof(entryManifest);
      return {
        type: 'hit',
        artifact: Buffer.from(existing.artifact),
        proof,
        entry: entryManifest
      } satisfies CacheHitResult;
    }

    const fetched = await Promise.resolve(fetcher(components));
    const normalized = normalizeArtifact(fetched.artifact);
    const metadataDigest = canonicalDigest(fetched.metadata ?? {});
    const artifactDigest = sha256(normalized);
    const timestamp = nowISO(this.options.clock);
    const entry: CacheEntry = {
      key,
      canonicalKey: canonical,
      components: {
        modelHash: components.modelHash,
        tokenizerHash: components.tokenizerHash,
        params: structuredClone(components.params),
        toolsGraphHash: components.toolsGraphHash,
        promptHash: components.promptHash
      },
      artifact: Buffer.from(normalized),
      metadataDigest,
      artifactDigest,
      insertedAt: timestamp,
      lastAccessedAt: timestamp,
      hits: 1,
      sequence: ++this.sequence,
      accessCounter: ++this.accessCounter
    };
    this.entries.set(key, entry);

    const trace = this.recordTrace(entry, fetched.artifact, fetched.metadata ?? {});
    const evictionProofs = this.evictIfNeeded();
    const manifestEntry = this.toManifestEntry(entry);

    return {
      type: 'miss',
      artifact: Buffer.from(entry.artifact),
      trace,
      entry: manifestEntry,
      evictionProofs
    } satisfies CacheMissResult;
  }

  getTraces(): MissFillTrace[] {
    return this.traces.map((trace) => ({
      ...trace,
      input: {
        modelHash: trace.input.modelHash,
        tokenizerHash: trace.input.tokenizerHash,
        params: structuredClone(trace.input.params),
        toolsGraphHash: trace.input.toolsGraphHash,
        promptHash: trace.input.promptHash
      }
    }));
  }

  generateManifest(): CacheManifest {
    const entries = Array.from(this.entries.values()).map((entry) => this.toManifestEntry(entry));
    entries.sort((a, b) => a.key.localeCompare(b.key));
    const digest = sha256(Buffer.from(stableStringify(entries)));
    return {
      createdAt: nowISO(this.options.clock),
      digest,
      entries
    };
  }

  private toManifestEntry(entry: CacheEntry): CacheManifestEntry {
    return {
      key: entry.key,
      canonicalKey: entry.canonicalKey,
      artifactDigest: entry.artifactDigest,
      insertedAt: entry.insertedAt,
      lastAccessedAt: entry.lastAccessedAt,
      hits: entry.hits,
      sequence: entry.sequence,
      accessCounter: entry.accessCounter,
      metadataDigest: entry.metadataDigest
    };
  }

  private buildHitProof(entry: CacheManifestEntry): CacheHitProof {
    const manifestDigest = this.computeManifestDigestSnapshot();
    const timestamp = nowISO(this.options.clock);
    const payload = {
      type: 'hit' as const,
      key: entry.key,
      artifactDigest: entry.artifactDigest,
      manifestDigest,
      hits: entry.hits,
      sequence: entry.sequence,
      timestamp
    } satisfies Omit<CacheHitProof, 'eventDigest'>;
    return {
      ...payload,
      eventDigest: sha256(Buffer.from(stableStringify(payload)))
    };
  }

  private computeManifestDigestSnapshot(): string {
    const entries = Array.from(this.entries.values())
      .map((entry) => this.toManifestEntry(entry))
      .sort((a, b) => a.key.localeCompare(b.key));
    return sha256(Buffer.from(stableStringify(entries)));
  }

  private recordTrace(
    entry: CacheEntry,
    artifact: CacheFetcherResult['artifact'],
    metadata: Record<string, unknown>
  ): MissFillTrace {
    const artifactBuffer = normalizeArtifact(artifact);
    const input: CacheKeyComponents = {
      modelHash: entry.components.modelHash,
      tokenizerHash: entry.components.tokenizerHash,
      params: structuredClone(entry.components.params),
      toolsGraphHash: entry.components.toolsGraphHash,
      promptHash: entry.components.promptHash
    };
    const payload = {
      type: 'miss-fill' as const,
      key: entry.key,
      canonicalKey: entry.canonicalKey,
      input,
      artifactDigest: sha256(artifactBuffer),
      artifactBase64: artifactBuffer.toString('base64'),
      metadataDigest: canonicalDigest(metadata),
      timestamp: nowISO(this.options.clock)
    } satisfies Omit<MissFillTrace, 'eventDigest'>;
    const trace: MissFillTrace = {
      ...payload,
      eventDigest: sha256(Buffer.from(stableStringify(payload)))
    };
    this.traces.push(trace);
    return trace;
  }

  private evictIfNeeded(): EvictionProof[] {
    const proofs: EvictionProof[] = [];
    while (this.entries.size > this.options.maxEntries) {
      const victim = this.selectEvictionCandidate();
      if (!victim) {
        break;
      }
      const survivors = Array.from(this.entries.values())
        .filter((entry) => entry.key !== victim.key)
        .map((entry) => ({ key: entry.key, accessCounter: entry.accessCounter }))
        .sort((a, b) => a.accessCounter - b.accessCounter);
      const payload = {
        type: 'eviction' as const,
        algorithm: 'LRU' as const,
        timestamp: nowISO(this.options.clock),
        victim: this.toManifestEntry(victim),
        survivors
      } satisfies Omit<EvictionProof, 'eventDigest'>;
      const proof: EvictionProof = {
        ...payload,
        eventDigest: sha256(Buffer.from(stableStringify(payload)))
      };
      this.entries.delete(victim.key);
      proofs.push(proof);
    }
    return proofs;
  }

  private selectEvictionCandidate(): CacheEntry | undefined {
    let candidate: CacheEntry | undefined;
    for (const entry of this.entries.values()) {
      if (!candidate || entry.accessCounter < candidate.accessCounter) {
        candidate = entry;
      }
    }
    return candidate;
  }

  static verifyManifest(manifest: CacheManifest, reference?: CacheManifestEntry[]): boolean {
    const sortedEntries = [...manifest.entries].sort((a, b) => a.key.localeCompare(b.key));
    const digest = sha256(Buffer.from(stableStringify(sortedEntries)));
    if (digest !== manifest.digest) {
      return false;
    }
    if (!reference) {
      return true;
    }
    const refSorted = [...reference].sort((a, b) => a.key.localeCompare(b.key));
    return stableStringify(refSorted) === stableStringify(sortedEntries);
  }

  static verifyHitProof(proof: CacheHitProof, manifest: CacheManifest): boolean {
    if (proof.type !== 'hit') {
      return false;
    }
    if (manifest.digest !== proof.manifestDigest) {
      return false;
    }
    const payload = {
      type: proof.type,
      key: proof.key,
      artifactDigest: proof.artifactDigest,
      manifestDigest: proof.manifestDigest,
      hits: proof.hits,
      sequence: proof.sequence,
      timestamp: proof.timestamp
    } satisfies Omit<CacheHitProof, 'eventDigest'>;
    const canonical = stableStringify(payload);
    if (sha256(Buffer.from(canonical)) !== proof.eventDigest) {
      return false;
    }
    const entry = manifest.entries.find((item) => item.key === proof.key);
    if (!entry) {
      return false;
    }
    return (
      entry.artifactDigest === proof.artifactDigest &&
      entry.hits === proof.hits &&
      entry.sequence === proof.sequence
    );
  }

  static verifyEvictionProof(proof: EvictionProof): boolean {
    if (proof.type !== 'eviction' || proof.algorithm !== 'LRU') {
      return false;
    }
    const payload = {
      type: proof.type,
      algorithm: proof.algorithm,
      timestamp: proof.timestamp,
      victim: proof.victim,
      survivors: proof.survivors
    } satisfies Omit<EvictionProof, 'eventDigest'>;
    const canonical = stableStringify(payload);
    if (sha256(Buffer.from(canonical)) !== proof.eventDigest) {
      return false;
    }
    for (const survivor of proof.survivors) {
      if (survivor.accessCounter <= proof.victim.accessCounter) {
        return false;
      }
    }
    return true;
  }

  static async replayTrace(
    trace: MissFillTrace,
    fetcher: CacheFetcher
  ): Promise<boolean> {
    const key = computeKey(trace.input);
    if (key !== trace.key) {
      return false;
    }
    const result = await Promise.resolve(fetcher(trace.input));
    const artifactBuffer = normalizeArtifact(result.artifact);
    const digest = sha256(artifactBuffer);
    return digest === trace.artifactDigest;
  }
}

export type { CacheResolution, CacheHitResult, CacheMissResult } from './types.js';
