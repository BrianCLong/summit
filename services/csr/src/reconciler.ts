import { v4 as uuid } from "uuid";
import {
  AppliedRule,
  ConsentRecord,
  ConsentStateRecord,
  DiffEntry,
  DiffRequest,
  DiffResponse,
  GraphNode,
  GraphSnapshot,
  IngestResult,
  ReconciliationProof,
  RollbackResult,
  Snapshot,
  SourceSystem,
} from "./types";

const DEFAULT_SOURCE_PRECEDENCE: SourceSystem[] = ["crm", "app_sdk", "partner"];

function makeKey(record: Pick<ConsentRecord, "userId" | "consentType" | "channel">) {
  return [record.userId, record.consentType, record.channel ?? "*"]
    .map((segment) => segment.trim())
    .join(":");
}

function serialiseState(state: Map<string, ConsentStateRecord>): Record<string, ConsentStateRecord> {
  const serialised: Record<string, ConsentStateRecord> = {};
  for (const [key, value] of state.entries()) {
    serialised[key] = { ...value, provenance: { ...value.provenance } };
  }
  return serialised;
}

function deserialiseState(state: Record<string, ConsentStateRecord>): Map<string, ConsentStateRecord> {
  return new Map(
    Object.entries(state).map(([key, value]) => [key, { ...value, provenance: { ...value.provenance } }]),
  );
}

function precedenceRank(source: SourceSystem, precedence: SourceSystem[]): number {
  const index = precedence.indexOf(source);
  return index === -1 ? precedence.length : index;
}

function parseTimestamp(timestamp: string): number {
  const value = Date.parse(timestamp);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid timestamp provided: ${timestamp}`);
  }
  return value;
}

function buildGraphSnapshot(
  userId: string,
  consentType: string,
  channel: string | undefined,
  candidates: ConsentStateRecord[],
  precedence: SourceSystem[],
): GraphSnapshot {
  const nodes: Map<string, GraphNode> = new Map();
  const edges: GraphSnapshot["edges"] = [];

  const userNodeId = `user:${userId}`;
  const consentNodeId = `consent:${consentType}`;

  nodes.set(userNodeId, {
    id: userNodeId,
    type: "user",
    label: userId,
  });
  nodes.set(consentNodeId, {
    id: consentNodeId,
    type: "consent",
    label: consentType,
    data: channel ? { channel } : undefined,
  });

  for (const candidate of candidates) {
    const sourceNodeId = `source:${candidate.source}`;
    if (!nodes.has(sourceNodeId)) {
      nodes.set(sourceNodeId, {
        id: sourceNodeId,
        type: "source",
        label: candidate.source,
      });
    }

    const recordNodeId = `record:${candidate.provenance.recordId}`;
    nodes.set(recordNodeId, {
      id: recordNodeId,
      type: "record",
      label: candidate.provenance.recordId,
      data: {
        status: candidate.status,
        timestamp: candidate.timestamp,
      },
    });

    edges.push({
      from: userNodeId,
      to: consentNodeId,
      label: candidate.status,
      data: {
        source: candidate.source,
        recordId: candidate.provenance.recordId,
        timestamp: candidate.timestamp,
      },
    });
    edges.push({
      from: sourceNodeId,
      to: recordNodeId,
      label: "provided",
      data: {
        precedence: precedenceRank(candidate.source, precedence),
      },
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

export class ConsentStateReconciler {
  private state: Map<string, ConsentStateRecord>;

  private processedRecordIds: Set<string>;

  private snapshots: Snapshot[];

  constructor(private readonly sourcePrecedence: SourceSystem[] = DEFAULT_SOURCE_PRECEDENCE) {
    this.state = new Map();
    this.processedRecordIds = new Set();
    this.snapshots = [];
    this.createSnapshot("initial", []);
  }

  public ingest(records: ConsentRecord[]): IngestResult {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("At least one consent record must be provided for ingestion.");
    }

    const proofs: ReconciliationProof[] = [];

    for (const record of records) {
      const proof = this.processRecord(record);
      proofs.push(proof);
    }

    const snapshot = this.createSnapshot("ingest", proofs);

    return { snapshotId: snapshot.id, proofs };
  }

  public listSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  public getCurrentSnapshot(): Snapshot {
    return this.snapshots[this.snapshots.length - 1];
  }

  public diff(request: DiffRequest): DiffResponse {
    if (this.snapshots.length < 2 && !request.from) {
      throw new Error("Not enough snapshots to compute a diff.");
    }

    const toSnapshot = request.to
      ? this.findSnapshot(request.to)
      : this.snapshots[this.snapshots.length - 1];

    const fromSnapshot = request.from
      ? this.findSnapshot(request.from)
      : this.snapshots[this.snapshots.length - 2];

    const filterUser = request.userId;

    const differences: DiffEntry[] = [];
    const seen = new Set<string>();

    const fromEntries = Object.entries(fromSnapshot.state);
    const toEntries = Object.entries(toSnapshot.state);

    for (const [key, value] of fromEntries) {
      if (filterUser && value.userId !== filterUser) {
        continue;
      }
      seen.add(key);
      const next = toSnapshot.state[key];
      if (!next || JSON.stringify(next) !== JSON.stringify(value)) {
        differences.push({
          key,
          userId: value.userId,
          consentType: value.consentType,
          channel: value.channel,
          before: value,
          after: next,
        });
      }
    }

    for (const [key, value] of toEntries) {
      if (seen.has(key)) {
        continue;
      }
      if (filterUser && value.userId !== filterUser) {
        continue;
      }
      differences.push({
        key,
        userId: value.userId,
        consentType: value.consentType,
        channel: value.channel,
        before: undefined,
        after: value,
      });
    }

    return {
      fromSnapshot: fromSnapshot.id,
      toSnapshot: toSnapshot.id,
      differences,
    };
  }

  public rollback(snapshotId: string): RollbackResult {
    const snapshot = this.findSnapshot(snapshotId);
    this.state = deserialiseState(snapshot.state);
    this.processedRecordIds = new Set(snapshot.processedRecordIds);

    const rollbackSnapshot = this.createSnapshot(`rollback:${snapshotId}`, []);

    return {
      restoredSnapshotId: rollbackSnapshot.id,
      restoredFrom: snapshotId,
    };
  }

  private processRecord(record: ConsentRecord): ReconciliationProof {
    this.validateRecord(record);
    const key = makeKey(record);
    const appliedRules: AppliedRule[] = [];
    const existing = this.state.get(key) ?? null;

    if (this.processedRecordIds.has(record.recordId)) {
      appliedRules.push({
        rule: "DUPLICATE_RECORD",
        description: `record ${record.recordId} was already processed and is ignored`,
        winner: "none",
      });

      const graph = existing
        ? buildGraphSnapshot(
            record.userId,
            record.consentType,
            record.channel,
            [existing],
            this.sourcePrecedence,
          )
        : buildGraphSnapshot(
            record.userId,
            record.consentType,
            record.channel,
            [],
            this.sourcePrecedence,
          );

      return {
        recordId: record.recordId,
        key,
        userId: record.userId,
        consentType: record.consentType,
        channel: record.channel,
        before: graph,
        after: graph,
        winningState: existing,
        previousState: existing ?? undefined,
        appliedRules,
        changed: false,
      };
    }

    const candidate: ConsentStateRecord = {
      key,
      userId: record.userId,
      consentType: record.consentType,
      channel: record.channel,
      status: record.status,
      source: record.source,
      timestamp: record.timestamp,
      provenance: {
        recordId: record.recordId,
        metadata: record.metadata ? { ...record.metadata } : undefined,
      },
    };

    const beforeGraphCandidates = existing ? [existing, candidate] : [candidate];
    const beforeGraph = buildGraphSnapshot(
      record.userId,
      record.consentType,
      record.channel,
      beforeGraphCandidates,
      this.sourcePrecedence,
    );

    const { winner, changed, previousState } = this.resolve(existing, candidate, appliedRules);

    if (winner && (changed || !existing)) {
      this.state.set(key, winner);
    }

    this.processedRecordIds.add(record.recordId);

    const afterState = this.state.get(key) ?? null;
    const afterGraphCandidates = afterState ? [afterState] : [];
    const afterGraph = buildGraphSnapshot(
      record.userId,
      record.consentType,
      record.channel,
      afterGraphCandidates,
      this.sourcePrecedence,
    );

    return {
      recordId: record.recordId,
      key,
      userId: record.userId,
      consentType: record.consentType,
      channel: record.channel,
      before: beforeGraph,
      after: afterGraph,
      winningState: afterState,
      previousState,
      appliedRules,
      changed,
    };
  }

  private resolve(
    existing: ConsentStateRecord | null,
    candidate: ConsentStateRecord,
    appliedRules: AppliedRule[],
  ): { winner: ConsentStateRecord | null; changed: boolean; previousState?: ConsentStateRecord } {
    if (!existing) {
      appliedRules.push({
        rule: "NO_PREVIOUS_STATE",
        description: "no prior state existed; incoming record becomes the baseline",
        winner: "incoming",
      });
      return { winner: candidate, changed: true };
    }

    let winner: "existing" | "incoming" = "existing";

    const existingRank = precedenceRank(existing.source, this.sourcePrecedence);
    const candidateRank = precedenceRank(candidate.source, this.sourcePrecedence);

    if (candidateRank < existingRank) {
      appliedRules.push({
        rule: "SOURCE_PRECEDENCE",
        description: `${candidate.source} outranks ${existing.source}`,
        winner: "incoming",
      });
      winner = "incoming";
    } else if (candidateRank > existingRank) {
      appliedRules.push({
        rule: "SOURCE_PRECEDENCE",
        description: `${existing.source} outranks ${candidate.source}`,
        winner: "existing",
      });
    } else {
      const existingTime = parseTimestamp(existing.timestamp);
      const candidateTime = parseTimestamp(candidate.timestamp);

      if (candidateTime > existingTime) {
        appliedRules.push({
          rule: "RECENCY",
          description: `incoming record is more recent (${candidate.timestamp} > ${existing.timestamp})`,
          winner: "incoming",
        });
        winner = "incoming";
      } else if (candidateTime < existingTime) {
        appliedRules.push({
          rule: "RECENCY",
          description: `existing record is more recent (${existing.timestamp} >= ${candidate.timestamp})`,
          winner: "existing",
        });
      } else {
        const lexicalWinner = candidate.provenance.recordId.localeCompare(existing.provenance.recordId);
        if (lexicalWinner > 0) {
          appliedRules.push({
            rule: "TIE_BREAKER",
            description: `timestamps equal; higher lexical recordId ${candidate.provenance.recordId} wins`,
            winner: "incoming",
          });
          winner = "incoming";
        } else {
          appliedRules.push({
            rule: "TIE_BREAKER",
            description: `timestamps equal; existing recordId ${existing.provenance.recordId} remains authoritative`,
            winner: "existing",
          });
        }
      }
    }

    if (winner === "existing") {
      return { winner: existing, changed: false, previousState: existing };
    }

    return { winner: candidate, changed: true, previousState: existing };
  }

  private validateRecord(record: ConsentRecord) {
    if (!record.recordId?.trim()) {
      throw new Error("recordId is required");
    }
    if (!record.userId?.trim()) {
      throw new Error("userId is required");
    }
    if (!record.consentType?.trim()) {
      throw new Error("consentType is required");
    }
    if (!record.status?.trim()) {
      throw new Error("status is required");
    }
    if (!record.source?.trim()) {
      throw new Error("source is required");
    }
    parseTimestamp(record.timestamp);
  }

  private findSnapshot(id: string): Snapshot {
    const snapshot = this.snapshots.find((entry) => entry.id === id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} was not found`);
    }
    return snapshot;
  }

  private createSnapshot(reason: string, proofs: ReconciliationProof[]): Snapshot {
    const snapshot: Snapshot = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      reason,
      state: serialiseState(this.state),
      processedRecordIds: Array.from(this.processedRecordIds.values()),
      proofs,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }
}

export default ConsentStateReconciler;
