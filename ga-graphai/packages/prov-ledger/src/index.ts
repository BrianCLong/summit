import { createHash, createHmac } from "node:crypto";

import {
  buildLedgerUri,
  collectEvidencePointers,
  normalizeWorkflow,
  type LedgerContext,
  type LedgerRecord,
  type WorkflowDefinition,
  type WorkflowRunRecord
} from "common-types";

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
