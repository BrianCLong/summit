import { Canonicalizer } from './canonicalizer.js';
import { NgramHasher } from './ngram-hasher.js';
import { MemoryGate } from './memory-gate.js';
import { EngramStore, EngramRecord } from './store.js';

export interface MemoryLookupRequest {
  query: string;
  phase: string;
  tenantId: string;
  limit?: number;
}

export interface MemoryLookupTelemetry {
  candidateCount: number;
  gatedCount: number;
  hitRate: number;
  averageCandidates: number;
  gateDistribution: {
    mean: number;
    min: number;
    max: number;
  };
  tokenSavingsEstimate: number;
}

export interface MemoryLookupResponse {
  gated: Array<EngramRecord & { gateScore: number }>
  injectionBundle: string;
  telemetry: MemoryLookupTelemetry;
}

export interface MaestroMemoryToolOptions {
  canonicalizer?: Canonicalizer;
  hasher?: NgramHasher;
  store: EngramStore;
  gate?: MemoryGate;
}

function estimateTokenSavings(payloads: EngramRecord[]): number {
  return payloads.reduce((total, record) => {
    const payload = record.payload;
    if (payload.kind === 'text') {
      return total + Math.ceil(payload.value.length / 4);
    }
    return total + Math.ceil(JSON.stringify(payload.value).length / 4);
  }, 0);
}

function summarizeGateScores(scores: number[]): MemoryLookupTelemetry['gateDistribution'] {
  if (scores.length === 0) {
    return { mean: 0, min: 0, max: 0 };
  }
  const total = scores.reduce((sum, value) => sum + value, 0);
  return {
    mean: total / scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
  };
}

export class MaestroMemoryTool {
  private readonly canonicalizer: Canonicalizer;
  private readonly hasher: NgramHasher;
  private readonly store: EngramStore;
  private readonly gate: MemoryGate;

  constructor(options: MaestroMemoryToolOptions) {
    this.canonicalizer = options.canonicalizer ?? new Canonicalizer();
    this.hasher = options.hasher ?? new NgramHasher({ canonicalizer: this.canonicalizer });
    this.store = options.store;
    this.gate = options.gate ?? new MemoryGate({ canonicalizer: this.canonicalizer });
  }

  async lookup(request: MemoryLookupRequest): Promise<MemoryLookupResponse> {
    const hashResult = this.hasher.hashText(request.query);
    const candidates = await this.store.getMany(hashResult.headHashes, {
      limit: request.limit,
      tenantId: request.tenantId,
    });

    const gating = this.gate.evaluate(request.query, request.phase, candidates);
    const gated = gating.gated
      .map((record) => ({ ...record, gateScore: record.gate.score }))
      .sort((a, b) => b.gateScore - a.gateScore);

    const injectionBundle = gated
      .map((record) =>
        record.payload.kind === 'text'
          ? record.payload.value
          : JSON.stringify(record.payload.value),
      )
      .join('\n---\n');

    const gateScores = gated.map((record) => record.gateScore);

    return {
      gated,
      injectionBundle,
      telemetry: {
        candidateCount: candidates.length,
        gatedCount: gated.length,
        hitRate: candidates.length === 0 ? 0 : gated.length / candidates.length,
        averageCandidates: candidates.length,
        gateDistribution: summarizeGateScores(gateScores),
        tokenSavingsEstimate: estimateTokenSavings(gated),
      },
    };
  }
}
