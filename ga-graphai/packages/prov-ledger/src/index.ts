import { createHash, createHmac } from 'node:crypto';
import type { 
  EvidenceBundle, 
  LedgerEntry, 
  LedgerFactInput,
  BudgetResult,
  CursorEvent,
  PolicyDecision,
  ProvenanceRecord,
  RateLimitResult,
  LedgerContext,
  LedgerRecord,
  WorkflowDefinition,
  WorkflowRunRecord
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
  private readonly records: ProvenanceRecord[] = [];
  private readonly bySession = new Map<string, ProvenanceRecord[]>();
  private readonly byRepo = new Map<string, ProvenanceRecord[]>();

  constructor(options: LedgerOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  }

  async append(event: CursorEvent, options: AppendOptions): Promise<ProvenanceRecord> {
    this.prune();

    const receivedAt = (options.receivedAt ?? this.now()).toISOString();
    const checksum = this.computeChecksum(event, options.decision, receivedAt);

    const record: ProvenanceRecord = {
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

  list(limit = 200): ProvenanceRecord[] {
    if (limit >= this.records.length) {
      return [...this.records];
    }

    return this.records.slice(this.records.length - limit);
  }

  findBySession(sessionId: string): ProvenanceRecord[] {
    return this.bySession.get(sessionId) ?? [];
  }

  findByRepo(repo: string): ProvenanceRecord[] {
    return this.byRepo.get(repo) ?? [];
  }

  findByRequest(requestId: string): ProvenanceRecord | undefined {
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

  private index(record: ProvenanceRecord): void {
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

  private removeFromIndex(record: ProvenanceRecord): void {
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
// WORKFLOW LEDGER RECORDING - From codex/create-drag-and-drop-workflow-creator
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
