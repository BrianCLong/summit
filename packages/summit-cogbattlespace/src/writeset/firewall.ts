import { validators } from "../../../summit-schemas/src/index.ts";
import type {
  CogWriteSet,
  CogRejectionReport,
  CogRejectionItem,
  CogRejectionError,
  CogWriteOp,
  BatchReplayOpOutcome
} from "./types";
import type { CogBattleStorage } from "../storage";
import type { CogReplayLedger } from "./replayLedger";
import type { CogDedupeLedger } from "./dedupeLedger";
import type { CogQuarantineStore } from "./quarantine";
import { verifyBatchSignature } from "./signature";
import { computeEntityFingerprint, computeOpIdempotencyKey } from "./semanticKeys";
import { reconcileEntityTrustAware } from "./reconcile/reconciler";
import { reconcileToLane } from "./lanes/reconciler";

function ajvErrorsToItems(prefixCode: string, errors: any[] | null | undefined): CogRejectionError[] {
  return (errors ?? []).map((e) => ({
    code: prefixCode,
    message: e.message ?? "schema validation error",
    instancePath: e.instancePath,
    schemaPath: e.schemaPath,
    details: e.params ?? {}
  }));
}

function validatePayload(op: CogWriteOp): { ok: true } | { ok: false; errors: CogRejectionError[] } {
  const map: Record<string, any> = {
    Artifact: validators.artifact,
    Narrative: validators.narrative,
    Belief: validators.belief,
    NarrativeClaimLink: validators.narrativeClaimLink,
    BeliefClaimLink: validators.beliefClaimLink,
    NarrativeBeliefLink: validators.narrativeBeliefLink,
    DivergenceMetric: validators.divergenceMetric,
    BeliefGapMetric: validators.beliefGapMetric
  };

  const v = map[op.entityType];
  if (!v) {
    return {
      ok: false,
      errors: [{ code: "UNKNOWN_ENTITY", message: `No validator registered for ${op.entityType}` }]
    };
  }

  const ok = v(op.payload);
  if (!ok) return { ok: false, errors: ajvErrorsToItems("PAYLOAD_SCHEMA", v.errors) };
  return { ok: true };
}

function enforceDomainSeparation(
  ws: CogWriteSet,
  op: CogWriteOp
): { ok: true } | { ok: false; errors: CogRejectionError[] } {
  const deny = ws.scope?.denyDomains ?? ["RG"];
  if (deny.includes("RG" as any)) {
    if (op.domain !== "NG" && op.domain !== "BG") {
      return { ok: false, errors: [{ code: "DOMAIN_DENIED", message: `Domain ${op.domain} not allowed` }] };
    }
  }

  const ngOnly = new Set(["Artifact", "Narrative", "NarrativeClaimLink", "DivergenceMetric"]);
  const bgOnly = new Set(["Belief", "BeliefClaimLink", "NarrativeBeliefLink", "BeliefGapMetric"]);

  if (ngOnly.has(op.entityType) && op.domain !== "NG") {
    return { ok: false, errors: [{ code: "DOMAIN_MISMATCH", message: `${op.entityType} must be NG` }] };
  }
  if (bgOnly.has(op.entityType) && op.domain !== "BG") {
    return { ok: false, errors: [{ code: "DOMAIN_MISMATCH", message: `${op.entityType} must be BG` }] };
  }

  return { ok: true };
}

function toReportStatus(
  status: BatchReplayOpOutcome["status"]
): CogRejectionItem["status"] {
  switch (status) {
    case "APPLIED": return "APPLIED";
    case "MERGED": return "MERGED";
    case "PROMOTED": return "PROMOTED";
    case "ALREADY_APPLIED": return "ALREADY_APPLIED";
    case "DUPLICATE_OP": return "DUPLICATE_OP";
    case "NOOP_ENTITY": return "NOOP_ENTITY";
    case "QUARANTINED": return "QUARANTINED";
    case "REVIEW": return "REVIEW";
    default: return "REJECTED";
  }
}

export async function applyCogWriteSet(
  store: CogBattleStorage,
  replayLedger: CogReplayLedger,
  dedupeLedger: CogDedupeLedger,
  quarantineStore: CogQuarantineStore,
  ws: CogWriteSet
): Promise<CogRejectionReport> {
  const now = new Date().toISOString();

  // Basic Envelope + Signature
  if (!validators.cogWriteset(ws)) {
    return {
      ok: false,
      writesetId: (ws as any).writesetId ?? "unknown",
      batchSignature: (ws as any).batchSignature,
      summary: { receivedOps: ws?.ops?.length ?? 0, appliedOps: 0, mergedOps: 0, promotedOps: 0, alreadyAppliedOps: 0, duplicateOps: 0, noopEntityOps: 0, quarantinedOps: 0, reviewOps: 0, rejectedOps: ws?.ops?.length ?? 0 },
      items: [{ opId: "ENVELOPE", status: "REJECTED", errors: ajvErrorsToItems("ENVELOPE_SCHEMA", validators.cogWriteset.errors) }]
    };
  }

  if (!verifyBatchSignature(ws)) {
    return {
      ok: false,
      writesetId: ws.writesetId,
      batchSignature: ws.batchSignature,
      summary: { receivedOps: ws.ops.length, appliedOps: 0, mergedOps: 0, promotedOps: 0, alreadyAppliedOps: 0, duplicateOps: 0, noopEntityOps: 0, quarantinedOps: 0, reviewOps: 0, rejectedOps: ws.ops.length },
      items: [{ opId: "SIGNATURE", status: "REJECTED", errors: [{ code: "INVALID_BATCH_SIGNATURE", message: "batchSignature does not match canonical hash of origin+ops" }] }]
    };
  }

  const existingBatch = await replayLedger.get(ws.batchSignature);
  if (existingBatch) {
    return {
      ok: existingBatch.outcomes.every((o) => o.status === "APPLIED" || o.status === "MERGED" || o.status === "PROMOTED" || o.status === "ALREADY_APPLIED" || o.status === "DUPLICATE_OP" || o.status === "NOOP_ENTITY" || o.status === "REVIEW"),
      writesetId: ws.writesetId,
      batchSignature: ws.batchSignature,
      summary: {
        receivedOps: existingBatch.outcomes.length,
        appliedOps: existingBatch.outcomes.filter(o => o.status === "APPLIED").length,
        mergedOps: existingBatch.outcomes.filter(o => o.status === "MERGED").length,
        promotedOps: existingBatch.outcomes.filter(o => o.status === "PROMOTED").length,
        alreadyAppliedOps: existingBatch.outcomes.filter(o => o.status === "ALREADY_APPLIED").length,
        duplicateOps: existingBatch.outcomes.filter(o => o.status === "DUPLICATE_OP").length,
        noopEntityOps: existingBatch.outcomes.filter(o => o.status === "NOOP_ENTITY").length,
        quarantinedOps: existingBatch.outcomes.filter(o => o.status === "QUARANTINED").length,
        reviewOps: existingBatch.outcomes.filter(o => o.status === "REVIEW").length,
        rejectedOps: existingBatch.outcomes.filter(o => o.status === "REJECTED_SCHEMA" || o.status === "REJECTED_POLICY").length
      },
      items: existingBatch.outcomes.map(o => ({ opId: o.opId, status: toReportStatus(o.status), entityType: o.entityType, domain: o.domain, action: o.action, errors: o.errors ?? [] }))
    };
  }

  const items: CogRejectionItem[] = [];
  const outcomes: BatchReplayOpOutcome[] = [];

  const acceptedMeta: Array<{
    op: CogWriteOp;
    idempotencyKey: string;
    entityFingerprint: string;
  }> = [];

  for (const op of ws.ops) {
    const base = { opId: op.opId, entityType: op.entityType, domain: op.domain, action: op.action };

    if (!validators.cogOp(op)) {
      const errs = ajvErrorsToItems("OP_SCHEMA", validators.cogOp.errors);
      items.push({ ...base, status: "REJECTED", errors: errs });
      outcomes.push({ ...base, status: "REJECTED_SCHEMA", recordedAt: now, errors: errs });
      continue;
    }

    const sep = enforceDomainSeparation(ws, op);
    if (!sep.ok) {
      items.push({ ...base, status: "REJECTED", errors: sep.errors });
      outcomes.push({ ...base, status: "REJECTED_POLICY", recordedAt: now, errors: sep.errors });
      continue;
    }

    const pv = validatePayload(op);
    if (!pv.ok) {
      items.push({ ...base, status: "REJECTED", errors: pv.errors });
      outcomes.push({ ...base, status: "REJECTED_SCHEMA", recordedAt: now, errors: pv.errors });
      continue;
    }

    const idempotencyKey = computeOpIdempotencyKey(op);
    const entityFingerprint = computeEntityFingerprint(op);

    const seenOp = await dedupeLedger.getOp(idempotencyKey);
    if (seenOp) {
      const e = [{ code: "DUPLICATE_OP", message: `Equivalent op already seen in batch ${seenOp.firstBatchSignature}` }];
      items.push({ ...base, status: "DUPLICATE_OP", errors: e });
      outcomes.push({ ...base, status: "DUPLICATE_OP", recordedAt: now, idempotencyKey, entityFingerprint, errors: e });
      continue;
    }

    const seenEntity = await dedupeLedger.getEntity(entityFingerprint);
    if (seenEntity) {
      const e = [{ code: "NOOP_ENTITY", message: `Materially identical entity state already exists from batch ${seenEntity.firstBatchSignature}` }];
      items.push({ ...base, status: "NOOP_ENTITY", errors: e });
      outcomes.push({ ...base, status: "NOOP_ENTITY", recordedAt: now, idempotencyKey, entityFingerprint, errors: e });
      continue;
    }

    const current = await store.getCurrentEntity(op.entityType, entityFingerprint);
    const rec = reconcileEntityTrustAware({ op, current });

    const currentLane = current?.lane as any ?? null;
    const laneRec = reconcileToLane({
      op,
      currentLane,
      currentPayload: current?.payload ?? null,
      structuralDecision: rec.decision as any,
      mergedPayload: rec.mergedPayload
    });

    if (laneRec.decision === "QUARANTINE_LANE") {
      await quarantineStore.put({ op, reason: "QUARANTINE", recordedAt: now, errors: laneRec.reasons });
      items.push({ ...base, status: "QUARANTINED", errors: laneRec.reasons });
      outcomes.push({ ...base, status: "QUARANTINED", recordedAt: now, idempotencyKey, entityFingerprint, errors: laneRec.reasons });
      continue;
    }

    if (laneRec.decision === "REVIEW_LANE") {
      await quarantineStore.put({ op, reason: "REVIEW", recordedAt: now, errors: laneRec.reasons });
      items.push({ ...base, status: "REVIEW", errors: laneRec.reasons });
      outcomes.push({ ...base, status: "REVIEW", recordedAt: now, idempotencyKey, entityFingerprint, errors: laneRec.reasons });
      continue;
    }

    if (laneRec.decision === "NOOP_LANE") {
      items.push({ ...base, status: "NOOP_ENTITY", errors: laneRec.reasons });
      outcomes.push({ ...base, status: "NOOP_ENTITY", recordedAt: now, idempotencyKey, entityFingerprint, errors: laneRec.reasons });
      continue;
    }

    const mappedStatus = laneRec.decision === "INSERT_LANE" ? "APPLIED" : laneRec.decision === "MERGE_LANE" ? "MERGED" : "PROMOTED";

    // Write lane snapshot
    await store.putLaneSnapshot(op.entityType, entityFingerprint, {
      lane: laneRec.targetLane,
      payload: laneRec.mergedPayload ?? op.payload,
      updatedAt: now
    });

    items.push({ ...base, status: mappedStatus, errors: laneRec.reasons });
    outcomes.push({ ...base, status: mappedStatus, recordedAt: now, idempotencyKey, entityFingerprint, errors: laneRec.reasons });
    acceptedMeta.push({ op, idempotencyKey, entityFingerprint });
  }

  for (const m of acceptedMeta) {
    await dedupeLedger.putOp({
      idempotencyKey: m.idempotencyKey,
      firstSeenAt: now,
      firstBatchSignature: ws.batchSignature,
      opId: m.op.opId,
      entityType: m.op.entityType,
      domain: m.op.domain,
      action: m.op.action,
      entityFingerprint: m.entityFingerprint
    });

    await dedupeLedger.putEntity({
      entityFingerprint: m.entityFingerprint,
      firstSeenAt: now,
      firstBatchSignature: ws.batchSignature,
      firstOpId: m.op.opId,
      entityType: m.op.entityType,
      domain: m.op.domain,
      action: m.op.action
    });
  }

  const replayRecord = {
    batchSignature: ws.batchSignature,
    writesetId: ws.writesetId,
    appliedAt: now,
    origin: ws.origin,
    opIds: ws.ops.map((o) => o.opId),
    outcomes
  };

  await replayLedger.put(replayRecord);

  return {
    ok: outcomes.every(o => o.status === "APPLIED" || o.status === "MERGED" || o.status === "PROMOTED" || o.status === "ALREADY_APPLIED" || o.status === "DUPLICATE_OP" || o.status === "NOOP_ENTITY" || o.status === "REVIEW"),
    writesetId: ws.writesetId,
    batchSignature: ws.batchSignature,
    summary: {
      receivedOps: ws.ops.length,
      appliedOps: outcomes.filter(o => o.status === "APPLIED").length,
      mergedOps: outcomes.filter(o => o.status === "MERGED").length,
      promotedOps: outcomes.filter(o => o.status === "PROMOTED").length,
      alreadyAppliedOps: outcomes.filter(o => o.status === "ALREADY_APPLIED").length,
      duplicateOps: outcomes.filter(o => o.status === "DUPLICATE_OP").length,
      noopEntityOps: outcomes.filter(o => o.status === "NOOP_ENTITY").length,
      quarantinedOps: outcomes.filter(o => o.status === "QUARANTINED").length,
      reviewOps: outcomes.filter(o => o.status === "REVIEW").length,
      rejectedOps: outcomes.filter(o => o.status === "REJECTED_SCHEMA" || o.status === "REJECTED_POLICY").length
    },
    items
  };
}
