import { createHash, createHmac, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { 
  EvidenceBundle, 
  LedgerEntry, 
  LedgerFactInput,
  BudgetResult,
  CursorEvent,
  PolicyDecision,
  ProvenanceRecord as CursorProvenanceRecord,
  RateLimitResult,
  LedgerContext,
  LedgerRecord,
  WorkflowDefinition,
  WorkflowRunRecord,
  PolicyMetadata,
  PolicyTag,
  ProvenanceRecord as CoopProvenanceRecord,
  ProvenanceClaimRecord,
  ProvenanceClaimEvidence,
  ProvenanceClaimEvidenceItem,
  ProvenanceClaimContext,
  ProvenanceTransformMetadata,
  ProvenanceLayer,
  ExportManifest,
  ClaimResyncBundle,
  ExportArtifactDescriptor,
  ExportSignature
} from 'common-types';
import {
  buildLedgerUri,
  collectEvidencePointers,
  normalizeWorkflow,
} from 'common-types';

// ============================================================================
// SIMPLE PROVENANCE LEDGER - From HEAD
// ============================================================================

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

export class SimpleProvenanceLedger {
  private readonly entries: LedgerEntry[] = [];

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

  verify(): boolean {
    return this.entries.every((entry, index) => {
      const expectedPrevious = index === 0 ? undefined : this.entries[index - 1].hash;
      if (expectedPrevious !== entry.previousHash) {
        return false;
      }
      const recalculated = computeHash({ ...entry });
      return recalculated === entry.hash;
    });
  }

  exportEvidence(filter?: { category?: string; limit?: number }): EvidenceBundle {
    const entries = this.list(filter);
    return {
      generatedAt: new Date().toISOString(),
      headHash: entries.at(-1)?.hash,
      entries
    };
  }
}

// ============================================================================
// CURSOR PROVENANCE LEDGER - Added from PR 1299
// ============================================================================

export interface LedgerOptions {
  retentionMs?: number;
  now?: () => Date;
}

export interface AppendOptions {
  decision: PolicyDecision;
  budget?: BudgetResult;
  rateLimit?: RateLimitResult;
  receivedAt?: Date;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_MS = 365 * DAY_IN_MS;

export class ProvenanceLedger {
  private readonly now: () => Date;
  private readonly retentionMs: number | null;
  private readonly records: CursorProvenanceRecord[] = [];
  private readonly bySession = new Map<string, CursorProvenanceRecord[]>();
  private readonly byRepo = new Map<string, CursorProvenanceRecord[]>();

  constructor(options: LedgerOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  }

  async append(event: CursorEvent, options: AppendOptions): Promise<CursorProvenanceRecord> {
    this.prune();

    const receivedAt = (options.receivedAt ?? this.now()).toISOString();
    const checksum = this.computeChecksum(event, options.decision, receivedAt);

    const record: CursorProvenanceRecord = {
      ...event,
      policy: options.decision,
      receivedAt,
      checksum,
      budget: options.budget,
      rateLimit: options.rateLimit,
    };

    this.records.push(record);
    this.index(record);

    return record;
  }

  list(limit = 200): CursorProvenanceRecord[] {
    if (limit >= this.records.length) {
      return [...this.records];
    }

    return this.records.slice(this.records.length - limit);
  }

  findBySession(sessionId: string): CursorProvenanceRecord[] {
    return this.bySession.get(sessionId) ?? [];
  }

  findByRepo(repo: string): CursorProvenanceRecord[] {
    return this.byRepo.get(repo) ?? [];
  }

  findByRequest(requestId: string): CursorProvenanceRecord | undefined {
    return this.records.find((record) => record.provenance.requestId === requestId);
  }

  stats(): {
    totalRecords: number;
    uniqueSessions: number;
    uniqueRepos: number;
    lastDecisionAt?: string;
  } {
    return {
      totalRecords: this.records.length,
      uniqueSessions: this.bySession.size,
      uniqueRepos: this.byRepo.size,
      lastDecisionAt: this.records.at(-1)?.receivedAt,
    };
  }

  coverageForDiffHashes(
    repo: string,
    diffHashes: string[]
  ): { coverage: number; missing: string[] } {
    const records = this.findByRepo(repo);
    if (diffHashes.length === 0) {
      return { coverage: 1, missing: [] };
    }

    const seen = new Set<string>();
    for (const record of records) {
      const hash = record.outputRef?.diffSha256;
      if (hash) {
        seen.add(hash);
      }
    }

    const missing: string[] = [];
    for (const hash of diffHashes) {
      if (!seen.has(hash)) {
        missing.push(hash);
      }
    }

    const coverage = 1 - missing.length / diffHashes.length;

    return { coverage, missing };
  }

  prune(): void {
    if (this.retentionMs === null) {
      return;
    }

    const threshold = this.now().getTime() - this.retentionMs;
    if (threshold <= 0) {
      return;
    }

    while (this.records.length > 0) {
      const record = this.records[0];
      const ts = Date.parse(record.receivedAt);
      if (Number.isNaN(ts) || ts >= threshold) {
        break;
      }

      this.records.shift();
      this.removeFromIndex(record);
    }
  }

  private computeChecksum(
    event: CursorEvent,
    decision: PolicyDecision,
    receivedAt: string
  ): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify({ event, decision, receivedAt }));
    return hash.digest("hex");
  }

  private index(record: CursorProvenanceRecord): void {
    const sessionId = record.provenance.sessionId;
    if (!this.bySession.has(sessionId)) {
      this.bySession.set(sessionId, []);
    }
    this.bySession.get(sessionId)?.push(record);

    const repo = record.repo;
    if (!this.byRepo.has(repo)) {
      this.byRepo.set(repo, []);
    }
    this.byRepo.get(repo)?.push(record);
  }

  private removeFromIndex(record: CursorProvenanceRecord): void {
    const sessionId = record.provenance.sessionId;
    const sessionRecords = this.bySession.get(sessionId);
    if (sessionRecords) {
      const idx = sessionRecords.indexOf(record);
      if (idx >= 0) {
        sessionRecords.splice(idx, 1);
      }
      if (sessionRecords.length === 0) {
        this.bySession.delete(sessionId);
      }
    }

    const repo = record.repo;
    const repoRecords = this.byRepo.get(repo);
    if (repoRecords) {
      const idx = repoRecords.indexOf(record);
      if (idx >= 0) {
        repoRecords.splice(idx, 1);
      }
      if (repoRecords.length === 0) {
        this.byRepo.delete(repo);
      }
    }
  }
}

// ============================================================================
// WORKFLOW LEDGER RECORDING - From codex/create-drag-and-drop-workflow-workflow-creator
// ============================================================================

export interface RecordOptions {
  evaluationTags?: string[];
  includeNodeMetrics?: boolean;
}

export function record(
  run: WorkflowRunRecord,
  workflow: WorkflowDefinition,
  context: LedgerContext,
  options: RecordOptions = {}
): LedgerRecord {
  const normalized = normalizeWorkflow(workflow);
  const timestamp = context.timestamp ?? new Date().toISOString();
  const evidence = collectEvidencePointers(normalized.nodes);
  const inputsHash = hashObject({
    workflowId: normalized.workflowId,
    version: normalized.version,
    policy: normalized.policy,
    constraints: normalized.constraints,
    nodes: normalized.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      params: node.params,
      evidenceOutputs: node.evidenceOutputs
    })),
    edges: normalized.edges
  });

  const outputsHash = hashObject({
    runId: run.runId,
    status: run.status,
    stats: run.stats,
    nodes: options.includeNodeMetrics ? run.nodes : undefined
  });

  const signature = signPayload({
    runId: run.runId,
    workflowId: normalized.workflowId,
    version: normalized.version,
    inputsHash,
    outputsHash,
    timestamp
  }, context.signingKey);

  const ledgerUri = buildLedgerUri(context, run.runId);

  return {
    runId: run.runId,
    workflowId: normalized.workflowId,
    version: normalized.version,
    tenantId: normalized.tenantId,
    status: run.status,
    policy: normalized.policy,
    stats: run.stats,
    evidence,
    inputsHash,
    outputsHash,
    signature,
    ledgerUri,
    timestamp,
    tags: options.evaluationTags
  };
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function signPayload(payload: object, signingKey: string): string {
  return createHmac("sha256", signingKey).update(JSON.stringify(payload)).digest("hex");
}

// ============================================================================
// COOPERATION PROVENANCE LEDGER - From codex/harden-and-extend-prompt-engine-and-cooperation-fabric
// ============================================================================

export interface ProvenanceRecordInput {
  reqId: string;
  step: CoopProvenanceRecord['step'];
  input: unknown;
  output: unknown;
  modelId: string;
  ckpt: string;
  prompt: string;
  params: Record<string, unknown>;
  policy: PolicyMetadata;
  scores?: CoopProvenanceRecord['scores'];
  tags?: PolicyTag[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface SignedProvenanceRecord {
  record: CoopProvenanceRecord;
  signature: string;
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

function toIso(timestamp: Date): string {
  return timestamp.toISOString();
}

export function createProvenanceRecord(input: ProvenanceRecordInput): CoopProvenanceRecord {
  const start = input.startedAt ?? new Date();
  const end = input.completedAt ?? start;
  return {
    reqId: input.reqId,
    step: input.step,
    inputHash: hashPayload(input.input),
    outputHash: hashPayload(input.output),
    modelId: input.modelId,
    ckpt: input.ckpt,
    promptHash: hashPrompt(input.prompt),
    params: input.params,
    scores: input.scores ?? {},
    policy: input.policy,
    time: {
      start: toIso(start),
      end: toIso(end),
    },
    tags: input.tags,
  };
}

export function signRecord(record: CoopProvenanceRecord, secret: string): SignedProvenanceRecord {
  const payload = JSON.stringify(record);
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return { record, signature };
}

export function verifySignature(entry: SignedProvenanceRecord, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(entry.record))
    .digest('hex');
  return expected === entry.signature;
}

export class CoopProvenanceLedger {
  private readonly items = new Map<string, SignedProvenanceRecord[]>();
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? randomUUID();
  }

  append(input: ProvenanceRecordInput): SignedProvenanceRecord {
    const record = createProvenanceRecord(input);
    const signed = signRecord(record, this.secret);
    const collection = this.items.get(record.reqId) ?? [];
    collection.push(signed);
    this.items.set(record.reqId, collection);
    return signed;
  }

  list(reqId?: string): SignedProvenanceRecord[] {
    if (!reqId) {
      return Array.from(this.items.values()).flat();
    }
    return [...(this.items.get(reqId) ?? [])];
  }

  verifyAll(secret?: string): boolean {
    const signerSecret = secret ?? randomUUID();
    return this.list().every((entry) => verifySignature(entry, signerSecret));
  }

  getSecret(): string {
    return this.secret;
  }
}

// ===========================================================================
// CLAIM / EVIDENCE LEDGER
// ===========================================================================

export interface ClaimLedgerOptions {
  chainId?: string;
  signer?: string;
  signingKey?: string;
  storagePath?: string;
  environment?: string;
}

interface EvidenceInput {
  uri: string;
  hash?: string;
  bytes?: number;
  mediaType?: string;
  label?: string;
  annotations?: Record<string, unknown>;
  role?: ProvenanceClaimEvidenceItem['role'];
}

export interface IngestClaimOptions {
  claimId?: string;
  actor?: string;
  runId: string;
  jobId: string;
  tenantId: string;
  datasetId: string;
  source: EvidenceInput & { summary?: unknown };
  output: {
    uri?: string;
    hash?: string;
    bytes: number;
    recordCount: number;
    mediaType?: string;
  };
  metadata?: Record<string, unknown>;
  assertedAt?: string;
  environment?: string;
  references?: EvidenceInput[];
}

export interface TransformClaimOptions {
  claimId?: string;
  actor?: string;
  transformId: string;
  description?: string;
  previousClaimId: string;
  tenantId: string;
  datasetId: string;
  runId: string;
  output: {
    uri?: string;
    hash?: string;
    bytes?: number;
    recordCount?: number;
    mediaType?: string;
  };
  codeHash?: string;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  assertedAt?: string;
  environment?: string;
  references?: EvidenceInput[];
}

export interface ApiClaimOptions {
  claimId?: string;
  actor?: string;
  requestId: string;
  tenantId?: string;
  datasetId: string;
  route: string;
  method: string;
  statusCode: number;
  previousClaimId?: string;
  request?: unknown;
  response?: unknown;
  metadata?: Record<string, unknown>;
  assertedAt?: string;
  environment?: string;
}

export interface ExportManifestOptions {
  exportId: string;
  datasetId: string;
  datasetName?: string;
  description?: string;
  totalRecords: number;
  destinationUri: string;
  format: string;
  sensitivity?: string[];
  tags?: string[];
  owner?: string;
  artifacts: Array<{
    path: string;
    hash?: string;
    bytes: number;
    claimId: string;
    role?: ExportArtifactDescriptor['role'];
    mediaType?: string;
    description?: string;
  }>;
  anchors?: {
    ingest?: string;
    transform?: string;
    api?: string;
  };
}

interface ClaimDraft {
  chainId: string;
  claimId: string;
  layer: ProvenanceLayer;
  actor: string;
  assertedAt: string;
  context: ProvenanceClaimContext;
  evidence: ProvenanceClaimEvidence;
  transform?: ProvenanceTransformMetadata;
}

interface TamperEvidentStoreOptions {
  storagePath?: string;
}

class TamperEvidentStore<T extends { hash: string }> {
  private readonly storagePath?: string;
  private readonly entries: T[] = [];

  constructor(options: TamperEvidentStoreOptions = {}) {
    this.storagePath = options.storagePath;
    if (this.storagePath && existsSync(this.storagePath)) {
      try {
        const raw = JSON.parse(readFileSync(this.storagePath, 'utf-8'));
        if (Array.isArray(raw?.entries)) {
          for (const entry of raw.entries) {
            this.entries.push(entry as T);
          }
        }
      } catch (error) {
        // Ignore corrupt files; start fresh
      }
    }
  }

  append(entry: T): void {
    this.entries.push(entry);
    this.persist();
  }

  all(): T[] {
    return [...this.entries];
  }

  head(): T | undefined {
    return this.entries.at(-1);
  }

  sliceAfter(hash?: string): T[] {
    if (!hash) {
      return this.all();
    }
    const index = this.entries.findIndex((entry) => entry.hash === hash);
    if (index < 0) {
      return this.all();
    }
    return this.entries.slice(index + 1);
  }

  private persist(): void {
    if (!this.storagePath) {
      return;
    }
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(
      this.storagePath,
      JSON.stringify({ entries: this.entries }, null, 2),
      'utf-8'
    );
  }
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = canonicalizeValue(val);
    }
    return result;
  }
  return value;
}

export function canonicalHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeValue(value)))
    .digest('hex');
}

function cloneEvidenceItem(item: EvidenceInput): EvidenceInput {
  return {
    uri: item.uri,
    hash: item.hash,
    bytes: item.bytes,
    mediaType: item.mediaType,
    label: item.label,
    annotations: item.annotations ? { ...item.annotations } : undefined,
    role: item.role,
  };
}

export class ClaimLedger {
  private readonly chainId: string;
  private readonly signer: string;
  private readonly signingKey: string;
  private readonly environment?: string;
  private readonly store: TamperEvidentStore<ProvenanceClaimRecord>;
  private readonly claimsById = new Map<string, ProvenanceClaimRecord>();

  constructor(options: ClaimLedgerOptions = {}) {
    this.chainId = options.chainId ?? 'ga-core';
    this.signer = options.signer ?? 'claim-ledger';
    this.signingKey = options.signingKey ?? 'claim-ledger';
    this.environment = options.environment;
    this.store = new TamperEvidentStore<ProvenanceClaimRecord>({
      storagePath: options.storagePath,
    });
    for (const claim of this.store.all()) {
      this.claimsById.set(claim.claimId, claim);
    }
  }

  listClaims(limit?: number): ProvenanceClaimRecord[] {
    const entries = this.store.all();
    if (!limit || limit <= 0 || limit >= entries.length) {
      return entries;
    }
    return entries.slice(entries.length - limit);
  }

  getClaim(claimId: string): ProvenanceClaimRecord | undefined {
    return this.claimsById.get(claimId);
  }

  getHead(): ProvenanceClaimRecord | undefined {
    return this.store.head();
  }

  recordIngestClaim(options: IngestClaimOptions): ProvenanceClaimRecord {
    const assertedAt = options.assertedAt ?? new Date().toISOString();
    const claimId = options.claimId ?? randomUUID();
    const inputs: ProvenanceClaimEvidenceItem[] = [
      this.buildEvidenceItem({
        ...cloneEvidenceItem(options.source),
        hash:
          options.source.hash ??
          canonicalHash({
            uri: options.source.uri,
            summary: options.source.summary,
            jobId: options.jobId,
            runId: options.runId,
          }),
        label: options.source.label ?? 'source',
        role: 'input',
      }),
    ];

    const outputUri =
      options.output.uri ?? `graph://${options.datasetId}/ingest/${options.runId}`;
    const outputs: ProvenanceClaimEvidenceItem[] = [
      this.buildEvidenceItem({
        uri: outputUri,
        hash:
          options.output.hash ??
          canonicalHash({
            datasetId: options.datasetId,
            runId: options.runId,
            recordCount: options.output.recordCount,
            bytes: options.output.bytes,
          }),
        bytes: options.output.bytes,
        mediaType: options.output.mediaType ?? 'application/json',
        label: 'normalized-records',
        role: 'output',
      }),
    ];

    const references = options.references?.map((reference) =>
      this.buildEvidenceItem({
        ...cloneEvidenceItem(reference),
        role: reference.role ?? 'reference',
      })
    );

    const context: ProvenanceClaimContext = {
      tenantId: options.tenantId,
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      runId: options.runId,
      jobId: options.jobId,
      sourceUri: options.source.uri,
      ...options.metadata,
    };

    const draft: ClaimDraft = {
      chainId: this.chainId,
      claimId,
      layer: 'ingest',
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        id: 'ingest',
        description: options.metadata?.description ?? 'Source ingestion',
        parameters: {
          recordCount: options.output.recordCount,
          sourceMediaType: options.source.mediaType,
        },
      },
    };

    return this.persistClaim(draft);
  }

  recordTransformClaim(options: TransformClaimOptions): ProvenanceClaimRecord {
    const previous = this.getClaim(options.previousClaimId);
    if (!previous) {
      throw new Error(`unknown previous claim: ${options.previousClaimId}`);
    }

    const assertedAt = options.assertedAt ?? new Date().toISOString();
    const claimId = options.claimId ?? randomUUID();

    const inputs = previous.evidence.outputs.map((output) => this.buildEvidenceItem({
      uri: output.uri,
      hash: output.hash,
      bytes: output.bytes,
      mediaType: output.mediaType,
      label: output.label ?? `from:${previous.claimId}`,
      annotations: output.annotations,
      role: 'input',
    }));

    const outputUri =
      options.output.uri ??
      `graph://${options.datasetId}/transform/${options.transformId}/${options.runId}`;
    const outputs: ProvenanceClaimEvidenceItem[] = [
      this.buildEvidenceItem({
        uri: outputUri,
        hash:
          options.output.hash ??
          canonicalHash({
            datasetId: options.datasetId,
            runId: options.runId,
            transformId: options.transformId,
            recordCount: options.output.recordCount ?? previous.evidence.outputs.length,
            bytes: options.output.bytes,
          }),
        bytes: options.output.bytes ?? previous.evidence.outputs[0]?.bytes,
        mediaType: options.output.mediaType ?? 'application/json',
        label: 'transformed-records',
        role: 'output',
      }),
    ];

    const references = options.references?.map((reference) =>
      this.buildEvidenceItem({
        ...cloneEvidenceItem(reference),
        role: reference.role ?? 'reference',
      })
    );

    const context: ProvenanceClaimContext = {
      tenantId: options.tenantId,
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      runId: options.runId,
      transformId: options.transformId,
      ...options.metadata,
    };

    const draft: ClaimDraft = {
      chainId: this.chainId,
      claimId,
      layer: 'transform',
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        id: options.transformId,
        description: options.description ?? 'Data transformation',
        codeHash: options.codeHash,
        parameters: options.parameters,
      },
    };

    return this.persistClaim(draft, previous.hash);
  }

  recordApiClaim(options: ApiClaimOptions): ProvenanceClaimRecord {
    const assertedAt = options.assertedAt ?? new Date().toISOString();
    const claimId = options.claimId ?? randomUUID();

    const baseClaim = options.previousClaimId
      ? this.getClaim(options.previousClaimId)
      : this.getHead();

    const inputs = baseClaim
      ? baseClaim.evidence.outputs.map((output) =>
          this.buildEvidenceItem({
            uri: output.uri,
            hash: output.hash,
            bytes: output.bytes,
            mediaType: output.mediaType,
            label: output.label ?? `from:${baseClaim.claimId}`,
            annotations: output.annotations,
            role: 'input',
          })
        )
      : [];

    const requestEvidence = options.request
      ? [
          this.buildEvidenceItem({
            uri: `urn:request:${options.requestId}`,
            hash: canonicalHash(options.request),
            mediaType: 'application/json',
            label: 'request',
            role: 'reference',
          }),
        ]
      : [];

    const responseBody = options.response ?? { statusCode: options.statusCode };
    const responseString = JSON.stringify(canonicalizeValue(responseBody));
    const outputs: ProvenanceClaimEvidenceItem[] = [
      this.buildEvidenceItem({
        uri: `urn:response:${options.requestId}`,
        hash: canonicalHash(responseBody),
        bytes: Buffer.byteLength(responseString, 'utf-8'),
        mediaType: 'application/json',
        label: 'response',
        role: 'output',
      }),
    ];

    const references = requestEvidence.length > 0 ? requestEvidence : undefined;

    const context: ProvenanceClaimContext = {
      tenantId: options.tenantId ?? 'system',
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      requestId: options.requestId,
      sourceUri: options.route,
      ...options.metadata,
    };

    const draft: ClaimDraft = {
      chainId: this.chainId,
      claimId,
      layer: 'api',
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        description: 'API response delivery',
        parameters: {
          route: options.route,
          method: options.method,
          statusCode: options.statusCode,
        },
      },
    };

    return this.persistClaim(draft, baseClaim?.hash);
  }

  exportResyncBundle(sinceHash?: string): ClaimResyncBundle {
    const entries = this.store.sliceAfter(sinceHash);
    return {
      chainId: this.chainId,
      exportedAt: new Date().toISOString(),
      startHash: sinceHash,
      headHash: this.store.head()?.hash,
      entries,
    };
  }

  createExportManifest(options: ExportManifestOptions): ExportManifest {
    const claims = this.listClaims();
    const headHash = claims.at(-1)?.hash ?? '';
    const artifacts: ExportArtifactDescriptor[] = options.artifacts.map((artifact) => ({
      path: artifact.path,
      hash:
        artifact.hash ??
        canonicalHash({ path: artifact.path, claimId: artifact.claimId, bytes: artifact.bytes }),
      algorithm: 'sha256',
      bytes: artifact.bytes,
      claimId: artifact.claimId,
      role: artifact.role ?? 'dataset',
      mediaType: artifact.mediaType,
      description: artifact.description,
    }));

    const manifest: ExportManifest = {
      manifestVersion: '1.0.0',
      exportId: options.exportId,
      createdAt: new Date().toISOString(),
      dataset: {
        id: options.datasetId,
        name: options.datasetName,
        description: options.description,
        totalRecords: options.totalRecords,
        sensitivity: options.sensitivity,
        tags: options.tags,
        owner: options.owner,
      },
      destination: {
        uri: options.destinationUri,
        format: options.format,
      },
      claimChain: {
        chainId: this.chainId,
        head: headHash,
        claims,
      },
      ledgerAnchors: options.anchors ?? {
        ingest: claims.find((claim) => claim.layer === 'ingest')?.hash,
        transform: claims
          .filter((claim) => claim.layer === 'transform')
          .at(-1)?.hash,
        api: claims.filter((claim) => claim.layer === 'api').at(-1)?.hash,
      },
      artifacts,
      verification: {
        manifestHash: '',
        includedHashes: claims.map((claim) => claim.hash),
      },
      signatures: [],
    };

    manifest.verification.manifestHash = canonicalHash({
      manifestVersion: manifest.manifestVersion,
      exportId: manifest.exportId,
      createdAt: manifest.createdAt,
      dataset: manifest.dataset,
      destination: manifest.destination,
      claimChain: {
        chainId: manifest.claimChain.chainId,
        head: manifest.claimChain.head,
        claimHashes: manifest.claimChain.claims.map((claim) => claim.hash),
      },
      artifacts: manifest.artifacts.map((artifact) => ({
        path: artifact.path,
        hash: artifact.hash,
        bytes: artifact.bytes,
        claimId: artifact.claimId,
        role: artifact.role,
      })),
      ledgerAnchors: manifest.ledgerAnchors,
    });

    const signature: ExportSignature = {
      keyId: `${this.signer}#export`,
      signer: this.signer,
      algorithm: 'hmac-sha256',
      signedAt: manifest.createdAt,
      signature: this.sign(manifest.verification.manifestHash),
    };

    manifest.signatures.push(signature);
    return manifest;
  }

  verifyChain(): boolean {
    const entries = this.store.all();
    let previousHash: string | undefined;
    for (const entry of entries) {
      if (entry.previousHash !== previousHash) {
        return false;
      }
      const draft: ClaimDraft = {
        chainId: entry.chainId,
        claimId: entry.claimId,
        layer: entry.layer,
        actor: entry.actor,
        assertedAt: entry.assertedAt,
        context: entry.context,
        evidence: entry.evidence,
        transform: entry.transform,
      };
      const expectedHash = this.computeHash(draft, previousHash);
      if (expectedHash !== entry.hash) {
        return false;
      }
      if (this.sign(entry.hash) !== entry.signature) {
        return false;
      }
      previousHash = entry.hash;
    }
    return true;
  }

  private persistClaim(draft: ClaimDraft, previousHash?: string): ProvenanceClaimRecord {
    const hash = this.computeHash(draft, previousHash);
    const signature = this.sign(hash);
    const record: ProvenanceClaimRecord = {
      ...draft,
      previousHash,
      hash,
      signature,
    };
    this.store.append(record);
    this.claimsById.set(record.claimId, record);
    return record;
  }

  private computeHash(draft: ClaimDraft, previousHash?: string): string {
    return canonicalHash({
      chainId: draft.chainId,
      claimId: draft.claimId,
      layer: draft.layer,
      actor: draft.actor,
      assertedAt: draft.assertedAt,
      context: draft.context,
      evidence: draft.evidence,
      transform: draft.transform,
      previousHash,
    });
  }

  private buildEvidenceItem(input: EvidenceInput): ProvenanceClaimEvidenceItem {
    return {
      uri: input.uri,
      hash: input.hash ?? canonicalHash({ uri: input.uri, label: input.label }),
      algorithm: 'sha256',
      bytes: input.bytes,
      mediaType: input.mediaType,
      label: input.label,
      annotations: input.annotations,
      role: input.role ?? 'reference',
    };
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.signingKey).update(payload).digest('hex');
  }
}
