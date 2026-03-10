export async function ingestFixtures() {
  const r = await fetch("/api/eis/ingest-fixtures", { method: "POST" });
  if (!r.ok) throw new Error(`ingestFixtures failed: ${r.status}`);
  return r.json();
}

export async function listQuarantineCases() {
  const r = await fetch("/api/eis/quarantine");
  if (!r.ok) throw new Error(`listQuarantineCases failed: ${r.status}`);
  return r.json();
}

export async function listAntibodies() {
  const r = await fetch("/api/eis/antibodies");
  if (!r.ok) throw new Error(`listAntibodies failed: ${r.status}`);
  return r.json();
}

export async function resolveQuarantineCase(input: {
  quarantine_case_id: string;
  resolution: "allow" | "reject";
  note?: string;
}) {
  const r = await fetch("/api/eis/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`resolveQuarantineCase failed: ${r.status}`);
  return r.json();
}

export function subscribeImmuneEvents(
  handlers: Partial<Record<
    "quarantine.created" | "quarantine.resolved" | "antibody.learned",
    (payload: any) => void
  >>
) {
  const es = new EventSource("/api/eis/stream");

  for (const [event, handler] of Object.entries(handlers)) {
    if (!handler) continue;
    es.addEventListener(event, (ev) => {
      const msg = ev as MessageEvent;
      handler(JSON.parse(msg.data));
    });
  }

  return () => es.close();
}

export async function overrideQuarantineCase(input: {
  quarantine_case_id: string;
  justification: {
    basis:
      | "new_independent_evidence"
      | "source_reliability_review"
      | "contextual_misclassification"
      | "known_benign_pattern"
      | "analyst_judgment";
    summary: string;
    evidence_refs?: Array<{ kind: "evidence" | "claim" | "source" | "note"; id: string }>;
    differentiators?: string[];
    reviewer: { id: string; kind: "user" | "agent" | "system" };
  };
}) {
  const r = await fetch("/api/eis/override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`overrideQuarantineCase failed: ${r.status}`);
  return r.json();
}

export async function recordOverrideOutcome(input: {
  override_id: string;
  quarantine_case_id: string;
  label: "correct" | "benign_but_noisy" | "harmful_or_false";
  summary: string;
  assessor: { id: string; kind: "user" | "agent" | "system" };
  evidence_refs?: Array<{ kind: "evidence" | "claim" | "source" | "note"; id: string }>;
}) {
  const r = await fetch("/api/eis/override-outcome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`recordOverrideOutcome failed: ${r.status}`);
  return r.json();
}

export async function listFamilies() {
  const r = await fetch("/api/eis/families");
  if (!r.ok) throw new Error(`listFamilies failed: ${r.status}`);
  return r.json();
}

export async function getGlobalPolicy() {
  const r = await fetch("/api/eis/policy/global");
  if (!r.ok) throw new Error(`getGlobalPolicy failed: ${r.status}`);
  return r.json();
}

export async function setGlobalPosture(input: {
  posture: "high_alert" | "normal" | "exploratory";
  reason?: string;
}) {
  const r = await fetch("/api/eis/policy/posture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`setGlobalPosture failed: ${r.status}`);
  return r.json();
}

export async function simulatePolicyForCase(quarantine_case_id: string) {
  const r = await fetch("/api/eis/simulate-policy-from-case", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quarantine_case_id }),
  });
  if (!r.ok) throw new Error(`simulatePolicyForCase failed: ${r.status}`);
  return r.json();
}

export async function simulatePolicyBatch(input: {
  mode: "recent_quarantines" | "fixture_corpus";
  limit?: number;
  fixture_names?: string[];
}) {
  const r = await fetch("/api/eis/simulate-policy-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`simulatePolicyBatch failed: ${r.status}`);
  return r.json();
}

export async function listDoctrineSnapshots(limit = 20) {
  const r = await fetch(`/api/eis/doctrine-snapshots?limit=${limit}`);
  if (!r.ok) throw new Error(`listDoctrineSnapshots failed: ${r.status}`);
  return r.json();
}

export async function getDoctrineTrends(limit = 10) {
  const r = await fetch(`/api/eis/doctrine-trends?limit=${limit}`);
  if (!r.ok) throw new Error(`getDoctrineTrends failed: ${r.status}`);
  return r.json();
}

export async function listDoctrineAlerts(limit = 20) {
  const r = await fetch(`/api/eis/doctrine-alerts?limit=${limit}`);
  if (!r.ok) throw new Error(`listDoctrineAlerts failed: ${r.status}`);
  return r.json();
}

export async function acknowledgeDoctrineAlert(input: {
  alert_id: string;
  actor: { id: string; kind: "user" | "agent" | "system" };
}) {
  const r = await fetch("/api/eis/doctrine-alerts/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`acknowledgeDoctrineAlert failed: ${r.status}`);
  return r.json();
}

export async function remediateDoctrineAlert(input: {
  alert_id: string;
  chosen_by: { id: string; kind: "user" | "agent" | "system" };
  action_type:
    | "tighten_family_policy"
    | "loosen_family_policy"
    | "reduce_global_bias"
    | "increase_global_bias"
    | "instance_override"
    | "collect_more_outcomes"
    | "monitor_only";
  summary: string;
}) {
  const r = await fetch("/api/eis/doctrine-alerts/remediate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`remediateDoctrineAlert failed: ${r.status}`);
  return r.json();
}

export async function resolveDoctrineAlert(input: {
  alert_id: string;
  resolution_type: "cleared" | "dismissed" | "superseded";
  summary: string;
}) {
  const r = await fetch("/api/eis/doctrine-alerts/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`resolveDoctrineAlert failed: ${r.status}`);
  return r.json();
}

export async function listRemediationEffectiveness(limit = 50) {
  const r = await fetch(`/api/eis/remediation-effectiveness?limit=${limit}`);
  if (!r.ok) throw new Error(`listRemediationEffectiveness failed: ${r.status}`);
  return r.json();
}

export async function getDoctrinePlaybook() {
  const r = await fetch("/api/eis/doctrine-playbook");
  if (!r.ok) throw new Error(`getDoctrinePlaybook failed: ${r.status}`);
  return r.json();
}

export async function getDoctrineAlertRecommendations(alert_id: string) {
  const r = await fetch(`/api/eis/doctrine-alerts/${alert_id}/recommendations`);
  if (!r.ok) throw new Error(`getDoctrineAlertRecommendations failed: ${r.status}`);
  return r.json();
}

export async function acceptDoctrineAlertRecommendation(input: {
  alert_id: string;
  recommendation: any;
  actor: { id: string; kind: "user" | "agent" | "system" };
}) {
  const r = await fetch("/api/eis/doctrine-alerts/accept-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`acceptDoctrineAlertRecommendation failed: ${r.status}`);
  return r.json();
}
