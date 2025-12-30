import { createHash } from 'node:crypto';

export interface AnalyticModelUse {
  id: string;
  version?: string;
  usage?: string;
}

export interface AnalyticGraphState {
  namespace?: string;
  version?: number;
  checksum?: string;
  snapshotAt?: string;
}

export interface AnalyticEvidenceInput {
  outputId: string;
  actor?: string;
  sources: string[];
  tools: string[];
  models: AnalyticModelUse[];
  graphState?: AnalyticGraphState;
  traceId?: string;
  producedAt?: string;
}

export interface AnalyticEvidenceEntry {
  id: string;
  kind: 'source' | 'tool' | 'model' | 'graph' | 'output';
  detail: Record<string, unknown>;
  timestamp: string;
  hash: string;
  previousHash?: string;
}

export interface AnalyticEvidenceTrail {
  summary: {
    outputId: string;
    actor?: string;
    sources: string[];
    tools: string[];
    models: AnalyticModelUse[];
    graphState?: AnalyticGraphState;
    traceId?: string;
    producedAt: string;
  };
  headHash?: string;
  entries: AnalyticEvidenceEntry[];
}

function chainHash(entry: Omit<AnalyticEvidenceEntry, 'hash'>): string {
  const hash = createHash('sha256');
  hash.update(entry.id);
  hash.update(entry.kind);
  hash.update(entry.timestamp);
  hash.update(JSON.stringify(entry.detail));
  if (entry.previousHash) {
    hash.update(entry.previousHash);
  }
  return hash.digest('hex');
}

function normalizeTimestamp(timestamp?: string): string {
  return timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
}

export function buildAnalyticEvidenceTrail(input: AnalyticEvidenceInput): AnalyticEvidenceTrail {
  const producedAt = normalizeTimestamp(input.producedAt);
  const entries: AnalyticEvidenceEntry[] = [];
  let previousHash: string | undefined;

  const pushEntry = (entry: Omit<AnalyticEvidenceEntry, 'hash'>) => {
    const hashed: AnalyticEvidenceEntry = {
      ...entry,
      hash: chainHash(entry),
    };
    entries.push(hashed);
    previousHash = hashed.hash;
  };

  for (const source of input.sources) {
    pushEntry({
      id: `source:${source}`,
      kind: 'source',
      timestamp: producedAt,
      previousHash,
      detail: { source },
    });
  }

  for (const tool of input.tools) {
    pushEntry({
      id: `tool:${tool}`,
      kind: 'tool',
      timestamp: producedAt,
      previousHash,
      detail: { tool },
    });
  }

  for (const model of input.models) {
    pushEntry({
      id: `model:${model.id}`,
      kind: 'model',
      timestamp: producedAt,
      previousHash,
      detail: model,
    });
  }

  if (input.graphState) {
    pushEntry({
      id: `graph:${input.graphState.namespace ?? 'default'}:${input.graphState.version ?? 'unknown'}`,
      kind: 'graph',
      timestamp: producedAt,
      previousHash,
      detail: input.graphState,
    });
  }

  pushEntry({
    id: input.outputId,
    kind: 'output',
    timestamp: producedAt,
    previousHash,
    detail: {
      actor: input.actor,
      traceId: input.traceId,
    },
  });

  return {
    summary: {
      outputId: input.outputId,
      actor: input.actor,
      sources: input.sources,
      tools: input.tools,
      models: input.models,
      graphState: input.graphState,
      traceId: input.traceId,
      producedAt,
    },
    headHash: entries.at(-1)?.hash,
    entries,
  };
}
