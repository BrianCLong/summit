import type { QuarantineStore } from "../quarantine/quarantineStore";
import type { SentinelConfig } from "../sentinels/signals";
import type { WriteSetEnvelope, WriteDecision, QuarantineReport, AllowReport, ArtifactRef } from "../../writeset/types";
import { runSentinels } from "../sentinels";
import { immuneGate } from "./immuneGate";
import { stableId } from "../../util/stableId";

export type ImmuneEngineDeps = {
  quarantineStore: QuarantineStore;
  cfg: SentinelConfig;
};

function affectedArtifacts(ws: WriteSetEnvelope): ArtifactRef[] {
  const out: ArtifactRef[] = [];
  for (const op of ws.ops) {
    if (op.op === "upsert_node") out.push({ kind: op.kind, id: op.id });
    if (op.op === "upsert_edge") {
      out.push(op.from, op.to);
    }
  }
  // de-dupe
  const seen = new Set<string>();
  return out.filter(a => {
    const k = `${a.kind}:${a.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function runImmuneEngine(ws: WriteSetEnvelope, deps: ImmuneEngineDeps): Promise<WriteDecision> {
  const signals = runSentinels(ws, deps.cfg);
  const decision = immuneGate(signals, deps.cfg);

  if (decision.disposition === "quarantine") {
    const quarantine_case_id = stableId("qcase", ws.writeset_id);

    await deps.quarantineStore.putCase({
      quarantine_case_id,
      created_at: new Date().toISOString(),
      status: "open",
      writeset: ws,
      signals: decision.signals,
      missing_requirements: decision.missing_requirements,
      recommended_next_evidence: decision.recommended_next_evidence,
      affected_artifacts: affectedArtifacts(ws),
    });

    const report: QuarantineReport = {
      disposition: "quarantine",
      writeset_id: ws.writeset_id,
      quarantine_case_id,
      signals_triggered: decision.signals,
      missing_requirements: decision.missing_requirements,
      recommended_next_evidence: decision.recommended_next_evidence,
      affected_artifacts: affectedArtifacts(ws),
    };
    return report;
  }

  const allow: AllowReport =
    decision.disposition === "allow_with_flags"
      ? { disposition: "allow_with_flags", writeset_id: ws.writeset_id, flags: decision.flags }
      : { disposition: "allow", writeset_id: ws.writeset_id };

  return allow;
}
