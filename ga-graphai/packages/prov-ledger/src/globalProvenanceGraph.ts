import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export type ArtifactKind =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'model'
  | 'post';

export interface ArtifactInput {
  id?: string;
  uri: string;
  content: unknown;
  kind: ArtifactKind;
  platform?: string;
  contributors?: string[];
  timestamp?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface ArtifactFingerprint {
  cryptographic: string;
  crossModal: string;
  canonical: string;
  salientFeatures: Record<string, number>;
  bytes: number;
}

export interface TransformationEdge {
  id: string;
  type: 'derivation' | 'amplification' | 'annotation';
  sourceId: string;
  targetId: string;
  label: string;
  similarity: number;
  confidence: number;
  evidence: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AmplificationRecord {
  platform: string;
  audience: string;
  reach: number;
  timestamp: string;
  narrative?: string;
  tactic?: string;
}

export interface ArtifactRecord {
  id: string;
  uri: string;
  kind: ArtifactKind;
  fingerprint: ArtifactFingerprint;
  createdAt: string;
  platform?: string;
  contributors: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  lineageHash: string;
}

export interface BenchmarkDatasetEntry {
  id: string;
  content: unknown;
  kind: ArtifactKind;
  label?: string;
}

export interface BenchmarkSummary {
  scheme: string;
  averageLatencyMs: number;
  throughputPerSecond: number;
  styleScore: number;
}

export interface BenchmarkResult {
  datasetSize: number;
  summaries: BenchmarkSummary[];
}

export interface AttackScenario {
  id: string;
  sourceArtifactId: string;
  manipulatedContent: unknown;
  description: string;
  expectedOutcome: 'detected' | 'missed';
}

export interface AttackSimulationResult {
  scenarioId: string;
  detected: boolean;
  similarity: number;
  rationale: string;
}

export type ReportAudience =
  | 'osint'
  | 'journalism'
  | 'legal'
  | 'moderation'
  | 'counter-ai';

export interface ReportQuery {
  targetId?: string;
  includeAmplification?: boolean;
  depth?: number;
}

interface GraphNode {
  record: ArtifactRecord;
  incoming: TransformationEdge[];
  outgoing: TransformationEdge[];
  amplification: AmplificationRecord[];
}

const SIMHASH_BITS = 128;

function canonicaliseContent(kind: ArtifactKind, content: unknown): string {
  if (content === null || content === undefined) {
    return '';
  }

  if (typeof content === 'string') {
    return canonicaliseText(content);
  }

  if (Buffer.isBuffer(content)) {
    return content.toString('base64');
  }

  if (Array.isArray(content)) {
    return JSON.stringify(content.map(value => canonicaliseContent(kind, value)));
  }

  if (typeof content === 'object') {
    const sorted = Object.entries(content as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, canonicaliseContent(kind, value)]);
    return JSON.stringify(sorted);
  }

  return String(content);
}

function canonicaliseText(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function tokenise(value: string): string[] {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.slice(0, 64));
}

function hashSha3(data: string): string {
  return createHash('sha3-512').update(data).digest('hex');
}

function hashSha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function simHash(tokens: string[]): string {
  const weights = new Array<number>(SIMHASH_BITS).fill(0);
  for (const token of tokens) {
    const hash = hashSha256(token);
    for (let i = 0; i < SIMHASH_BITS; i += 1) {
      const bit = (parseInt(hash.slice(Math.floor(i / 4), Math.floor(i / 4) + 1), 16) >> (3 - (i % 4))) & 1;
      weights[i] += bit === 1 ? 1 : -1;
    }
  }

  return weights
    .map(weight => (weight >= 0 ? '1' : '0'))
    .join('');
}

function hammingDistance(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  let distance = 0;
  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) {
      distance += 1;
    }
  }
  return distance;
}

function calculateSimilarity(a: ArtifactFingerprint, b: ArtifactFingerprint): number {
  if (a.crossModal === b.crossModal) {
    return 1;
  }
  const distance = hammingDistance(a.crossModal, b.crossModal);
  return 1 - distance / SIMHASH_BITS;
}

class FingerprintEngine {
  create(kind: ArtifactKind, content: unknown): ArtifactFingerprint {
    const canonical = canonicaliseContent(kind, content);
    const tokens = tokenise(canonical);
    const salientFeatures: Record<string, number> = {};
    for (const token of tokens) {
      salientFeatures[token] = (salientFeatures[token] ?? 0) + 1;
    }

    const bytes = Buffer.byteLength(canonical, 'utf8');
    return {
      canonical,
      cryptographic: hashSha3(canonical),
      crossModal: simHash(tokens),
      salientFeatures,
      bytes,
    };
  }
}

function buildLineageHash(record: {
  id: string;
  fingerprint: ArtifactFingerprint;
  contributors: string[];
  tags: string[];
  timestamp: string;
  sources: string[];
}): string {
  const payload = JSON.stringify({
    id: record.id,
    fingerprint: record.fingerprint.crossModal,
    contributors: [...record.contributors].sort(),
    tags: [...record.tags].sort(),
    timestamp: record.timestamp,
    sources: [...record.sources].sort(),
  });
  return hashSha3(payload);
}

function nowIso(): string {
  return new Date().toISOString();
}

export class GlobalProvenanceGraph {
  private readonly nodes = new Map<string, GraphNode>();

  private readonly fingerprintIndex = new Map<string, Set<string>>();

  private readonly fingerprintEngine = new FingerprintEngine();

  ingestArtifact(input: ArtifactInput, options?: {
    sourceIds?: string[];
    transformation?: string;
    description?: string;
    evidence?: string[];
    confidence?: number;
  }): ArtifactRecord {
    const id = input.id ?? randomUUID();
    const fingerprint = this.fingerprintEngine.create(input.kind, input.content);
    const createdAt = input.timestamp ?? nowIso();
    const record: ArtifactRecord = {
      id,
      uri: input.uri,
      kind: input.kind,
      fingerprint,
      createdAt,
      platform: input.platform,
      contributors: input.contributors ?? [],
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      lineageHash: '',
    };

    const sources = options?.sourceIds ?? [];
    record.lineageHash = buildLineageHash({
      id,
      fingerprint,
      contributors: record.contributors,
      tags: record.tags,
      timestamp: createdAt,
      sources,
    });

    const node: GraphNode = {
      record,
      incoming: [],
      outgoing: [],
      amplification: [],
    };

    this.nodes.set(id, node);
    const existing = this.fingerprintIndex.get(fingerprint.crossModal) ?? new Set<string>();
    existing.add(id);
    this.fingerprintIndex.set(fingerprint.crossModal, existing);

    if (sources.length > 0) {
      for (const sourceId of sources) {
        this.linkTransformation({
          sourceId,
          targetId: id,
          type: 'derivation',
          label: options?.transformation ?? 'derivation',
          evidence: options?.evidence ?? [],
          confidence: options?.confidence ?? this.estimateConfidence(sourceId, id),
          description: options?.description,
        });
      }
    }

    return record;
  }

  linkTransformation(edge: {
    sourceId: string;
    targetId: string;
    type: TransformationEdge['type'];
    label: string;
    evidence?: string[];
    confidence?: number;
    metadata?: Record<string, unknown>;
    description?: string;
  }): TransformationEdge {
    const source = this.nodes.get(edge.sourceId);
    const target = this.nodes.get(edge.targetId);
    if (!source || !target) {
      throw new Error('Unknown source or target for transformation edge');
    }

    const similarity = calculateSimilarity(source.record.fingerprint, target.record.fingerprint);
    const confidence = edge.confidence ?? similarity;

    const transformation: TransformationEdge = {
      id: randomUUID(),
      type: edge.type,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      label: edge.label,
      similarity,
      confidence,
      evidence: edge.evidence ?? [],
      metadata: edge.metadata,
      createdAt: nowIso(),
    };

    if (edge.description) {
      transformation.metadata = {
        ...(transformation.metadata ?? {}),
        description: edge.description,
      };
    }

    source.outgoing.push(transformation);
    target.incoming.push(transformation);
    return transformation;
  }

  recordAmplification(artifactId: string, amplification: AmplificationRecord): void {
    const node = this.nodes.get(artifactId);
    if (!node) {
      throw new Error(`Unknown artifact ${artifactId}`);
    }
    node.amplification.push(amplification);
  }

  getArtifact(id: string): ArtifactRecord | undefined {
    return this.nodes.get(id)?.record;
  }

  findByCrossModal(crossModal: string): ArtifactRecord | undefined {
    const ids = this.fingerprintIndex.get(crossModal);
    const firstId = ids ? ids.values().next().value : undefined;
    return firstId ? this.getArtifact(firstId) : undefined;
  }

  traceLineage(targetId: string, depth = 5): TransformationEdge[] {
    const visited = new Set<string>();
    const trace: TransformationEdge[] = [];

    const walk = (id: string, currentDepth: number): void => {
      if (currentDepth > depth || visited.has(id)) {
        return;
      }
      visited.add(id);
      const node = this.nodes.get(id);
      if (!node) {
        return;
      }
      for (const edge of node.incoming) {
        trace.push(edge);
        walk(edge.sourceId, currentDepth + 1);
      }
    };

    walk(targetId, 0);
    return trace.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  explain(targetId: string, depth = 5): string {
    const record = this.getArtifact(targetId);
    if (!record) {
      throw new Error(`Unknown artifact ${targetId}`);
    }
    const lineage = this.traceLineage(targetId, depth);
    if (lineage.length === 0) {
      return `Artifact ${targetId} (${record.kind}) has no recorded derivations.`;
    }

    const steps = lineage
      .map(edge => {
        const source = this.getArtifact(edge.sourceId);
        const summary = source
          ? `${edge.label} from ${source.uri} (similarity ${(edge.similarity * 100).toFixed(1)}%)`
          : `${edge.label} from unknown source`;
        return `- ${summary}`;
      })
      .join('\n');

    return [
      `Artifact ${targetId} (${record.kind}) provenance:`,
      steps,
    ].join('\n');
  }

  visualize(targetId: string, depth = 4): {
    nodes: ArtifactRecord[];
    edges: TransformationEdge[];
    amplification: Record<string, AmplificationRecord[]>;
  } {
    const collectedNodes = new Map<string, ArtifactRecord>();
    const targetRecord = this.getArtifact(targetId);
    if (targetRecord) {
      collectedNodes.set(targetRecord.id, targetRecord);
    }
    const edges = this.traceLineage(targetId, depth);
    for (const edge of edges) {
      const source = this.getArtifact(edge.sourceId);
      const target = this.getArtifact(edge.targetId);
      if (source) {
        collectedNodes.set(source.id, source);
      }
      if (target) {
        collectedNodes.set(target.id, target);
      }
    }

    const amplification: Record<string, AmplificationRecord[]> = {};
    for (const id of collectedNodes.keys()) {
      const node = this.nodes.get(id);
      if (node && node.amplification.length > 0) {
        amplification[id] = [...node.amplification];
      }
    }

    return {
      nodes: [...collectedNodes.values()],
      edges,
      amplification,
    };
  }

  generateReport(audience: ReportAudience, query: ReportQuery = {}): string {
    const targetId = query.targetId;
    if (!targetId) {
      throw new Error('Report generation requires a target artifact id');
    }
    const record = this.getArtifact(targetId);
    if (!record) {
      throw new Error(`Unknown artifact ${targetId}`);
    }

    const lineage = this.traceLineage(targetId, query.depth ?? 4);
    const amplification = query.includeAmplification ? this.nodes.get(targetId)?.amplification ?? [] : [];

    const header = `Provenance dossier for ${record.uri} [${record.kind}]`;
    const lineageSummary = lineage
      .map(edge => `* ${edge.label} (confidence ${(edge.confidence * 100).toFixed(0)}%) from ${edge.sourceId}`)
      .join('\n');

    const amplificationSummary = amplification.length
      ? amplification
          .map(entry => `* ${entry.platform} | reach ${entry.reach} | ${entry.narrative ?? 'no narrative noted'}`)
          .join('\n')
      : 'No amplification records.';

    const tailored: Record<ReportAudience, string> = {
      osint: 'Focus: cross-platform diffusion, operator tradecraft, and open threat indicators.',
      journalism: 'Focus: timeline reconstruction, editorial risk, and source authentication narrative.',
      legal: 'Focus: chain-of-custody integrity, admissibility metadata, and tamper evidence.',
      moderation: 'Focus: policy violations, manipulation severity, and enforcement levers.',
      'counter-ai': 'Focus: adversarial tactic taxonomy, model exploitation, and mitigation playbooks.',
    };

    return [
      header,
      tailored[audience],
      'Lineage:',
      lineageSummary || 'No derivations recorded.',
      query.includeAmplification ? 'Amplification:' : undefined,
      query.includeAmplification ? amplificationSummary : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }

  runBenchmark(dataset: BenchmarkDatasetEntry[], iterations = 3): BenchmarkResult {
    if (dataset.length === 0) {
      throw new Error('Benchmark requires at least one artifact.');
    }

    const ourLatencies: number[] = [];
    const competitorLatencies: Record<string, number[]> = {
      'arweave-style': [],
      'cai-style': [],
    };

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (const entry of dataset) {
        const start = performance.now();
        this.fingerprintEngine.create(entry.kind, entry.content);
        const end = performance.now();
        ourLatencies.push(end - start);

        competitorLatencies['arweave-style'].push(simulateArweave(entry.content));
        competitorLatencies['cai-style'].push(simulateCai(entry.content));
      }
    }

    const datasetSize = dataset.length * iterations;
    const summaries: BenchmarkSummary[] = [
      buildSummary('Global Provenance Graph', ourLatencies, datasetSize),
      buildSummary('Arweave-style', competitorLatencies['arweave-style'], datasetSize),
      buildSummary('Content Authenticity Initiative-style', competitorLatencies['cai-style'], datasetSize),
    ];

    return {
      datasetSize,
      summaries,
    };
  }

  simulateAttackResistance(
    scenarios: AttackScenario[],
    threshold = 0.8,
  ): AttackSimulationResult[] {
    return scenarios.map(scenario => {
      const baseline = this.getArtifact(scenario.sourceArtifactId);
      if (!baseline) {
        throw new Error(`Unknown source artifact ${scenario.sourceArtifactId}`);
      }
      const manipulated = this.fingerprintEngine.create(baseline.kind, scenario.manipulatedContent);
      const similarity = calculateSimilarity(baseline.fingerprint, manipulated);
      const detected = similarity < threshold;
      const rationale = detected
        ? 'Similarity below threshold; flagged as tampering.'
        : 'Similarity within acceptable range; potential evasion.';
      return {
        scenarioId: scenario.id,
        detected,
        similarity,
        rationale,
      };
    });
  }

  analyzeAdversarialTactics(targetId: string): string[] {
    const record = this.getArtifact(targetId);
    if (!record) {
      throw new Error(`Unknown artifact ${targetId}`);
    }
    const node = this.nodes.get(targetId);
    const tactics: string[] = [];

    if (!node) {
      return tactics;
    }

    const amplification = node.amplification;
    const derivedFrom = node.incoming.filter(edge => edge.type === 'derivation');
    const lineage = this.traceLineage(targetId, 5);

    if (amplification.some(entry => entry.tactic?.includes('botnet'))) {
      tactics.push('Coordinated botnet amplification');
    }
    if (
      derivedFrom.some(edge => (edge.metadata as Record<string, unknown> | undefined)?.description?.toString().includes('translation laundering')) ||
      lineage.some(edge => (edge.metadata as Record<string, unknown> | undefined)?.description?.toString().includes('translation laundering'))
    ) {
      tactics.push('Language translation laundering');
    }
    if (record.tags.some(tag => tag.includes('deepfake'))) {
      tactics.push('Synthetic media injection');
    }
    if (tactics.length === 0) {
      tactics.push('No adversarial tradecraft detected.');
    }
    return tactics;
  }

  private estimateConfidence(sourceId: string, targetId: string): number {
    const source = this.getArtifact(sourceId);
    const target = this.getArtifact(targetId);
    if (!source || !target) {
      return 0.5;
    }
    return calculateSimilarity(source.fingerprint, target.fingerprint);
  }
}

function simulateArweave(content: unknown): number {
  const start = performance.now();
  const canonical = canonicaliseContent('post', content);
  for (let i = 0; i < 5; i += 1) {
    hashSha256(`${i}:${canonical}`);
  }
  return performance.now() - start;
}

function simulateCai(content: unknown): number {
  const start = performance.now();
  const canonical = canonicaliseContent('post', content);
  for (let i = 0; i < 3; i += 1) {
    hashSha3(`${i}:${canonical}`);
  }
  return performance.now() - start;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSummary(name: string, latencies: number[], datasetSize: number): BenchmarkSummary {
  const avg = average(latencies);
  const throughput = avg === 0 ? Number.POSITIVE_INFINITY : 1000 / avg;
  const styleScore = 1 - Math.min(1, average(latencies.map(latency => latency / 1000)));
  return {
    scheme: name,
    averageLatencyMs: Number(avg.toFixed(3)),
    throughputPerSecond: Number(throughput.toFixed(3)),
    styleScore: Number(styleScore.toFixed(3)),
  };
}

