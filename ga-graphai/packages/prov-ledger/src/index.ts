import { createHash, randomUUID } from 'node:crypto';

export interface LedgerFactInput {
  id: string;
  category: string;
  actor: string;
  action: string;
  resource: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface LedgerEntry extends LedgerFactInput {
  hash: string;
  previousHash?: string;
  timestamp: string;
}

export interface EvidencePayloadInput {
  tenant: string;
  caseId: string;
  environment: string;
  operation: string;
  request: Record<string, unknown>;
  policy: Record<string, unknown>;
  decision: Record<string, unknown>;
  model: Record<string, unknown>;
  cost: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface EvidencePayload extends EvidencePayloadInput {
  createdAt: string;
  digest: string;
}

export interface LedgerRecord extends EvidencePayload {
  id: string;
  signature: string;
}

export interface ManifestArtifact {
  path: string;
  sha256: string;
  bytes: number;
  role: 'source' | 'derived' | 'report';
}

export interface ManifestTransform {
  op: string;
  tool: string;
  inputSha256: string;
  outputSha256: string;
  parameters?: Record<string, unknown>;
  ranAt?: string;
  signer?: string;
}

export interface ManifestRedaction {
  field: string;
  reason: string;
}

export interface ManifestSignature {
  alg: string;
  keyId: string;
  sig: string;
  signedAt?: string;
  publicKey?: string;
}

export interface ExportManifest {
  version: string;
  createdAt: string;
  exportId: string;
  artifacts: ManifestArtifact[];
  transforms: ManifestTransform[];
  provenance: {
    source: string;
    url?: string;
    fetchedAt?: string;
    notes?: string;
    collection?: string;
  };
  policy: {
    redactions: ManifestRedaction[];
    selectiveDisclosure?: boolean;
    notes?: string;
  };
  signatures: ManifestSignature[];
  merkleRoot: string;
  unverifiable?: string[];
}

export interface ManifestBuildOptions {
  exportId?: string;
  artifacts: ManifestArtifact[];
  transforms?: ManifestTransform[];
  provenance: ExportManifest['provenance'];
  policy: ExportManifest['policy'];
  signatures?: ManifestSignature[];
  unverifiable?: string[];
}

export interface EvidenceBundle {
  generatedAt: string;
  headHash?: string;
  entries: LedgerEntry[];
  manifest?: ExportManifest;
  warnings?: string[];
  selectiveDisclosure?: {
    fields: string[];
    reason?: string;
  };
}

export interface ManifestVerificationResult {
  status: 'pass' | 'unverifiable' | 'tampered' | 'schema-mismatch';
  issues: string[];
  manifest: ExportManifest;
}

export type DecisionRecord = {
  taskId: string;
  budgetDeltaUSD: number;
} & Record<string, unknown>;

export interface DecisionMetadataInput {
  policyTags?: readonly string[];
  savingsUSD?: number;
  notes?: string;
}

export interface DecisionMetadata {
  readonly policyTags: readonly string[];
  readonly savingsUSD: number;
  readonly notes?: string;
}

export interface ZeroSpendEntry {
  readonly id: string;
  readonly namespace: string;
  readonly createdAt: string;
  readonly digest: string;
  readonly decision: DecisionRecord;
  readonly metadata: DecisionMetadata;
}

type EvidencePayloadLike = EvidencePayload | EvidencePayloadInput;

function normaliseTimestamp(value?: string): string {
  if (value) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function computeHash(entry: Omit<LedgerEntry, 'hash'> & { previousHash?: string }): string {
  const hash = createHash('sha256');
  hash.update(entry.id);
  hash.update(entry.category);
  hash.update(entry.actor);
  hash.update(entry.action);
  hash.update(entry.resource);
  hash.update(JSON.stringify(entry.payload));
  hash.update(entry.timestamp);
  if (entry.previousHash) {
    hash.update(entry.previousHash);
  }
  return hash.digest('hex');
}

function computeDigest(value: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(value));
  return hash.digest('hex');
}

function createSignature(tenant: string, digest: string): string {
  return `stub-signature:${tenant}:${digest.slice(0, 12)}`;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
        freezeDeep(nested);
      }
    }
  }
  return value;
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normaliseMetadata(metadata: DecisionMetadataInput): DecisionMetadata {
  const tags = Array.from(metadata.policyTags ?? []);
  const savings = Number.isFinite(metadata.savingsUSD ?? NaN)
    ? Number(metadata.savingsUSD)
    : 0;
  const base: DecisionMetadata = {
    policyTags: Object.freeze(tags),
    savingsUSD: savings
  };
  if (metadata.notes) {
    return { ...base, notes: metadata.notes };
  }
  return base;
}

function isValidSha256(candidate: string): boolean {
  return /^[a-f0-9]{64}$/i.test(candidate);
}

function computeMerkleRoot(artifacts: ExportManifest['artifacts']): string {
  if (!artifacts || artifacts.length === 0) {
    return '';
  }

  let level = artifacts
    .map(artifact => Buffer.from(artifact.sha256, 'hex'))
    .sort((left, right) => Buffer.compare(left, right)) as Buffer[];

  while (level.length > 1) {
    const nextLevel: Buffer[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      const hash = createHash('sha256');
      hash.update(left);
      hash.update(right);
      nextLevel.push(hash.digest());
    }
    level = nextLevel;
  }

  return level[0]?.toString('hex') ?? '';
}

function toEvidencePayload(input: EvidencePayloadLike): EvidencePayload {
  const base = {
    tenant: input.tenant,
    caseId: input.caseId,
    environment: input.environment,
    operation: input.operation,
    request: input.request,
    policy: input.policy,
    decision: input.decision,
    model: input.model,
    cost: input.cost,
    output: input.output
  } satisfies EvidencePayloadInput;

  const createdAt = 'createdAt' in input && input.createdAt
    ? normaliseTimestamp(input.createdAt)
    : normaliseTimestamp();
  const digest = 'digest' in input && typeof input.digest === 'string' && input.digest.length === 64
    ? input.digest
    : computeDigest(base);

  return {
    ...base,
    createdAt,
    digest
  } satisfies EvidencePayload;
}

export function buildEvidencePayload(input: EvidencePayloadInput): EvidencePayload {
  return toEvidencePayload(input);
}

export class InMemoryLedger {
  private readonly entries: LedgerRecord[] = [];

  record(payload: EvidencePayloadLike): LedgerRecord {
    const canonical = toEvidencePayload(payload);
    const id = `evidence:${canonical.caseId}:${(this.entries.length + 1).toString(36)}:${Date.now().toString(36)}`;
    const signature = createSignature(canonical.tenant, canonical.digest);
    const record: LedgerRecord = freezeDeep({
      ...canonical,
      id,
      signature
    });
    this.entries.push(record);
    return record;
  }

  get(id: string): LedgerRecord | undefined {
    return this.entries.find(entry => entry.id === id);
  }

  list(limit?: number): LedgerRecord[] {
    const data = [...this.entries];
    if (limit && limit > 0) {
      return data.slice(-limit).reverse();
    }
    return data.reverse();
  }
}

export class ProvenanceLedger {
  private readonly namespace: string;

  private readonly entries: LedgerEntry[] = [];

  private readonly decisions: ZeroSpendEntry[] = [];

  constructor(options: { namespace?: string } = {}) {
    this.namespace = options.namespace ?? 'default';
  }

  append(fact: LedgerFactInput): LedgerEntry {
    const timestamp = normaliseTimestamp(fact.timestamp);
    const previousHash = this.entries.at(-1)?.hash;

    const entry: LedgerEntry = {
      ...fact,
      timestamp,
      previousHash,
      hash: ''
    };

    entry.hash = computeHash(entry);
    this.entries.push(entry);
    return entry;
  }

  record(decision: DecisionRecord, metadata: DecisionMetadataInput = {}): ZeroSpendEntry {
    const createdAt = normaliseTimestamp();
    const digest = computeDigest(decision);
    const decisionCopy = freezeDeep(clonePlain(decision));
    const metadataCopy = freezeDeep(normaliseMetadata(metadata));
    const id = `${this.namespace}:${decision.taskId}:${(this.decisions.length + 1).toString(36)}:${Date.now().toString(36)}`;
    const entry = freezeDeep({
      id,
      namespace: this.namespace,
      createdAt,
      digest,
      decision: decisionCopy,
      metadata: metadataCopy
    });
    this.decisions.push(entry);
    return entry;
  }

  list(filter?: { category?: string; limit?: number }): LedgerEntry[] {
    let data = [...this.entries];
    if (filter?.category) {
      data = data.filter(entry => entry.category === filter.category);
    }
    if (filter?.limit && filter.limit > 0) {
      data = data.slice(-filter.limit);
    }
    return data;
  }

  findByTask(taskId: string): ZeroSpendEntry[] {
    return this.decisions.filter(entry => entry.decision.taskId === taskId);
  }

  summary(): {
    namespace: string;
    count: number;
    totalBudgetDeltaUSD: number;
    totalSavingsUSD: number;
    lastRecordedAt: string | null;
  } {
    const totalBudgetDeltaUSD = this.decisions.reduce(
      (sum, entry) => sum + Number(entry.decision.budgetDeltaUSD ?? 0),
      0
    );
    const totalSavingsUSD = this.decisions.reduce(
      (sum, entry) => sum + entry.metadata.savingsUSD,
      0
    );
    return {
      namespace: this.namespace,
      count: this.decisions.length,
      totalBudgetDeltaUSD,
      totalSavingsUSD,
      lastRecordedAt: this.decisions.at(-1)?.createdAt ?? null
    };
  }

  verify(): boolean;
  verify(entry: ZeroSpendEntry): boolean;
  verify(entry?: ZeroSpendEntry): boolean {
    if (entry) {
      const digest = computeDigest(entry.decision);
      if (digest !== entry.digest || entry.namespace !== this.namespace) {
        return false;
      }
      return this.decisions.some(candidate => candidate.id === entry.id && candidate.digest === entry.digest);
    }
    return this.entries.every((item, index) => {
      const expectedPrevious = index === 0 ? undefined : this.entries[index - 1].hash;
      if (expectedPrevious !== item.previousHash) {
        return false;
      }
      const recalculated = computeHash({ ...item });
      return recalculated === item.hash;
    });
  }

  createManifest(options: ManifestBuildOptions): ExportManifest {
    if (!options.artifacts || options.artifacts.length === 0) {
      throw new Error('At least one artifact is required to build a manifest.');
    }

    for (const artifact of options.artifacts) {
      if (!isValidSha256(artifact.sha256)) {
        throw new Error(`Artifact ${artifact.path} has an invalid sha256 digest.`);
      }
    }

    const manifest: ExportManifest = {
      version: '0.1',
      createdAt: new Date().toISOString(),
      exportId: options.exportId ?? randomUUID(),
      artifacts: options.artifacts,
      transforms: options.transforms ?? [],
      provenance: options.provenance,
      policy: options.policy,
      signatures: options.signatures ?? [],
      merkleRoot: computeMerkleRoot(options.artifacts)
    };

    const unverifiable = options.unverifiable ?? (manifest.signatures.length === 0 ? ['missing-signatures'] : []);
    if (unverifiable.length > 0) {
      manifest.unverifiable = [...new Set(unverifiable)];
    }

    return manifest;
  }

  verifyManifest(manifest: ExportManifest): ManifestVerificationResult {
    const schemaIssues: string[] = [];
    const tamperIssues: string[] = [];
    const warnings: string[] = [];

    if (!manifest.version) {
      schemaIssues.push('manifest.version is required');
    }
    if (!manifest.exportId) {
      schemaIssues.push('manifest.exportId is required');
    }
    if (!manifest.createdAt) {
      schemaIssues.push('manifest.createdAt is required');
    }

    if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
      schemaIssues.push('manifest.artifacts must contain at least one artifact');
    }

    const artifactHashes = new Set<string>();
    if (Array.isArray(manifest.artifacts)) {
      for (const artifact of manifest.artifacts) {
        if (!isValidSha256(artifact.sha256)) {
          schemaIssues.push(`artifact ${artifact.path} has invalid sha256`);
        } else if (artifactHashes.has(artifact.sha256)) {
          schemaIssues.push(`duplicate artifact digest detected for ${artifact.path}`);
        }
        artifactHashes.add(artifact.sha256);
      }
    }

    let merkleRoot = '';
    try {
      merkleRoot = computeMerkleRoot(manifest.artifacts ?? []);
    } catch (error) {
      schemaIssues.push(`failed to compute merkle root: ${(error as Error).message}`);
    }

    if (manifest.merkleRoot !== merkleRoot) {
      tamperIssues.push('manifest merkleRoot does not match recomputed value');
    }

    if (Array.isArray(manifest.transforms)) {
      for (const transform of manifest.transforms) {
        if (!isValidSha256(transform.outputSha256)) {
          schemaIssues.push(`transform ${transform.op} has invalid outputSha256`);
        } else if (!artifactHashes.has(transform.outputSha256)) {
          tamperIssues.push(`transform ${transform.op} references unknown artifact digest`);
        }
      }
    }

    if (!Array.isArray(manifest.signatures) || manifest.signatures.length === 0) {
      warnings.push('no signatures present in manifest');
    }

    if (Array.isArray(manifest.unverifiable)) {
      warnings.push(...manifest.unverifiable);
    }

    if (schemaIssues.length > 0) {
      return { status: 'schema-mismatch', issues: [...schemaIssues, ...tamperIssues, ...warnings], manifest };
    }

    if (tamperIssues.length > 0) {
      return { status: 'tampered', issues: [...tamperIssues, ...warnings], manifest };
    }

    if (warnings.length > 0) {
      return { status: 'unverifiable', issues: warnings, manifest };
    }

    return { status: 'pass', issues: [], manifest };
  }

  exportEvidence(
    filter?: { category?: string; limit?: number },
    manifestOptions?: ManifestBuildOptions
  ): EvidenceBundle {
    const entries = this.list(filter);
    const manifest = manifestOptions ? this.createManifest(manifestOptions) : undefined;
    return {
      generatedAt: new Date().toISOString(),
      headHash: entries.at(-1)?.hash,
      entries,
      manifest,
      warnings: manifest?.unverifiable
    };
  }
}
