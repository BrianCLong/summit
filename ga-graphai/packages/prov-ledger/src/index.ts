import { createHash, createHmac, randomUUID } from 'node:crypto';
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
  AuditLogEvent,
  AuditQueryFilter,
  AuditQueryOptions,
  AuditQueryResult,
  AuditTimelinePoint,
  AuditAnomaly,
  AuditCorrelation,
  AuditInvestigationContext,
  AuditPlatformOptions,
  AuditLogDataSource,
  AuditInvestigationTrailEntry,
  AuditRoleCapabilities,
  AuditInvestigatorRole,
  AuditSeverity
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

export { SelfEditRegistry } from './selfEditRegistry';
export type {
  ScorecardOptions as SelfEditScorecardOptions,
  SelfEditRegistryOptions,
} from './selfEditRegistry';

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
// AUDIT INVESTIGATION PLATFORM
// ============================================================================

const FALLBACK_CAPABILITIES: AuditRoleCapabilities = {
  query: false,
  export: false,
  viewAnomalies: false,
};

const DEFAULT_ROLE_MATRIX: Record<'viewer' | 'analyst' | 'admin', AuditRoleCapabilities> = {
  viewer: { query: true, export: false, viewAnomalies: false },
  analyst: { query: true, export: true, viewAnomalies: true },
  admin: { query: true, export: true, viewAnomalies: true },
};

type AuditCapability = keyof AuditRoleCapabilities;

interface CacheEntry {
  expiresAt: number;
  result: AuditQueryResult;
}

const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS_AUDIT = 24 * HOUR_IN_MS;

function uniqueValues<T>(values?: T[]): T[] | undefined {
  if (!values) {
    return undefined;
  }
  const seen = new Set<T>();
  const deduped: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      deduped.push(value);
    }
  }
  return deduped;
}

function cloneEvent(event: AuditLogEvent): AuditLogEvent {
  return {
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
    correlationIds: event.correlationIds ? [...event.correlationIds] : undefined,
  };
}

function cloneResult(result: AuditQueryResult, cached: boolean): AuditQueryResult {
  return {
    ...result,
    cached,
    events: result.events.map(cloneEvent),
    timeline: result.timeline.map((point) => ({ ...point })),
    anomalies: result.anomalies.map((anomaly) => ({
      ...anomaly,
      events: anomaly.events.map(cloneEvent),
    })),
    correlations: result.correlations.map((correlation) => ({
      ...correlation,
      systems: [...correlation.systems],
      events: correlation.events.map(cloneEvent),
    })),
  };
}

function parseSeverity(value: unknown): AuditSeverity | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalised = value.trim().toLowerCase();
  switch (normalised) {
    case 'info':
    case 'information':
      return 'info';
    case 'low':
      return 'low';
    case 'medium':
    case 'moderate':
      return 'medium';
    case 'high':
    case 'severe':
    case 'sev1':
      return 'high';
    case 'critical':
    case 'sev0':
      return 'critical';
    default:
      return undefined;
  }
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const values = value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (typeof item === 'number') {
          return String(item);
        }
        return undefined;
      })
      .filter((item): item is string => Boolean(item));
    return values.length ? values : undefined;
  }
  if (typeof value === 'string') {
    const segments = value
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.length ? segments : undefined;
  }
  return undefined;
}

function metadataToText(metadata?: Record<string, unknown>): string {
  if (!metadata) {
    return '';
  }
  try {
    return JSON.stringify(metadata).toLowerCase();
  } catch (error) {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}:${String(value)}`)
      .join(' ')
      .toLowerCase();
  }
}

function matchesCandidate(
  value: string,
  candidates: string[] | undefined,
  mode: 'contains' | 'exact' = 'exact'
): boolean {
  if (!candidates || candidates.length === 0) {
    return true;
  }
  const haystack = value.toLowerCase();
  return candidates.some((candidate) => {
    const needle = candidate.toLowerCase();
    if (mode === 'contains') {
      return haystack.includes(needle);
    }
    return haystack === needle;
  });
}

function parseTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function timelineVisual(index: number, event: AuditLogEvent): string {
  const ts = new Date(event.timestamp).toISOString();
  const truncatedSystem = event.system.length > 18
    ? `${event.system.slice(0, 15)}…`
    : event.system;
  const paddedSystem = truncatedSystem.padEnd(18, ' ');
  return `${String(index + 1).padStart(3, ' ')} | ${ts} | ${paddedSystem} | ${event.actor} -> ${event.action} (${event.resource})`;
}

function correlationKeys(event: AuditLogEvent): string[] {
  if (event.correlationIds && event.correlationIds.length > 0) {
    return event.correlationIds;
  }
  return [event.resource];
}

function ledgerSeverityFallback(category: string | undefined): AuditSeverity | undefined {
  if (!category) {
    return undefined;
  }
  const normalised = category.toLowerCase();
  if (normalised.includes('error') || normalised.includes('deny')) {
    return 'high';
  }
  if (normalised.includes('warn')) {
    return 'medium';
  }
  return undefined;
}

function convertSimpleLedgerEntry(entry: LedgerEntry, system: string): AuditLogEvent {
  const metadata = { ...entry.payload };
  const severity =
    parseSeverity(metadata.severity) ??
    parseSeverity(metadata.level) ??
    ledgerSeverityFallback(entry.category);
  const correlationIds =
    toStringArray(metadata.correlationIds) ??
    toStringArray(metadata.correlationId);
  if (metadata.correlationIds) {
    delete (metadata as Record<string, unknown>).correlationIds;
  }
  if (metadata.correlationId) {
    delete (metadata as Record<string, unknown>).correlationId;
  }
  const resolvedSystem = typeof metadata.system === 'string' && metadata.system.length > 0
    ? (metadata.system as string)
    : system;
  if (metadata.system) {
    delete (metadata as Record<string, unknown>).system;
  }
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    system: resolvedSystem,
    category: entry.category,
    severity,
    metadata,
    correlationIds: uniqueValues(correlationIds),
  };
}

function convertCursorRecord(record: CursorProvenanceRecord, system: string): AuditLogEvent {
  const actor = record.actor.displayName ?? record.actor.email ?? record.actor.id;
  const metadata: Record<string, unknown> = {
    branch: record.branch,
    repo: record.repo,
    usage: record.usage,
    policy: record.policy,
    budget: record.budget,
    rateLimit: record.rateLimit,
    purpose: record.purpose,
  };
  const severity = record.policy?.decision === 'deny' ? 'high' : 'info';
  const correlationSeeds: Array<string | undefined> = [
    record.provenance.sessionId,
    record.provenance.requestId,
    record.provenance.parentRequestId,
    record.storyRef?.id,
  ];
  const correlationIds = uniqueValues(
    correlationSeeds.filter((value): value is string => Boolean(value))
  );
  const resolvedSystem = record.model?.name ?? system;
  const timestamp = record.receivedAt ?? record.ts;
  return {
    id: record.provenance.requestId ?? randomUUID(),
    timestamp,
    actor,
    action: record.event,
    resource: record.repo,
    system: resolvedSystem,
    category: record.policy?.decision,
    severity,
    metadata,
    correlationIds,
  };
}

export class AuditInvestigationPlatform {
  private readonly dataSources: AuditLogDataSource[] = [];
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheOrder: string[] = [];
  private readonly cacheTtlMs: number;
  private readonly maxCacheEntries: number;
  private readonly anomalyMultiplier: number;
  private readonly anomalyMinEvents: number;
  private readonly roleMatrix: Record<AuditInvestigatorRole, AuditRoleCapabilities>;
  private readonly now: () => Date;
  private readonly trail: AuditInvestigationTrailEntry[] = [];

  constructor(sources: AuditLogDataSource[], options: AuditPlatformOptions = {}) {
    this.dataSources = [...sources];
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * MINUTE_IN_MS;
    this.maxCacheEntries = options.maxCacheEntries ?? 50;
    this.anomalyMultiplier = options.anomalyMultiplier ?? 2.5;
    this.anomalyMinEvents = options.anomalyMinEvents ?? 3;
    this.roleMatrix = this.buildRoleMatrix(options.roleMatrix);
    this.now = options.now ?? (() => new Date());
  }

  addDataSource(source: AuditLogDataSource): void {
    this.dataSources.push(source);
  }

  async runQuery(
    filter: AuditQueryFilter,
    context: AuditInvestigationContext,
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    this.ensureAuthorized(context, 'query');
    const normalisedFilter = this.normaliseFilter(filter);
    const finalOptions: AuditQueryOptions = {
      includeTimeline: options.includeTimeline ?? true,
      includeAnomalies: options.includeAnomalies ?? true,
      includeCorrelations: options.includeCorrelations ?? true,
      useCache: options.useCache ?? true,
      limit: options.limit,
      exportFormat: options.exportFormat,
      optimize: options.optimize ?? false,
      naturalLanguage: options.naturalLanguage,
    };

    const cacheKey = this.cacheKey(normalisedFilter, finalOptions);
    const useCache = Boolean(finalOptions.useCache) && this.cacheTtlMs > 0;
    if (useCache) {
      const cached = this.readCache(cacheKey);
      if (cached) {
        this.recordInvestigation(context, normalisedFilter, finalOptions, cached);
        return cached;
      }
    }

    const start = this.now();
    const events = await this.loadEvents(normalisedFilter, finalOptions.limit);
    const timeline = finalOptions.includeTimeline === false
      ? []
      : this.buildTimeline(events);
    const anomalies = finalOptions.includeAnomalies === false
      ? []
      : this.maybeDetectAnomalies(events, context);
    const correlations = finalOptions.includeCorrelations === false
      ? []
      : this.correlateEvents(events);
    const optimizedPlan = finalOptions.optimize
      ? this.describeOptimization(normalisedFilter, events, finalOptions.limit)
      : undefined;

    let exportPayload: string | undefined;
    let exportFormat: 'json' | 'csv' | undefined;
    if (finalOptions.exportFormat) {
      this.ensureAuthorized(context, 'export');
      exportFormat = finalOptions.exportFormat;
      exportPayload = this.buildExport(events, finalOptions.exportFormat);
    }

    const finished = this.now();
    const durationMs = finished.getTime() - start.getTime();
    const result: AuditQueryResult = {
      queryId: randomUUID(),
      executedAt: finished.toISOString(),
      durationMs,
      filter: normalisedFilter,
      events,
      timeline,
      anomalies,
      correlations,
      optimizedPlan,
      cached: false,
      exportPayload,
      exportFormat,
      naturalLanguage: finalOptions.naturalLanguage,
    };

    if (useCache) {
      this.writeCache(cacheKey, result);
    }

    this.recordInvestigation(context, normalisedFilter, finalOptions, result);
    return result;
  }

  async runNaturalLanguageQuery(
    query: string,
    context: AuditInvestigationContext,
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    const parsed = this.parseNaturalLanguageQuery(query);
    const mergedOptions: AuditQueryOptions = {
      ...parsed.options,
      ...options,
      naturalLanguage: query,
    };
    return this.runQuery(parsed.filter, context, mergedOptions);
  }

  getInvestigationTrail(limit?: number): AuditInvestigationTrailEntry[] {
    const entries = limit && limit > 0
      ? this.trail.slice(-limit)
      : [...this.trail];
    return entries.map((entry) => ({
      ...entry,
      investigator: {
        ...entry.investigator,
        roles: [...entry.investigator.roles],
      },
      query: {
        filter: { ...entry.query.filter },
        options: { ...entry.query.options },
      },
      resultSummary: { ...entry.resultSummary },
    }));
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder.length = 0;
  }

  private parseNaturalLanguageQuery(query: string): {
    filter: AuditQueryFilter;
    options: AuditQueryOptions;
  } {
    const filter: AuditQueryFilter = {};
    const options: AuditQueryOptions = {
      includeAnomalies: true,
      includeCorrelations: true,
      includeTimeline: true,
      optimize: true,
      useCache: true,
    };

    const text = query.trim();
    if (!text) {
      return { filter, options };
    }

    filter.text = text;

    const actorPattern = /actor:\s*("([^"]+)"|([^,\s]+))/gi;
    let match: RegExpExecArray | null;
    while ((match = actorPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.actors = [...(filter.actors ?? []), value];
      }
    }

    const actionPattern = /action:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = actionPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.actions = [...(filter.actions ?? []), value];
      }
    }

    const resourcePattern = /resource:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = resourcePattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.resources = [...(filter.resources ?? []), value];
      }
    }

    const systemPattern = /system:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = systemPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.systems = [...(filter.systems ?? []), value];
      }
    }

    const categoryPattern = /category:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = categoryPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.categories = [...(filter.categories ?? []), value];
      }
    }

    const correlationPattern = /correlation:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = correlationPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (value) {
        filter.correlationIds = [...(filter.correlationIds ?? []), value];
      }
    }

    const severityPattern = /severity:\s*("([^"]+)"|([^,\s]+))/gi;
    while ((match = severityPattern.exec(text))) {
      const value = (match[2] ?? match[3] ?? '').trim();
      const severity = parseSeverity(value);
      if (severity) {
        filter.severities = [...(filter.severities ?? []), severity];
      }
    }

    const limitMatch = text.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      const parsedLimit = Number.parseInt(limitMatch[1], 10);
      if (!Number.isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }

    const lastMatch = text.match(/last\s+(\d+)\s+(minute|minutes|hour|hours|day|days)/i);
    if (lastMatch) {
      const amount = Number.parseInt(lastMatch[1], 10);
      const unit = lastMatch[2].toLowerCase();
      const multiplier = unit.startsWith('minute')
        ? MINUTE_IN_MS
        : unit.startsWith('hour')
          ? HOUR_IN_MS
          : DAY_IN_MS_AUDIT;
      const from = new Date(this.now().getTime() - amount * multiplier);
      filter.from = from.toISOString();
    }

    const betweenMatch = text.match(/between\s+([^\s]+)\s+and\s+([^\s]+)/i);
    if (betweenMatch) {
      const fromValue = betweenMatch[1];
      const toValue = betweenMatch[2];
      const fromTs = parseTimestamp(fromValue);
      const toTs = parseTimestamp(toValue);
      if (!Number.isNaN(fromTs)) {
        filter.from = new Date(fromTs).toISOString();
      }
      if (!Number.isNaN(toTs)) {
        filter.to = new Date(toTs).toISOString();
      }
    }

    const sinceMatch = text.match(/since\s+([^\s]+)/i);
    if (sinceMatch && !filter.from) {
      const sinceTs = parseTimestamp(sinceMatch[1]);
      if (!Number.isNaN(sinceTs)) {
        filter.from = new Date(sinceTs).toISOString();
      }
    }

    return {
      filter: this.normaliseFilter(filter),
      options,
    };
  }

  private normaliseFilter(filter: AuditQueryFilter): AuditQueryFilter {
    const normalised: AuditQueryFilter = {
      ...filter,
      actors: uniqueValues(filter.actors?.map((actor) => actor.trim()).filter(Boolean)),
      actions: uniqueValues(filter.actions?.map((action) => action.trim()).filter(Boolean)),
      resources: uniqueValues(filter.resources?.map((resource) => resource.trim()).filter(Boolean)),
      systems: uniqueValues(filter.systems?.map((system) => system.trim()).filter(Boolean)),
      categories: uniqueValues(filter.categories?.map((category) => category.trim()).filter(Boolean)),
      severities: uniqueValues(filter.severities),
      correlationIds: uniqueValues(filter.correlationIds?.map((value) => value.trim()).filter(Boolean)),
    };

    if (filter.from) {
      const fromTs = parseTimestamp(filter.from);
      if (!Number.isNaN(fromTs)) {
        normalised.from = new Date(fromTs).toISOString();
      } else {
        delete normalised.from;
      }
    }

    if (filter.to) {
      const toTs = parseTimestamp(filter.to);
      if (!Number.isNaN(toTs)) {
        normalised.to = new Date(toTs).toISOString();
      } else {
        delete normalised.to;
      }
    }

    if (filter.text) {
      normalised.text = filter.text.trim();
    }

    return normalised;
  }

  private matchesFilter(event: AuditLogEvent, filter: AuditQueryFilter): boolean {
    if (!matchesCandidate(event.actor, filter.actors, 'contains')) {
      return false;
    }
    if (!matchesCandidate(event.action, filter.actions, 'contains')) {
      return false;
    }
    if (!matchesCandidate(event.resource, filter.resources, 'contains')) {
      return false;
    }
    if (!matchesCandidate(event.system, filter.systems)) {
      return false;
    }
    if (filter.categories && filter.categories.length > 0) {
      const category = event.category ?? '';
      if (!matchesCandidate(category, filter.categories, 'contains')) {
        return false;
      }
    }
    if (filter.severities && filter.severities.length > 0) {
      if (!event.severity || !matchesCandidate(event.severity, filter.severities)) {
        return false;
      }
    }
    if (filter.correlationIds && filter.correlationIds.length > 0) {
      const ids = event.correlationIds ?? [];
      const hasCorrelation = filter.correlationIds.some((candidate) =>
        ids.some((id) => id.toLowerCase() === candidate.toLowerCase())
      );
      if (!hasCorrelation) {
        return false;
      }
    }
    if (filter.from) {
      const eventTs = parseTimestamp(event.timestamp);
      const fromTs = parseTimestamp(filter.from);
      if (!Number.isNaN(fromTs) && eventTs < fromTs) {
        return false;
      }
    }
    if (filter.to) {
      const eventTs = parseTimestamp(event.timestamp);
      const toTs = parseTimestamp(filter.to);
      if (!Number.isNaN(toTs) && eventTs > toTs) {
        return false;
      }
    }
    if (filter.text) {
      const haystack = [
        event.id,
        event.actor,
        event.action,
        event.resource,
        event.system,
        event.category ?? '',
        event.severity ?? '',
        metadataToText(event.metadata),
        (event.correlationIds ?? []).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(filter.text.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  private async loadEvents(filter: AuditQueryFilter, limit: number | undefined): Promise<AuditLogEvent[]> {
    const events: AuditLogEvent[] = [];
    for (const source of this.dataSources) {
      const loaded = await Promise.resolve(source.load(filter));
      for (const event of loaded) {
        const clone = cloneEvent(event);
        clone.system = clone.system || source.system;
        clone.correlationIds = uniqueValues(clone.correlationIds);
        events.push(clone);
      }
    }
    const filtered = events.filter((event) => this.matchesFilter(event, filter));
    filtered.sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
    if (limit && limit > 0 && filtered.length > limit) {
      return filtered.slice(filtered.length - limit);
    }
    return filtered;
  }

  private buildTimeline(events: AuditLogEvent[]): AuditTimelinePoint[] {
    return events.map((event, index) => ({
      timestamp: new Date(event.timestamp).toISOString(),
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      system: event.system,
      label: `${event.actor} ${event.action} ${event.resource}`.trim(),
      visual: timelineVisual(index, event),
    }));
  }

  private maybeDetectAnomalies(
    events: AuditLogEvent[],
    context: AuditInvestigationContext
  ): AuditAnomaly[] {
    if (!this.can(context, 'viewAnomalies')) {
      return [];
    }
    return this.detectAnomalies(events);
  }

  private detectAnomalies(events: AuditLogEvent[]): AuditAnomaly[] {
    if (events.length === 0) {
      return [];
    }
    const anomalies: AuditAnomaly[] = [];
    const byActor = new Map<string, AuditLogEvent[]>();
    for (const event of events) {
      const list = byActor.get(event.actor) ?? [];
      list.push(event);
      byActor.set(event.actor, list);
    }
    const averageActor = events.length / Math.max(byActor.size, 1);
    byActor.forEach((list, actor) => {
      if (list.length >= this.anomalyMinEvents && list.length > averageActor * this.anomalyMultiplier) {
        const firstTs = parseTimestamp(list[0].timestamp);
        const lastTs = parseTimestamp(list[list.length - 1].timestamp);
        const spanMinutes = !Number.isNaN(firstTs) && !Number.isNaN(lastTs)
          ? Math.max((lastTs - firstTs) / MINUTE_IN_MS, 1)
          : list.length;
        const score = list.length / Math.max(averageActor, 1);
        anomalies.push({
          reason: `Actor ${actor} generated ${list.length} events (${score.toFixed(1)}x avg) within ${spanMinutes.toFixed(1)} minutes`,
          score,
          events: list.map(cloneEvent),
          actor,
        });
      }
    });

    const bySystem = new Map<string, AuditLogEvent[]>();
    for (const event of events) {
      const list = bySystem.get(event.system) ?? [];
      list.push(event);
      bySystem.set(event.system, list);
    }
    const averageSystem = events.length / Math.max(bySystem.size, 1);
    bySystem.forEach((list, system) => {
      if (list.length >= this.anomalyMinEvents && list.length > averageSystem * this.anomalyMultiplier) {
        const score = list.length / Math.max(averageSystem, 1);
        anomalies.push({
          reason: `System ${system} produced ${list.length} events (${score.toFixed(1)}x avg)`,
          score,
          events: list.map(cloneEvent),
          system,
        });
      }
    });

    anomalies.sort((a, b) => b.score - a.score);
    return anomalies;
  }

  private correlateEvents(events: AuditLogEvent[]): AuditCorrelation[] {
    const correlations = new Map<string, { systems: Set<string>; events: AuditLogEvent[] }>();
    for (const event of events) {
      for (const key of correlationKeys(event)) {
        if (!key) {
          continue;
        }
        const entry = correlations.get(key) ?? { systems: new Set<string>(), events: [] };
        entry.systems.add(event.system);
        entry.events.push(cloneEvent(event));
        correlations.set(key, entry);
      }
    }
    return Array.from(correlations.entries())
      .filter(([, value]) => value.systems.size > 1 || value.events.length > 1)
      .map(([key, value]) => ({
        key,
        systems: Array.from(value.systems),
        events: value.events,
      }))
      .sort((a, b) => b.events.length - a.events.length);
  }

  private describeOptimization(
    filter: AuditQueryFilter,
    events: AuditLogEvent[],
    limit: number | undefined
  ): string {
    const indices: string[] = [];
    if (filter.actors && filter.actors.length) {
      indices.push('actor');
    }
    if (filter.actions && filter.actions.length) {
      indices.push('action');
    }
    if (filter.resources && filter.resources.length) {
      indices.push('resource');
    }
    if (filter.systems && filter.systems.length) {
      indices.push('system');
    }
    if (filter.categories && filter.categories.length) {
      indices.push('category');
    }
    if (filter.severities && filter.severities.length) {
      indices.push('severity');
    }
    if (filter.correlationIds && filter.correlationIds.length) {
      indices.push('correlation');
    }
    if (filter.from || filter.to) {
      indices.push('timestamp');
    }

    const parts = [`sources(${this.dataSources.length})`];
    parts.push(`filter[${indices.length ? indices.join(',') : 'full-scan'}]`);
    parts.push('sort[timestamp]');
    if (limit && limit > 0) {
      parts.push(`limit(${limit})`);
    }
    parts.push(`results(${events.length})`);
    return parts.join(' -> ');
  }

  private buildExport(events: AuditLogEvent[], format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    }
    const headers = [
      'id',
      'timestamp',
      'actor',
      'action',
      'resource',
      'system',
      'category',
      'severity',
      'correlation_ids',
      'metadata',
    ];
    const rows = [headers.join(',')];
    for (const event of events) {
      const metadataString = event.metadata ? JSON.stringify(event.metadata) : '';
      const row = [
        event.id,
        event.timestamp,
        event.actor,
        event.action,
        event.resource,
        event.system,
        event.category ?? '',
        event.severity ?? '',
        (event.correlationIds ?? []).join('|'),
        metadataString,
      ]
        .map((value) => {
          const text = String(value ?? '');
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(',');
      rows.push(row);
    }
    return rows.join('\n');
  }

  private recordInvestigation(
    context: AuditInvestigationContext,
    filter: AuditQueryFilter,
    options: AuditQueryOptions,
    result: AuditQueryResult
  ): void {
    const entry: AuditInvestigationTrailEntry = {
      id: result.queryId,
      investigator: {
        tenantId: context.tenantId,
        userId: context.userId,
        sessionId: context.sessionId,
        roles: [...context.roles],
      },
      query: {
        filter: { ...filter },
        options: { ...options },
      },
      executedAt: result.executedAt,
      resultSummary: {
        events: result.events.length,
        anomalies: result.anomalies.length,
        correlations: result.correlations.length,
      },
    };
    this.trail.push(entry);
    if (this.trail.length > 200) {
      this.trail.splice(0, this.trail.length - 200);
    }
  }

  private cacheKey(filter: AuditQueryFilter, options: AuditQueryOptions): string {
    return JSON.stringify({
      filter,
      limit: options.limit,
      includeTimeline: options.includeTimeline,
      includeAnomalies: options.includeAnomalies,
      includeCorrelations: options.includeCorrelations,
      exportFormat: options.exportFormat,
      optimize: options.optimize,
      naturalLanguage: options.naturalLanguage,
    });
  }

  private readCache(key: string): AuditQueryResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < this.now().getTime()) {
      this.cache.delete(key);
      const index = this.cacheOrder.indexOf(key);
      if (index >= 0) {
        this.cacheOrder.splice(index, 1);
      }
      return undefined;
    }
    return cloneResult(entry.result, true);
  }

  private writeCache(key: string, result: AuditQueryResult): void {
    this.pruneCache();
    const entry: CacheEntry = {
      expiresAt: this.now().getTime() + this.cacheTtlMs,
      result: cloneResult(result, false),
    };
    this.cache.set(key, entry);
    this.cacheOrder.push(key);
    if (this.cacheOrder.length > this.maxCacheEntries) {
      const oldest = this.cacheOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
  }

  private pruneCache(): void {
    const nowTs = this.now().getTime();
    for (const key of [...this.cacheOrder]) {
      const entry = this.cache.get(key);
      if (entry && entry.expiresAt < nowTs) {
        this.cache.delete(key);
        const index = this.cacheOrder.indexOf(key);
        if (index >= 0) {
          this.cacheOrder.splice(index, 1);
        }
      }
    }
  }

  private buildRoleMatrix(
    overrides?: Partial<Record<AuditInvestigatorRole, AuditRoleCapabilities>>
  ): Record<AuditInvestigatorRole, AuditRoleCapabilities> {
    const matrix: Record<AuditInvestigatorRole, AuditRoleCapabilities> = {
      viewer: { ...DEFAULT_ROLE_MATRIX.viewer },
      analyst: { ...DEFAULT_ROLE_MATRIX.analyst },
      admin: { ...DEFAULT_ROLE_MATRIX.admin },
    };
    if (overrides) {
      for (const [role, capabilities] of Object.entries(overrides)) {
        const castRole = role as AuditInvestigatorRole;
        const base = matrix[castRole] ?? FALLBACK_CAPABILITIES;
        matrix[castRole] = { ...base, ...capabilities };
      }
    }
    return matrix;
  }

  private can(context: AuditInvestigationContext, capability: AuditCapability): boolean {
    return context.roles.some((role) => {
      const capabilities = this.roleMatrix[role] ?? FALLBACK_CAPABILITIES;
      return capabilities[capability];
    });
  }

  private ensureAuthorized(context: AuditInvestigationContext, capability: AuditCapability): void {
    if (!this.can(context, capability)) {
      throw new Error(`Not authorized to ${capability} audit data`);
    }
  }
}

export function simpleLedgerDataSource(
  system: string,
  ledger: SimpleProvenanceLedger
): AuditLogDataSource {
  return {
    system,
    load: () => ledger.list().map((entry) => convertSimpleLedgerEntry(entry, system)),
  };
}

export function cursorLedgerDataSource(
  system: string,
  ledger: ProvenanceLedger
): AuditLogDataSource {
  return {
    system,
    load: () => ledger.list().map((record) => convertCursorRecord(record, system)),
  };
}

export * from './manifest.js';
