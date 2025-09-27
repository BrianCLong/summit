import {
  createHash,
  createHmac,
  randomUUID,
  createPrivateKey,
  createPublicKey,
  sign as signMessage,
  verify as verifySignature,
} from 'node:crypto';
import type { KeyObject } from 'node:crypto';
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
  ProvenanceRecord as CoopProvenanceRecord
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

// ============================================================================
// HUMAN ANNOTATION PROVENANCE LEDGER (HAPL)
// ============================================================================

export type HaplEventType = 'label' | 'payment' | 'conflict';

export interface HaplLedgerOptions {
  privateKey: KeyInput;
  publicKey: KeyInput;
  now?: () => Date;
}

export interface LabelEventInput {
  datasetId: string;
  itemId: string;
  labelerId: string;
  label: unknown;
  rubricVersion: string;
  toolVersion: string;
  rubricId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface PaymentEventInput {
  datasetId: string;
  itemId?: string;
  payerId: string;
  labelerId: string;
  amount: number;
  currency: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface ConflictEventInput {
  datasetId: string;
  itemId: string;
  raisedBy: string;
  actors: string[];
  reason: string;
  resolution?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface HaplLabelPayload {
  labelerId: string;
  label: unknown;
  rubricVersion: string;
  toolVersion: string;
  rubricId?: string;
  metadata?: Record<string, unknown>;
}

export interface HaplPaymentPayload {
  payerId: string;
  labelerId: string;
  amount: number;
  currency: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface HaplConflictPayload {
  actors: string[];
  reason: string;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

export type HaplPayload =
  | HaplLabelPayload
  | HaplPaymentPayload
  | HaplConflictPayload;

export interface HaplLedgerEntry<T extends HaplPayload = HaplPayload> {
  sequence: number;
  eventType: HaplEventType;
  datasetId: string;
  itemId?: string;
  actor: string;
  timestamp: string;
  payload: T;
  signerId: string;
  previousHash?: string;
  hash: string;
  signature: string;
}

export interface HaplLedgerExport {
  signerId?: string;
  root?: string;
  entries: HaplLedgerEntry[];
}

export interface HaplVerificationResult {
  valid: boolean;
  error?: string;
}

type KeyInput = string | Buffer | KeyObject;

interface EntrySignPayload<T extends HaplPayload> {
  sequence: number;
  eventType: HaplEventType;
  datasetId: string;
  itemId?: string;
  actor: string;
  timestamp: string;
  payload: T;
  signerId: string;
  previousHash?: string;
}

export class HaplLedger {
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private readonly now: () => Date;
  private readonly signerId: string;
  private readonly entries: HaplLedgerEntry[] = [];

  constructor(options: HaplLedgerOptions) {
    if (!options.privateKey || !options.publicKey) {
      throw new Error('HaplLedger requires both private and public keys');
    }
    this.privateKey = toPrivateKey(options.privateKey);
    this.publicKey = toPublicKey(options.publicKey);
    this.now = options.now ?? (() => new Date());
    this.signerId = fingerprintKey(this.publicKey);
  }

  appendLabel(input: LabelEventInput): HaplLedgerEntry<HaplLabelPayload> {
    const payload: HaplLabelPayload = {
      labelerId: input.labelerId,
      label: input.label,
      rubricVersion: input.rubricVersion,
      toolVersion: input.toolVersion,
      rubricId: input.rubricId,
      metadata: input.metadata && pruneEmptyObject(input.metadata),
    };

    return this.appendEntry('label', input.datasetId, input.itemId, input.labelerId, payload, input.timestamp);
  }

  appendPayment(input: PaymentEventInput): HaplLedgerEntry<HaplPaymentPayload> {
    const payload: HaplPaymentPayload = {
      payerId: input.payerId,
      labelerId: input.labelerId,
      amount: Number(input.amount),
      currency: input.currency,
      reference: input.reference,
      metadata: input.metadata && pruneEmptyObject(input.metadata),
    };

    return this.appendEntry('payment', input.datasetId, input.itemId, input.payerId, payload, input.timestamp);
  }

  appendConflict(input: ConflictEventInput): HaplLedgerEntry<HaplConflictPayload> {
    const actors = Array.from(new Set(input.actors.concat(input.raisedBy))).sort();
    const payload: HaplConflictPayload = {
      actors,
      reason: input.reason,
      resolution: input.resolution,
      metadata: input.metadata && pruneEmptyObject(input.metadata),
    };

    return this.appendEntry('conflict', input.datasetId, input.itemId, input.raisedBy, payload, input.timestamp);
  }

  verify(): HaplVerificationResult {
    return verifyHaplEntries(this.entries, this.publicKey);
  }

  getRootHash(): string | undefined {
    return this.entries.at(-1)?.hash;
  }

  getSignerId(): string {
    return this.signerId;
  }

  getEntries(): readonly HaplLedgerEntry[] {
    return this.entries.slice();
  }

  toJSON(): HaplLedgerExport {
    return {
      signerId: this.signerId,
      root: this.getRootHash(),
      entries: this.entries.map((entry) => JSON.parse(JSON.stringify(entry))),
    };
  }

  private appendEntry<T extends HaplPayload>(
    eventType: HaplEventType,
    datasetId: string,
    itemId: string | undefined,
    actor: string,
    payload: T,
    timestamp?: string,
  ): HaplLedgerEntry<T> {
    const sequence = this.entries.length;
    const isoTimestamp = ensureIsoTimestamp(timestamp, this.now);
    const previousHash = this.entries.at(-1)?.hash;
    const canonicalPayload = canonicalizePayload(payload);
    const signPayload: EntrySignPayload<typeof canonicalPayload> = {
      sequence,
      eventType,
      datasetId,
      actor,
      timestamp: isoTimestamp,
      payload: canonicalPayload,
      signerId: this.signerId,
      previousHash,
    };

    if (itemId !== undefined) {
      signPayload.itemId = itemId;
    }

    const canonicalString = canonicalStringify(signPayload);
    const hash = computeEntryHash(previousHash, canonicalString);
    const signature = signCanonical(canonicalString, this.privateKey);
    const entry: HaplLedgerEntry<typeof canonicalPayload> = {
      ...signPayload,
      hash,
      signature,
    };

    const frozen = deepFreeze(entry) as HaplLedgerEntry<T>;
    this.entries.push(frozen);
    return frozen;
  }
}

export interface DatasetOverlayLabel {
  sequence: number;
  labelerId: string;
  label: unknown;
  rubricVersion: string;
  toolVersion: string;
  rubricId?: string;
  timestamp: string;
  signerId: string;
  hash: string;
  previousHash?: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

export interface DatasetOverlayPayment {
  sequence: number;
  payerId: string;
  labelerId: string;
  amount: number;
  currency: string;
  reference?: string;
  timestamp: string;
  signerId: string;
  hash: string;
  previousHash?: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

export interface DatasetOverlayConflict {
  sequence: number;
  raisedBy: string;
  actors: string[];
  reason: string;
  resolution?: string;
  timestamp: string;
  signerId: string;
  hash: string;
  previousHash?: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

export interface DatasetOverlayItem {
  labels: DatasetOverlayLabel[];
  payments: DatasetOverlayPayment[];
  conflicts: DatasetOverlayConflict[];
}

export interface DatasetProvenanceOverlay {
  signerId?: string;
  root?: string;
  datasets: Record<string, { items: Record<string, DatasetOverlayItem> }>;
}

export function buildDatasetProvenanceOverlay(
  entries: readonly HaplLedgerEntry[],
): DatasetProvenanceOverlay {
  const overlay: DatasetProvenanceOverlay = {
    signerId: entries[0]?.signerId,
    root: entries.at(-1)?.hash,
    datasets: {},
  };

  for (const entry of entries) {
    const dataset = (overlay.datasets[entry.datasetId] ??= { items: {} });
    const itemKey = entry.itemId ?? '__dataset__';
    const item = (dataset.items[itemKey] ??= {
      labels: [],
      payments: [],
      conflicts: [],
    });

    if (entry.eventType === 'label') {
      const payload = entry.payload as HaplLabelPayload;
      item.labels.push({
        sequence: entry.sequence,
        labelerId: payload.labelerId,
        label: payload.label,
        rubricVersion: payload.rubricVersion,
        toolVersion: payload.toolVersion,
        rubricId: payload.rubricId,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata,
      });
      continue;
    }

    if (entry.eventType === 'payment') {
      const payload = entry.payload as HaplPaymentPayload;
      item.payments.push({
        sequence: entry.sequence,
        payerId: payload.payerId,
        labelerId: payload.labelerId,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata,
      });
      continue;
    }

    if (entry.eventType === 'conflict') {
      const payload = entry.payload as HaplConflictPayload;
      item.conflicts.push({
        sequence: entry.sequence,
        raisedBy: entry.actor,
        actors: payload.actors,
        reason: payload.reason,
        resolution: payload.resolution,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata,
      });
    }
  }

  return overlay;
}

export function verifyHaplEntries(
  entries: readonly HaplLedgerEntry[],
  publicKey: KeyInput,
): HaplVerificationResult {
  const key = toPublicKey(publicKey);
  const signerId = fingerprintKey(key);
  let expectedPrevious: string | undefined;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.sequence !== index) {
      return { valid: false, error: `Sequence mismatch at index ${index}` };
    }
    if (entry.signerId !== signerId) {
      return { valid: false, error: `Unexpected signer for entry ${index}` };
    }
    if ((entry.previousHash ?? undefined) !== expectedPrevious) {
      return { valid: false, error: `Hash chain broken at entry ${index}` };
    }

    const payload = payloadForSignature(entry);
    const canonicalString = canonicalStringify(payload);
    const expectedHash = computeEntryHash(expectedPrevious, canonicalString);
    if (entry.hash !== expectedHash) {
      return { valid: false, error: `Hash mismatch at entry ${index}` };
    }
    if (!verifyCanonical(canonicalString, entry.signature, key)) {
      return { valid: false, error: `Signature mismatch at entry ${index}` };
    }

    expectedPrevious = entry.hash;
  }

  return { valid: true };
}

function payloadForSignature(entry: HaplLedgerEntry): EntrySignPayload<HaplPayload> {
  const payload = canonicalizePayload(entry.payload);
  const signPayload: EntrySignPayload<HaplPayload> = {
    sequence: entry.sequence,
    eventType: entry.eventType,
    datasetId: entry.datasetId,
    actor: entry.actor,
    timestamp: entry.timestamp,
    payload,
    signerId: entry.signerId,
    previousHash: entry.previousHash,
  };

  if (entry.itemId !== undefined) {
    signPayload.itemId = entry.itemId;
  }

  return signPayload;
}

function ensureIsoTimestamp(timestamp: string | undefined, now: () => Date): string {
  if (!timestamp) {
    return now().toISOString();
  }
  return new Date(timestamp).toISOString();
}

function canonicalizePayload<T extends HaplPayload>(payload: T): T {
  return canonicalizeValue(payload) as T;
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const child = canonicalizeValue(record[key]);
      if (child !== undefined) {
        result[key] = child;
      }
    }
    return result;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Ledger payload numbers must be finite');
    }
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === undefined) {
    return undefined;
  }

  return value;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

function computeEntryHash(previousHash: string | undefined, canonical: string): string {
  const hash = createHash('sha256');
  if (previousHash) {
    hash.update(previousHash);
  }
  hash.update(canonical);
  return hash.digest('hex');
}

function signCanonical(payload: string, privateKey: KeyObject): string {
  return signMessage(null, Buffer.from(payload), privateKey).toString('base64');
}

function verifyCanonical(payload: string, signature: string, publicKey: KeyObject): boolean {
  try {
    return verifySignature(
      null,
      Buffer.from(payload),
      publicKey,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}

function toPublicKey(key: KeyInput): KeyObject {
  if (typeof key === 'string' || Buffer.isBuffer(key)) {
    return createPublicKey(key);
  }
  return key;
}

function toPrivateKey(key: KeyInput): KeyObject {
  if (typeof key === 'string' || Buffer.isBuffer(key)) {
    return createPrivateKey(key);
  }
  return key;
}

function fingerprintKey(key: KeyObject): string {
  const exported = key.export({ format: 'der', type: 'spki' });
  return createHash('sha256').update(exported).digest('hex');
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deepFreeze((record as any)[key]);
    }
    return Object.freeze(value);
  }

  return value;
}

function pruneEmptyObject(value: Record<string, unknown>): Record<string, unknown> | undefined {
  const canonical = canonicalizeValue(value) as Record<string, unknown> | undefined;
  if (!canonical) {
    return undefined;
  }
  const keys = Object.keys(canonical);
  if (keys.length === 0) {
    return undefined;
  }
  return canonical;
}