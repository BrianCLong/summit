import express from "express";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { MemoryQuarantineStore } from "../epistemics/quarantine/quarantineStore";
import { writeArtifacts } from "../writeset/writeArtifacts";
import {
  MemoryAntibodyLibrary,
  antibodyFromQuarantine,
} from "../epistemics/immune/antibodyLibrary";
import { immuneEventBus } from "../epistemics/immune/immuneEvents";
import { MemoryFamilyStore } from "../epistemics/families/familyStore";
import { MemoryGlobalPolicyStore } from "../epistemics/policy/globalPolicyStore";
import { MemoryDoctrineSnapshotStore } from "../epistemics/doctrine/snapshotStore";
import { MemoryDoctrineAlertStore } from "../epistemics/alerts/alertStore";
import { MemoryRemediationEffectivenessStore } from "../epistemics/doctrine/effectivenessStore";
import { serveAlertRecommendations } from "../epistemics/advisor/recommendationServer";
import { buildAdvisorAcceptedRemediation } from "../epistemics/advisor/advisorFollowThrough";
import { buildPlaybookStats } from "../epistemics/playbook/playbookBuilder";
import { rankPlaybook } from "../epistemics/playbook/playbookRanking";
import { derivePlaybookInsights } from "../epistemics/playbook/playbookRecommendations";
import { buildDoctrineSnapshot } from "../epistemics/doctrine/snapshotBuilder";
import { buildDoctrineTrendReport } from "../epistemics/doctrine/snapshotTrends";
import { evaluateDoctrineAlerts } from "../epistemics/alerts/alertEngine";
import { evaluateRemediationEffectiveness } from "../epistemics/doctrine/remediationEvaluator";
import { runBatchSimulation } from "../epistemics/simulation/batchRunner";
import { buildBatchMetrics } from "../epistemics/simulation/batchMetrics";
import { buildBatchRecommendations } from "../epistemics/simulation/batchRecommendations";
import { validateOverrideJustification } from "../epistemics/override/overridePolicy";
import { buildOverrideAuditRecord } from "../epistemics/override/overrideScoring";
import { validateOverrideOutcome } from "../epistemics/outcomes/outcomePolicy";
import { scoreOverrideOutcome } from "../epistemics/outcomes/outcomeScoring";
import { stableId } from "../util/stableId";
import { MemoryReviewerStore } from "../reviewer/reviewerStore";
import { MemoryThresholdHintStore } from "../tuning/thresholdHints";
import { makeEmptyFamilyProfile, applyFamilyOutcome } from "../epistemics/families/familyTuning";
import { classifyFamilyFromMotif } from "../epistemics/families/familyClassifier";
import {
  acknowledgeAlert,
  attachRemediation,
  resolveAlert,
  computeTimeOpenMs,
} from "../epistemics/alerts/alertLifecycle";

const app = express();
app.use(express.json());

const quarantineStore = new MemoryQuarantineStore();
const antibodyLibrary = new MemoryAntibodyLibrary();
const familyStore = new MemoryFamilyStore();
const globalPolicyStore = new MemoryGlobalPolicyStore();
const doctrineSnapshotStore = new MemoryDoctrineSnapshotStore();
const doctrineAlertStore = new MemoryDoctrineAlertStore();
const remediationEffectivenessStore = new MemoryRemediationEffectivenessStore();
const reviewerStore = new MemoryReviewerStore();
const thresholdHintStore = new MemoryThresholdHintStore();

const cfg = {
  burstWindowSec: 120,
  burstThreshold: 100,
  minEvidenceLinks: 1,
  provenanceRequiredFields: ["source", "collected_at", "collector"],
  quarantineScoreThreshold: 0.8,
  allowWithFlagsThreshold: 0.4,
};

// --- SSE clients ---
const sseClients = new Set<express.Response>();

function sendSse(res: express.Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

immuneEventBus.onEvent((evt) => {
  for (const client of sseClients) {
    sendSse(client, evt.type, evt.payload);
  }
});

app.get("/api/eis/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(": connected\n\n");
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.get("/api/eis/quarantine", async (_req, res) => {
  res.json(await quarantineStore.listCases({ limit: 200 }));
});

app.get("/api/eis/antibodies", async (_req, res) => {
  res.json(await antibodyLibrary.list(200));
});

app.get("/api/eis/families", async (_req, res) => {
  res.json(await familyStore.list(200));
});

app.get("/api/eis/reviewers", async (_req, res) => {
  res.json(await reviewerStore.list(200));
});

app.get("/api/eis/threshold-hints", async (_req, res) => {
  res.json(await thresholdHintStore.list(200));
});

app.post("/api/eis/ingest", async (req, res) => {
  const decision = await writeArtifacts(req.body, { quarantineStore, antibodyLibrary, familyStore, globalPolicyStore, cfg });
  res.json(decision);
});

app.post("/api/eis/ingest-fixtures", async (_req, res) => {
  const dir = path.join(__dirname, "../fixtures/eis/writesets");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

  const decisions = [];
  for (const f of files) {
    const ws = JSON.parse(readFileSync(path.join(dir, f), "utf-8"));
    const decision = await writeArtifacts(ws, { quarantineStore, antibodyLibrary, familyStore, globalPolicyStore, cfg });
    decisions.push({ file: f, decision });
  }

  res.json({ ingested: files.length, decisions });
});

app.post("/api/eis/resolve", async (req, res) => {
  const { quarantine_case_id, resolution, note } = req.body ?? {};

  if (!quarantine_case_id || !["allow", "reject"].includes(resolution)) {
    return res.status(400).json({
      error: "Expected { quarantine_case_id, resolution: 'allow'|'reject', note? }",
    });
  }

  const qc = await quarantineStore.getCase(quarantine_case_id);
  if (!qc) {
    return res.status(404).json({ error: "Quarantine case not found" });
  }

  await quarantineStore.resolveCase(quarantine_case_id, resolution, note);

  immuneEventBus.emitEvent({
    type: "quarantine.resolved",
    payload: {
      quarantine_case_id,
      resolution,
      resolved_at: new Date().toISOString(),
    },
  });

  const antibody = antibodyFromQuarantine(qc, resolution);
  await antibodyLibrary.add(antibody);

  immuneEventBus.emitEvent({
    type: "antibody.learned",
    payload: {
      antibody_id: antibody.antibody_id,
      quarantine_case_id,
      learned_at: antibody.created_at,
      motif: antibody.motif,
    },
  });

  return res.json({
    ok: true,
    quarantine_case_id,
    resolution,
    antibody,
  });
});

app.post("/api/eis/override", async (req, res) => {
  const { quarantine_case_id, justification } = req.body ?? {};

  if (!quarantine_case_id || !justification) {
    return res.status(400).json({
      error: "Expected { quarantine_case_id, justification }",
    });
  }

  const policy = validateOverrideJustification(justification);
  if (!policy.ok) {
    return res.status(400).json({ error: "Invalid override justification", reasons: policy.reasons });
  }

  const qc = await quarantineStore.getCase(quarantine_case_id);
  if (!qc) {
    return res.status(404).json({ error: "Quarantine case not found" });
  }

  const audit = buildOverrideAuditRecord(qc, {
    quarantine_case_id,
    resolution: "allow_override",
    justification,
  });

  await quarantineStore.appendOverride(quarantine_case_id, audit);
  await quarantineStore.resolveCase(
    quarantine_case_id,
    "allow",
    `Manual override by ${justification.reviewer.id}: ${justification.summary}`
  );

  for (const ab of qc.antibody_matches ?? []) {
    await antibodyLibrary.updateQuality(ab.antibody_id, "override_allow");
  }

  immuneEventBus.emitEvent({
    type: "quarantine.resolved",
    payload: {
      quarantine_case_id,
      resolution: "allow",
      resolved_at: new Date().toISOString(),
    },
  });

  immuneEventBus.emitEvent({
    type: "antibody.learned",
    payload: {
      antibody_id: qc.antibody_matches?.[0]?.antibody_id ?? "none",
      quarantine_case_id,
      learned_at: new Date().toISOString(),
      motif: qc.antibody_matches?.[0]?.motif ?? "override_feedback",
    },
  });

  return res.json({
    ok: true,
    override: audit,
  });
});

app.post("/api/eis/override-outcome", async (req, res) => {
  const input = req.body ?? {};
  const policy = validateOverrideOutcome(input);

  if (!policy.ok) {
    return res.status(400).json({ error: "Invalid override outcome", reasons: policy.reasons });
  }

  const qc = await quarantineStore.getCase(input.quarantine_case_id);
  if (!qc) return res.status(404).json({ error: "Quarantine case not found" });

  const override = (qc.overrides ?? []).find((o) => o.override_id === input.override_id);
  if (!override) return res.status(404).json({ error: "Override not found" });

  const outcome = {
    outcome_id: stableId("out", `${input.override_id}:${input.label}:${Date.now()}`),
    override_id: input.override_id,
    quarantine_case_id: input.quarantine_case_id,
    created_at: new Date().toISOString(),
    label: input.label,
    assessor: input.assessor,
    summary: input.summary,
    evidence_refs: input.evidence_refs ?? [],
  };

  await quarantineStore.appendOverrideOutcome(input.quarantine_case_id, input.override_id, outcome);

  const effects = scoreOverrideOutcome(input.label);

  for (const abId of override.contradicted_antibody_ids ?? []) {
    if (input.label === "harmful_or_false") {
      await antibodyLibrary.updateQuality(abId, "override_harmful");
    } else if (input.label === "correct") {
      await antibodyLibrary.updateQuality(abId, "override_correct");
    } else {
      await antibodyLibrary.updateQuality(abId, "override_allow");
    }
  }

  await reviewerStore.applyOutcome(override.reviewer.id, input.label, effects.reviewerDelta);

  await thresholdHintStore.add({
    hint_id: stableId("th", `${input.override_id}:${input.label}`),
    created_at: new Date().toISOString(),
    quarantine_case_id: input.quarantine_case_id,
    override_id: input.override_id,
    direction: effects.thresholdHint.direction,
    magnitude: effects.thresholdHint.magnitude,
    reason: effects.thresholdHint.reason,
  });

  for (const abId of override.contradicted_antibody_ids ?? []) {
    const antibodies = await antibodyLibrary.list(500);
    const ab = antibodies.find((x) => x.antibody_id === abId);
    const family_code = ab?.family_code ?? classifyFamilyFromMotif(ab?.motif ?? "mixed_unknown");

    const existing = await familyStore.get(family_code);
    const base = existing ?? makeEmptyFamilyProfile(family_code);

    const familyOutcome =
      input.label === "harmful_or_false"
        ? "override_harmful"
        : input.label === "correct"
        ? "override_correct"
        : "override_benign";

    await familyStore.upsert(
      applyFamilyOutcome(base, {
        antibody_id: abId,
        outcome: familyOutcome,
      })
    );
  }

  return res.json({
    ok: true,
    outcome,
    effects,
  });
});

app.get("/api/eis/policy/global", async (_req, res) => {
  res.json(await globalPolicyStore.getGlobalPolicy());
});

app.post("/api/eis/policy/posture", async (req, res) => {
  const { posture, reason } = req.body ?? {};
  if (!["high_alert", "normal", "exploratory"].includes(posture)) {
    return res.status(400).json({ error: "Invalid posture" });
  }
  const updated = await globalPolicyStore.setPosture(posture, reason ?? `Manual posture change to ${posture}`);
  res.json(updated);
});

app.post("/api/eis/policy/instance-override", async (req, res) => {
  const { antibody_id, action_override, quarantine_bias, scrutiny_bias, expires_at, reason } = req.body ?? {};
  if (!antibody_id || !reason) {
    return res.status(400).json({ error: "Expected antibody_id and reason" });
  }

  await globalPolicyStore.upsertInstanceOverride({
    antibody_id,
    action_override,
    quarantine_bias,
    scrutiny_bias,
    expires_at,
    reason,
  });

  res.json({ ok: true });
});

app.post("/api/eis/simulate-policy-batch", async (req, res) => {
  try {
    const { mode = "recent_quarantines", limit = 25, fixture_names } = req.body ?? {};

    let corpus: Array<{
      id: string;
      ws: any;
      family_code?: string;
      antibody_ids?: string[];
    }> = [];

    if (mode === "recent_quarantines") {
      const cases = await quarantineStore.listCases({ limit });
      corpus = cases.map((qc: any) => ({
        id: qc.quarantine_case_id,
        ws: qc.writeset,
        family_code: qc.antibody_matches?.[0]?.family_code,
        antibody_ids: (qc.antibody_matches ?? []).map((a: any) => a.antibody_id),
      }));
    } else {
      const dir = path.join(__dirname, "../fixtures/eis/writesets");
      const files = (fixture_names?.length ? fixture_names : readdirSync(dir).filter((f) => f.endsWith(".json"))).sort();

      corpus = files.map((f: string) => {
        const ws = JSON.parse(readFileSync(path.join(dir, f), "utf-8"));
        return {
          id: f,
          ws,
          antibody_ids: [],
        };
      });
    }

    const rows = await runBatchSimulation({
      corpus,
      cfg,
      antibodyLibrary,
      familyStore,
    });

    const partial = buildBatchMetrics(rows);
    const recommendations = buildBatchRecommendations(partial);

    const report = {
      ...partial,
      recommendations,
    };

    const snapshot = buildDoctrineSnapshot({
      report,
      source_mode: mode,
    });

    await doctrineSnapshotStore.add(snapshot);

    const snapshots = await doctrineSnapshotStore.list(10);
    const trends = buildDoctrineTrendReport(snapshots);
    const alerts = evaluateDoctrineAlerts({
      snapshots,
      trend: trends,
    });

    const previousAlerts = await doctrineAlertStore.list(100);
    const newIds = new Set(alerts.map((a) => a.alert_id));
    for (const prev of previousAlerts) {
      if (
        ["open", "acknowledged", "remediating"].includes(prev.status) &&
        !newIds.has(prev.alert_id)
      ) {
        const cleared = resolveAlert(prev, {
          resolved_at: new Date().toISOString(),
          resolution_type: "cleared",
          summary: "Alert condition no longer present in latest doctrine evaluation.",
        });
        await doctrineAlertStore.update(cleared);
      }
    }

    await doctrineAlertStore.replaceCurrent([
      ...alerts,
      ...(await doctrineAlertStore.list(100)).filter((a) =>
        ["resolved", "dismissed"].includes(a.status)
      ),
    ]);

    const allAlerts = await doctrineAlertStore.list(200);
    const snapshotsForEval = await doctrineSnapshotStore.list(20);

    for (const alert of allAlerts) {
      if (!alert.remediation) continue;
      const evaluation = evaluateRemediationEffectiveness({
        alert,
        snapshots: snapshotsForEval,
      });
      if (evaluation) {
        await remediationEffectivenessStore.upsert(evaluation);
      }
    }

    res.json({
      ...report,
      snapshot,
      doctrine_trends: trends,
      doctrine_alerts: alerts,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Batch policy simulation failed",
      detail: String(err?.message ?? err),
    });
  }
});

app.get("/api/eis/doctrine-snapshots", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json(await doctrineSnapshotStore.list(limit));
});

app.get("/api/eis/doctrine-trends", async (req, res) => {
  const limit = Number(req.query.limit ?? 10);
  const snapshots = await doctrineSnapshotStore.list(limit);
  res.json(buildDoctrineTrendReport(snapshots));
});

app.get("/api/eis/doctrine-alerts", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json(await doctrineAlertStore.list(limit));
});

app.post("/api/eis/doctrine-alerts/recompute", async (_req, res) => {
  const snapshots = await doctrineSnapshotStore.list(10);
  const trends = buildDoctrineTrendReport(snapshots);
  const alerts = evaluateDoctrineAlerts({
    snapshots,
    trend: trends,
  });

  await doctrineAlertStore.replaceCurrent(alerts);
  res.json({ ok: true, alerts });
});

app.post("/api/eis/doctrine-alerts/ack", async (req, res) => {
  const { alert_id, actor } = req.body ?? {};
  if (!alert_id || !actor?.id || !actor?.kind) {
    return res.status(400).json({ error: "Expected { alert_id, actor }" });
  }

  const alert = await doctrineAlertStore.get(alert_id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const updated = acknowledgeAlert(alert, actor);
  await doctrineAlertStore.update(updated);

  res.json({ ok: true, alert: updated });
});

app.post("/api/eis/doctrine-alerts/remediate", async (req, res) => {
  const { alert_id, chosen_by, action_type, summary } = req.body ?? {};
  if (!alert_id || !chosen_by?.id || !chosen_by?.kind || !action_type || !summary) {
    return res.status(400).json({
      error: "Expected { alert_id, chosen_by, action_type, summary }",
    });
  }

  const alert = await doctrineAlertStore.get(alert_id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const remediation = {
    remediation_id: stableId("rem", `${alert_id}:${action_type}:${Date.now()}`),
    chosen_at: new Date().toISOString(),
    chosen_by,
    action_type,
    summary,
  };

  const updated = attachRemediation(alert, remediation);
  await doctrineAlertStore.update(updated);

  res.json({ ok: true, alert: updated });
});

app.post("/api/eis/doctrine-alerts/resolve", async (req, res) => {
  const { alert_id, resolution_type, summary } = req.body ?? {};
  if (!alert_id || !resolution_type || !summary) {
    return res.status(400).json({
      error: "Expected { alert_id, resolution_type, summary }",
    });
  }

  const alert = await doctrineAlertStore.get(alert_id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const updated = resolveAlert(alert, {
    resolved_at: new Date().toISOString(),
    resolution_type,
    summary,
  });

  await doctrineAlertStore.update(updated);

  res.json({
    ok: true,
    alert: updated,
    time_open_ms: computeTimeOpenMs(updated),
  });
});

app.get("/api/eis/remediation-effectiveness", async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json(await remediationEffectivenessStore.list(limit));
});

app.get("/api/eis/remediation-effectiveness/:alert_id", async (req, res) => {
  res.json(await remediationEffectivenessStore.getByAlert(req.params.alert_id));
});

app.post("/api/eis/remediation-effectiveness/recompute", async (_req, res) => {
  const allAlerts = await doctrineAlertStore.list(200);
  const snapshots = await doctrineSnapshotStore.list(20);

  for (const alert of allAlerts) {
    if (!alert.remediation) continue;
    const evaluation = evaluateRemediationEffectiveness({ alert, snapshots });
    if (evaluation) {
      await remediationEffectivenessStore.upsert(evaluation);
    }
  }

  res.json({
    ok: true,
    evaluations: await remediationEffectivenessStore.list(200),
  });
});

app.get("/api/eis/doctrine-playbook", async (_req, res) => {
  const evals = await remediationEffectivenessStore.list(500);
  const alerts = await doctrineAlertStore.list(500);

  const alertsById = new Map(alerts.map((a) => [a.alert_id, a]));
  const rows = evals
    .map((evaluation) => {
      const sourceAlert = alertsById.get(evaluation.alert_id);
      if (!sourceAlert || !sourceAlert.remediation) return null;
      return { evaluation, alert: sourceAlert };
    })
    .filter(Boolean) as Array<any>;

  const stats = buildPlaybookStats(rows);
  const ranked = rankPlaybook(stats);
  const insights = derivePlaybookInsights(stats);

  res.json({
    generated_at: new Date().toISOString(),
    total_evaluations: evals.length,
    stats,
    top_interventions: ranked.top_interventions,
    weakest_interventions: ranked.weakest_interventions,
    insights,
  });
});

app.get("/api/eis/doctrine-alerts/:alert_id/recommendations", async (req, res) => {
  const alert = await doctrineAlertStore.get(req.params.alert_id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const evals = await remediationEffectivenessStore.list(500);
  const alerts = await doctrineAlertStore.list(500);

  const alertsById = new Map(alerts.map((a) => [a.alert_id, a]));
  const rows = evals
    .map((evaluation) => {
      const sourceAlert = alertsById.get(evaluation.alert_id);
      if (!sourceAlert || !sourceAlert.remediation) return null;
      return { evaluation, alert: sourceAlert };
    })
    .filter(Boolean) as Array<any>;

  const stats = buildPlaybookStats(rows);
  const response = serveAlertRecommendations({
    alert,
    stats,
  });

  res.json(response);
});

app.post("/api/eis/doctrine-alerts/accept-recommendation", async (req, res) => {
  const { alert_id, recommendation, actor } = req.body ?? {};

  if (!alert_id || !recommendation || !actor?.id || !actor?.kind) {
    return res.status(400).json({ error: "Expected { alert_id, recommendation, actor }" });
  }

  const alert = await doctrineAlertStore.get(alert_id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const remediation = buildAdvisorAcceptedRemediation(alert_id, recommendation, actor);
  const updated = attachRemediation(alert, remediation);

  await doctrineAlertStore.update(updated);

  res.json({ ok: true, alert: updated });
});


const port = Number(process.env.PORT ?? 4317);
app.listen(port, () => {
  console.log(`EIS dev server on http://localhost:${port}`);
  console.log(`SSE stream: GET /api/eis/stream`);
  console.log(`Ingest fixtures: POST /api/eis/ingest-fixtures`);
});
