import { createHash, randomUUID } from 'node:crypto';

export type CapsulePayload = string | Buffer | Record<string, unknown> | Array<unknown>;

export interface CapsuleMetadata {
  description?: string;
  sourceUri?: string;
  tags?: string[];
  recordCount?: number;
  [key: string]: unknown;
}

export interface DifferentialPrivacyGuarantee {
  epsilon: number;
  delta: number;
  mechanism: string;
  certifiedBy: string;
  certifiedAt: string;
  rationale?: string;
}

export interface ComplianceAttestation {
  framework: string;
  attestedBy: string;
  attestedAt: string;
  certificateUri?: string;
  notes?: string;
}

export interface DatasetCapsule {
  capsuleId: string;
  datasetName: string;
  contentHash: string;
  size: number;
  createdAt: string;
  metadata: CapsuleMetadata;
  differentialPrivacy?: DifferentialPrivacyGuarantee;
  compliance?: ComplianceAttestation;
}

export interface TransformationDetails {
  name: string;
  description?: string;
  operator?: string;
  parameters?: Record<string, unknown>;
  outputMetrics?: Record<string, unknown>;
  differentialPrivacyBudget?: number;
}

export interface CapsuleTransformation {
  transformationId: string;
  capsuleHash: string;
  transformationHash: string;
  previousHash?: string;
  recordedAt: string;
  details: TransformationDetails;
}

export interface SnapshotOptions {
  capsuleHash: string;
  transformationHashes: string[];
  trainingConfig: Record<string, unknown>;
  runtimeConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TrainingSnapshot {
  snapshotId: string;
  capsuleHash: string;
  transformationHashes: string[];
  trainingConfig: Record<string, unknown>;
  runtimeConfig?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  integrityHash: string;
  previousSnapshotHash?: string;
}

export interface ModelRegistryLink {
  modelId: string;
  snapshotId: string;
  capsuleHash: string;
  linkedAt: string;
  metadata: Record<string, unknown>;
}

export interface LineageGraphNode {
  id: string;
  type: 'capsule' | 'transformation' | 'snapshot' | 'model';
  label: string;
  metadata: Record<string, unknown>;
}

export interface LineageGraphEdge {
  from: string;
  to: string;
  type: 'version' | 'transformation' | 'snapshot' | 'model-link';
}

export interface LineageGraph {
  generatedAt: string;
  focus?: string;
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const normalised: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      normalised[key] = canonicalize(val);
    }
    return normalised;
  }
  return value;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function toBuffer(payload: CapsulePayload): Buffer {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }
  if (typeof payload === 'string') {
    return Buffer.from(payload, 'utf8');
  }
  return Buffer.from(canonicalStringify(payload), 'utf8');
}

function createDigest(parts: Array<string | Buffer>): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest('hex');
}

function ensureIsoDate(value?: string): string {
  if (value) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

export class CapsuleStorageEngine {
  private readonly capsules = new Map<string, DatasetCapsule>();
  private readonly payloads = new Map<string, Buffer>();
  private readonly datasetVersions = new Map<string, string[]>();

  storeDataset(
    datasetName: string,
    payload: CapsulePayload,
    options: {
      metadata?: CapsuleMetadata;
      differentialPrivacy?: DifferentialPrivacyGuarantee;
      compliance?: ComplianceAttestation;
      recordedAt?: string;
    } = {}
  ): DatasetCapsule {
    const buffer = toBuffer(payload);
    const contentHash = createDigest([buffer]);
    const createdAt = ensureIsoDate(options.recordedAt);
    const capsule: DatasetCapsule = {
      capsuleId: contentHash,
      datasetName,
      contentHash,
      size: buffer.byteLength,
      createdAt,
      metadata: { ...(options.metadata ?? {}) },
      differentialPrivacy: options.differentialPrivacy,
      compliance: options.compliance
    };

    this.capsules.set(contentHash, capsule);
    if (!this.payloads.has(contentHash)) {
      this.payloads.set(contentHash, Buffer.from(buffer));
    }

    const versions = this.datasetVersions.get(datasetName) ?? [];
    if (versions.at(-1) !== contentHash) {
      versions.push(contentHash);
    }
    this.datasetVersions.set(datasetName, versions);

    return capsule;
  }

  getCapsule(contentHash: string): DatasetCapsule | undefined {
    const capsule = this.capsules.get(contentHash);
    if (!capsule) {
      return undefined;
    }
    return { ...capsule, metadata: { ...capsule.metadata } };
  }

  getPayload(contentHash: string): Buffer | undefined {
    const payload = this.payloads.get(contentHash);
    return payload ? Buffer.from(payload) : undefined;
  }

  listVersions(datasetName: string): DatasetCapsule[] {
    const hashes = this.datasetVersions.get(datasetName) ?? [];
    return hashes
      .map(hash => this.getCapsule(hash))
      .filter((capsule): capsule is DatasetCapsule => Boolean(capsule));
  }

  verifyCapsuleIntegrity(contentHash: string): boolean {
    const payload = this.payloads.get(contentHash);
    if (!payload) {
      return false;
    }
    const recalculated = createDigest([payload]);
    return recalculated === contentHash;
  }

  verifyAgainstPayload(contentHash: string, payload: CapsulePayload): boolean {
    const buffer = toBuffer(payload);
    const recalculated = createDigest([buffer]);
    return recalculated === contentHash;
  }
}

export class CapsuleVersioningAPI {
  private readonly storage: CapsuleStorageEngine;
  private readonly transformations = new Map<string, CapsuleTransformation>();
  private readonly transformationsByCapsule = new Map<string, string[]>();
  private readonly snapshots = new Map<string, TrainingSnapshot>();
  private readonly snapshotsByCapsule = new Map<string, string[]>();
  private readonly modelLinks = new Map<string, ModelRegistryLink[]>();

  constructor(storage?: CapsuleStorageEngine) {
    this.storage = storage ?? new CapsuleStorageEngine();
  }

  getStorage(): CapsuleStorageEngine {
    return this.storage;
  }

  versionDataset(
    datasetName: string,
    payload: CapsulePayload,
    options?: {
      metadata?: CapsuleMetadata;
      differentialPrivacy?: DifferentialPrivacyGuarantee;
      compliance?: ComplianceAttestation;
      recordedAt?: string;
    }
  ): DatasetCapsule {
    return this.storage.storeDataset(datasetName, payload, options);
  }

  recordTransformation(capsuleHash: string, details: TransformationDetails, recordedAt?: string): CapsuleTransformation {
    if (!this.storage.getCapsule(capsuleHash)) {
      throw new Error(`Unknown capsule hash: ${capsuleHash}`);
    }

    const ledger = this.transformationsByCapsule.get(capsuleHash) ?? [];
    const previousHash = ledger.at(-1);
    const timestamp = ensureIsoDate(recordedAt);
    const transformationId = randomUUID();
    const transformationHash = createDigest([
      capsuleHash,
      previousHash ?? '',
      timestamp,
      canonicalStringify(details)
    ]);

    const record: CapsuleTransformation = {
      transformationId,
      capsuleHash,
      transformationHash,
      previousHash,
      recordedAt: timestamp,
      details: { ...details, parameters: { ...(details.parameters ?? {}) }, outputMetrics: { ...(details.outputMetrics ?? {}) } }
    };

    this.transformations.set(transformationHash, record);
    ledger.push(transformationHash);
    this.transformationsByCapsule.set(capsuleHash, ledger);

    return record;
  }

  listTransformations(capsuleHash: string): CapsuleTransformation[] {
    const hashes = this.transformationsByCapsule.get(capsuleHash) ?? [];
    return hashes
      .map(hash => this.transformations.get(hash))
      .filter((entry): entry is CapsuleTransformation => Boolean(entry));
  }

  verifyTransformationChain(capsuleHash: string): boolean {
    const entries = this.listTransformations(capsuleHash);
    let previous: string | undefined;
    for (const entry of entries) {
      if (entry.previousHash !== previous) {
        return false;
      }
      const expected = createDigest([
        entry.capsuleHash,
        entry.previousHash ?? '',
        entry.recordedAt,
        canonicalStringify(entry.details)
      ]);
      if (expected !== entry.transformationHash) {
        return false;
      }
      previous = entry.transformationHash;
    }
    return true;
  }

  createSnapshot(options: SnapshotOptions): TrainingSnapshot {
    const capsule = this.storage.getCapsule(options.capsuleHash);
    if (!capsule) {
      throw new Error(`Unknown capsule hash: ${options.capsuleHash}`);
    }

    const orderedTransformations = options.transformationHashes.map(hash => {
      const record = this.transformations.get(hash);
      if (!record) {
        throw new Error(`Unknown transformation hash: ${hash}`);
      }
      if (record.capsuleHash !== options.capsuleHash) {
        throw new Error(`Transformation ${hash} does not belong to capsule ${options.capsuleHash}`);
      }
      return record.transformationHash;
    });

    const canonicalPayload = canonicalStringify({
      capsuleHash: options.capsuleHash,
      transformationHashes: orderedTransformations,
      trainingConfig: options.trainingConfig,
      runtimeConfig: options.runtimeConfig ?? {},
      metadata: options.metadata ?? {}
    });
    const integrityHash = createDigest([canonicalPayload]);
    const previousSnapshotHash = this.snapshotsByCapsule.get(options.capsuleHash)?.at(-1);
    const snapshot: TrainingSnapshot = {
      snapshotId: integrityHash,
      capsuleHash: options.capsuleHash,
      transformationHashes: orderedTransformations,
      trainingConfig: { ...canonicalize(options.trainingConfig) } as Record<string, unknown>,
      runtimeConfig: options.runtimeConfig ? ({ ...canonicalize(options.runtimeConfig) } as Record<string, unknown>) : undefined,
      metadata: { ...(options.metadata ?? {}) },
      createdAt: new Date().toISOString(),
      integrityHash,
      previousSnapshotHash
    };

    this.snapshots.set(snapshot.snapshotId, snapshot);
    const snapshots = this.snapshotsByCapsule.get(options.capsuleHash) ?? [];
    snapshots.push(snapshot.snapshotId);
    this.snapshotsByCapsule.set(options.capsuleHash, snapshots);

    return snapshot;
  }

  listSnapshots(capsuleHash?: string): TrainingSnapshot[] {
    if (!capsuleHash) {
      return Array.from(this.snapshots.values()).map(snapshot => ({
        ...snapshot,
        trainingConfig: { ...snapshot.trainingConfig },
        runtimeConfig: snapshot.runtimeConfig ? { ...snapshot.runtimeConfig } : undefined,
        metadata: { ...snapshot.metadata }
      }));
    }
    const hashes = this.snapshotsByCapsule.get(capsuleHash) ?? [];
    return hashes
      .map(hash => this.snapshots.get(hash))
      .filter((snapshot): snapshot is TrainingSnapshot => Boolean(snapshot))
      .map(snapshot => ({
        ...snapshot,
        trainingConfig: { ...snapshot.trainingConfig },
        runtimeConfig: snapshot.runtimeConfig ? { ...snapshot.runtimeConfig } : undefined,
        metadata: { ...snapshot.metadata }
      }));
  }

  linkModelToSnapshot(modelId: string, snapshotId: string, metadata: Record<string, unknown> = {}): ModelRegistryLink {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Unknown snapshot id: ${snapshotId}`);
    }
    const link: ModelRegistryLink = {
      modelId,
      snapshotId,
      capsuleHash: snapshot.capsuleHash,
      linkedAt: new Date().toISOString(),
      metadata: { ...metadata }
    };

    const existing = this.modelLinks.get(modelId) ?? [];
    existing.push(link);
    this.modelLinks.set(modelId, existing);
    return link;
  }

  listModelLinks(modelId?: string): ModelRegistryLink[] {
    if (modelId) {
      return (this.modelLinks.get(modelId) ?? []).map(link => ({ ...link, metadata: { ...link.metadata } }));
    }
    const all: ModelRegistryLink[] = [];
    for (const links of this.modelLinks.values()) {
      for (const link of links) {
        all.push({ ...link, metadata: { ...link.metadata } });
      }
    }
    return all;
  }
}

export class LineageGraphGenerator {
  constructor(private readonly versioning: CapsuleVersioningAPI) {}

  generate(options: { capsuleHash?: string; modelId?: string }): LineageGraph {
    if (!options.capsuleHash && !options.modelId) {
      throw new Error('Lineage generation requires a capsule hash or model id.');
    }

    const nodes = new Map<string, LineageGraphNode>();
    const edges: LineageGraphEdge[] = [];

    const addNode = (node: LineageGraphNode) => {
      if (!nodes.has(node.id)) {
        nodes.set(node.id, { ...node, metadata: { ...node.metadata } });
      }
    };

    const addEdge = (edge: LineageGraphEdge) => {
      if (!edges.find(existing => existing.from === edge.from && existing.to === edge.to && existing.type === edge.type)) {
        edges.push(edge);
      }
    };

    const storage = this.versioning.getStorage();
    const visitedCapsules = new Set<string>();

    const visitCapsule = (capsuleHash: string) => {
      if (visitedCapsules.has(capsuleHash)) {
        return;
      }
      const capsule = storage.getCapsule(capsuleHash);
      if (!capsule) {
        return;
      }
      visitedCapsules.add(capsuleHash);
      const capsuleNodeId = `capsule:${capsuleHash}`;
      addNode({
        id: capsuleNodeId,
        type: 'capsule',
        label: `${capsule.datasetName}@${capsuleHash.slice(0, 8)}`,
        metadata: {
          datasetName: capsule.datasetName,
          createdAt: capsule.createdAt,
          metadata: { ...capsule.metadata },
          differentialPrivacy: capsule.differentialPrivacy,
          compliance: capsule.compliance
        }
      });

      const transformations = this.versioning.listTransformations(capsuleHash);
      let previousNodeId: string = capsuleNodeId;
      for (const transformation of transformations) {
        const transformationNodeId = `transformation:${transformation.transformationHash}`;
        addNode({
          id: transformationNodeId,
          type: 'transformation',
          label: transformation.details.name,
          metadata: {
            recordedAt: transformation.recordedAt,
            details: transformation.details
          }
        });
        addEdge({ from: previousNodeId, to: transformationNodeId, type: 'transformation' });
        previousNodeId = transformationNodeId;
      }

      const snapshots = this.versioning.listSnapshots(capsuleHash);
      for (const snapshot of snapshots) {
        const snapshotNodeId = `snapshot:${snapshot.snapshotId}`;
        addNode({
          id: snapshotNodeId,
          type: 'snapshot',
          label: `snapshot@${snapshot.snapshotId.slice(0, 8)}`,
          metadata: {
            createdAt: snapshot.createdAt,
            trainingConfig: snapshot.trainingConfig,
            runtimeConfig: snapshot.runtimeConfig,
            metadata: snapshot.metadata,
            previousSnapshotHash: snapshot.previousSnapshotHash
          }
        });
        addEdge({ from: previousNodeId, to: snapshotNodeId, type: 'snapshot' });

        const modelLinks = this.versioning
          .listModelLinks()
          .filter(link => link.snapshotId === snapshot.snapshotId);
        for (const link of modelLinks) {
          const modelNodeId = `model:${link.modelId}`;
          addNode({
            id: modelNodeId,
            type: 'model',
            label: link.modelId,
            metadata: {
              linkedAt: link.linkedAt,
              metadata: link.metadata
            }
          });
          addEdge({ from: snapshotNodeId, to: modelNodeId, type: 'model-link' });
        }
      }
    };

    if (options.capsuleHash) {
      visitCapsule(options.capsuleHash);
    }

    if (options.modelId) {
      const links = this.versioning.listModelLinks(options.modelId);
      for (const link of links) {
        visitCapsule(link.capsuleHash);
        const snapshotNodeId = `snapshot:${link.snapshotId}`;
        const modelNodeId = `model:${link.modelId}`;
        addNode({
          id: modelNodeId,
          type: 'model',
          label: link.modelId,
          metadata: {
            linkedAt: link.linkedAt,
            metadata: link.metadata
          }
        });
        addEdge({ from: snapshotNodeId, to: modelNodeId, type: 'model-link' });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      focus: options.capsuleHash ?? options.modelId,
      nodes: Array.from(nodes.values()),
      edges
    };
  }
}
