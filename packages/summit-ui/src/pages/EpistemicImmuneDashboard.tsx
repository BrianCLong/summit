import React from "react";
import {
  ingestFixtures,
  listAntibodies,
  listQuarantineCases,
  resolveQuarantineCase,
  subscribeImmuneEvents,
  overrideQuarantineCase,
  recordOverrideOutcome,
  listFamilies,
  getGlobalPolicy,
  setGlobalPosture,
  simulatePolicyForCase,
  simulatePolicyBatch,
  listDoctrineSnapshots,
  getDoctrineTrends,
  listDoctrineAlerts,
  acknowledgeDoctrineAlert,
  remediateDoctrineAlert,
  resolveDoctrineAlert,
  listRemediationEffectiveness,
  getDoctrinePlaybook,
  getDoctrineAlertRecommendations,
  acceptDoctrineAlertRecommendation,
} from "../api/eis";

type QCase = {
  quarantine_case_id: string;
  created_at: string;
  status: string;
  resolved_at?: string;
  resolution_note?: string;
  signals: Array<{ code: string; score: number }>;
  antibody_matches?: Array<{
    antibody_id: string;
    motif: string;
    score: number;
    recommended_action: string;
    detail: { matched_rules: string[]; source_quarantine_case_id: string };
  }>;
  immune_explanation?: {
    base_signal_score: number;
    antibody_boost: number;
    combined_score: number;
    quarantine_reason: string;
    matched_rules: string[];
    policy_explanation?: any;
  };
  missing_requirements: Array<{ code: string; message: string }>;
  recommended_next_evidence: Array<{ hint: string; query?: string }>;
  overrides?: Array<{
    override_id: string;
    created_at: string;
    reviewer: { id: string; kind: "user" | "agent" | "system" };
    resolution: "allow_override" | "reject";
    contradicted_immune_memory: boolean;
    contradicted_antibody_ids: string[];
    contradicted_signal_codes: string[];
    justification: {
      basis: string;
      summary: string;
      evidence_refs?: Array<{ kind: string; id: string }>;
      differentiators?: string[];
    };
    outcomes?: Array<{
      outcome_id: string;
      created_at: string;
      label: "correct" | "benign_but_noisy" | "harmful_or_false";
      assessor: { id: string; kind: "user" | "agent" | "system" };
      summary: string;
    }>;
  }>;
};

type Antibody = {
  antibody_id: string;
  created_at: string;
  source_quarantine_case_id: string;
  motif: string;
  summary: string;
  triggers: string[];
  recommended_action: string;
};

export default function EpistemicImmuneDashboard() {
  const [cases, setCases] = React.useState<QCase[]>([]);
  const [antibodies, setAntibodies] = React.useState<Antibody[]>([]);
  const [families, setFamilies] = React.useState<any[]>([]);
  const [globalPolicy, setGlobalPolicy] = React.useState<any>(null);
  const [simulations, setSimulations] = React.useState<Record<string, any>>({});
  const [batchSim, setBatchSim] = React.useState<any>(null);
  const [doctrineTrends, setDoctrineTrends] = React.useState<any>(null);
  const [doctrineSnapshots, setDoctrineSnapshots] = React.useState<any[]>([]);
  const [doctrineAlerts, setDoctrineAlerts] = React.useState<any[]>([]);
  const [remediationEffectiveness, setRemediationEffectiveness] = React.useState<any[]>([]);
  const [doctrinePlaybook, setDoctrinePlaybook] = React.useState<any>(null);
  const [alertRecommendations, setAlertRecommendations] = React.useState<Record<string, any>>({});

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [feed, setFeed] = React.useState<string[]>([]);
  const [overrideNotes, setOverrideNotes] = React.useState<Record<string, string>>({});
  const [outcomeNotes, setOutcomeNotes] = React.useState<Record<string, string>>({});

  async function refreshAll() {
    const [qc, ab, fam, gp] = await Promise.all([
      listQuarantineCases(),
      listAntibodies(),
      listFamilies(),
      getGlobalPolicy(),
    ]);
    setCases(qc);
    setAntibodies(ab);
    setFamilies(fam);
    setGlobalPolicy(gp);
  }

  async function refreshDoctrineGovernance() {
    const [trends, snaps, alerts, evals, playbook] = await Promise.all([
      getDoctrineTrends(10),
      listDoctrineSnapshots(10),
      listDoctrineAlerts(20),
      listRemediationEffectiveness(50),
      getDoctrinePlaybook(),
    ]);
    setDoctrineTrends(trends);
    setDoctrineSnapshots(snaps);
    setDoctrineAlerts(alerts);
    setRemediationEffectiveness(evals);
    setDoctrinePlaybook(playbook);
  }

  React.useEffect(() => {
    refreshAll().catch((e) => setErr(String(e?.message ?? e)));
    refreshDoctrineGovernance().catch((e) => setErr(String(e?.message ?? e)));

    const unsub = subscribeImmuneEvents({
      "quarantine.created": (payload) => {
        setFeed((f) => [
          `[quarantine.created] ${payload.quarantine_case_id}`,
          ...f,
        ].slice(0, 20));
        refreshAll().catch(() => {});
      },
      "quarantine.resolved": (payload) => {
        setFeed((f) => [
          `[quarantine.resolved] ${payload.quarantine_case_id} -> ${payload.resolution}`,
          ...f,
        ].slice(0, 20));
        refreshAll().catch(() => {});
      },
      "antibody.learned": (payload) => {
        setFeed((f) => [
          `[antibody.learned] ${payload.antibody_id} motif=${payload.motif}`,
          ...f,
        ].slice(0, 20));
        refreshAll().catch(() => {});
      },
    });

    return unsub;
  }, []);

  async function onIngestFixtures() {
    setBusy(true);
    setErr(null);
    try {
      await ingestFixtures();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onResolve(id: string, resolution: "allow" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      await resolveQuarantineCase({
        quarantine_case_id: id,
        resolution,
        note: resolution === "reject"
          ? "Rejected during analyst immune review."
          : "Allowed after analyst challenge review.",
      });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onOverride(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await overrideQuarantineCase({
        quarantine_case_id: id,
        justification: {
          basis: "analyst_judgment",
          summary: overrideNotes[id] || "Analyst override based on contextual review and differentiating factors.",
          reviewer: { id: "brian.long", kind: "user" },
          differentiators: ["Pattern resembles prior motif but differs in current operational context."],
        },
      });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onOutcome(caseId: string, overrideId: string, label: "correct" | "benign_but_noisy" | "harmful_or_false") {
    setBusy(true);
    setErr(null);
    try {
      await recordOverrideOutcome({
        override_id: overrideId,
        quarantine_case_id: caseId,
        label,
        summary: outcomeNotes[overrideId] || `Marked as ${label} based on downstream evidence.`,
        assessor: { id: "brian.long", kind: "user" },
      });
      await refreshAll();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onPostureChange(posture: "high_alert" | "normal" | "exploratory", reason: string) {
    setBusy(true);
    setErr(null);
    try {
      await setGlobalPosture({ posture, reason });
      await refreshAll();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onSimulateCase(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const sim = await simulatePolicyForCase(id);
      setSimulations((m) => ({ ...m, [id]: sim }));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onRunBatchSimulation() {
    setBusy(true);
    setErr(null);
    try {
      const report = await simulatePolicyBatch({
        mode: "recent_quarantines",
        limit: 25,
      });
      setBatchSim(report);
      await refreshDoctrineGovernance();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onRecommendAlert(alertId: string) {
    setBusy(true);
    setErr(null);
    try {
      const recs = await getDoctrineAlertRecommendations(alertId);
      setAlertRecommendations((m) => ({ ...m, [alertId]: recs }));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onAcceptRecommendation(alertId: string, recommendation: any) {
    setBusy(true);
    setErr(null);
    try {
      await acceptDoctrineAlertRecommendation({
        alert_id: alertId,
        recommendation,
        actor: { id: "brian.long", kind: "user" },
      });
      await refreshDoctrineGovernance();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const openCases = cases.filter((c) => c.status === "open");
  const resolvedCases = cases.filter((c) => c.status !== "open");

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Epistemic Immune Dashboard</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Summit immune layer: detect, quarantine, challenge, resolve, learn.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <button onClick={onIngestFixtures} disabled={busy}>
          {busy ? "Working…" : "Ingest fixtures"}
        </button>
        {err && <span style={{ color: "crimson" }}>{err}</span>}
      </div>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Global immune posture</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => onPostureChange("high_alert", "Manual escalation")}>
            High-alert
          </button>
          <button onClick={() => onPostureChange("normal", "Return to baseline")}>
            Normal
          </button>
          <button onClick={() => onPostureChange("exploratory", "Exploratory ingest mode")}>
            Exploratory
          </button>
        </div>
        {globalPolicy && (
          <div style={{ marginTop: 8, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
            <strong>{globalPolicy.posture}</strong>
            <div>{globalPolicy.reason}</div>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div>
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 18 }}>Open quarantines</h2>
            {openCases.length === 0 ? (
              <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                No open quarantines.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {openCases.map((c) => (
                  <div key={c.quarantine_case_id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{c.quarantine_case_id}</strong>
                      <span style={{ opacity: 0.7 }}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Signals</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {c.signals.map((s, i) => (
                          <li key={i}>
                            <code>{s.code}</code> — {s.score.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {c.immune_explanation && (
                      <div style={{ marginTop: 8, padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Immune explanation</div>
                        <div><code>base_signal_score</code>: {c.immune_explanation.base_signal_score.toFixed(2)}</div>
                        <div><code>antibody_boost</code>: {c.immune_explanation.antibody_boost.toFixed(2)}</div>
                        <div><code>combined_score</code>: {c.immune_explanation.combined_score.toFixed(2)}</div>
                        <div style={{ marginTop: 6 }}>{c.immune_explanation.quarantine_reason}</div>

                        {!!c.immune_explanation.matched_rules?.length && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Matched rules</div>
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {c.immune_explanation.matched_rules.map((r, i) => (
                                <li key={i}><code>{r}</code></li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {c.immune_explanation.policy_explanation && (
                          <div style={{ marginTop: 8, padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Policy explanation</div>
                            <div>{c.immune_explanation.policy_explanation.summary}</div>
                            <div style={{ marginTop: 6 }}>
                              <code>global</code>: {c.immune_explanation.policy_explanation.applied_biases.global_quarantine_bias.toFixed(2)}{" "}
                              <code>family</code>: {c.immune_explanation.policy_explanation.applied_biases.family_quarantine_bias.toFixed(2)}{" "}
                              <code>instance</code>: {c.immune_explanation.policy_explanation.applied_biases.instance_quarantine_bias.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!!c.antibody_matches?.length && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Antibody matches</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.antibody_matches.map((a, i) => (
                            <li key={i}>
                              <code>{a.motif}</code> — score {a.score.toFixed(2)} — {a.recommended_action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!c.missing_requirements?.length && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Missing requirements</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.missing_requirements.map((m, i) => (
                            <li key={i}><code>{m.code}</code>: {m.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!c.recommended_next_evidence?.length && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Recommended next evidence</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.recommended_next_evidence.map((r, i) => (
                            <li key={i}>{r.hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Manual override justification</div>
                      <textarea
                        value={overrideNotes[c.quarantine_case_id] ?? ""}
                        onChange={(e) =>
                          setOverrideNotes((m) => ({
                            ...m,
                            [c.quarantine_case_id]: e.target.value,
                          }))
                        }
                        rows={3}
                        style={{ width: "100%" }}
                        placeholder="Required justification for analyst override..."
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button disabled={busy} onClick={() => onResolve(c.quarantine_case_id, "reject")}>
                        Reject
                      </button>
                      <button disabled={busy} onClick={() => onOverride(c.quarantine_case_id)}>
                        Allow via override
                      </button>
                      <button disabled={busy} onClick={() => onSimulateCase(c.quarantine_case_id)}>
                        Simulate postures
                      </button>
                    </div>

                    {simulations[c.quarantine_case_id] && (
                      <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Policy simulation</div>

                        <div style={{ display: "grid", gap: 8 }}>
                          {simulations[c.quarantine_case_id].results.map((r: any) => (
                            <div key={r.posture} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 8 }}>
                              <strong>{r.posture}</strong>
                              <div><code>disposition</code>: {r.disposition}</div>
                              <div><code>combined_score</code>: {r.combined_score.toFixed(2)}</div>
                              <div>
                                <code>base</code>: {r.base_signal_score.toFixed(2)}{" "}
                                <code>ab</code>: {r.antibody_boost.toFixed(2)}{" "}
                                <code>family</code>: {(r.family_bias ?? 0).toFixed(2)}{" "}
                                <code>global</code>: {(r.global_bias ?? 0).toFixed(2)}{" "}
                                <code>instance</code>: {(r.instance_bias ?? 0).toFixed(2)}
                              </div>
                              <div style={{ marginTop: 4 }}>{r.quarantine_reason}</div>
                              {r.policy_summary && <div style={{ opacity: 0.8, marginTop: 4 }}>{r.policy_summary}</div>}
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 8, padding: 8, background: "#fafafa", borderRadius: 8 }}>
                          <strong>Sensitivity</strong>
                          <div>{simulations[c.quarantine_case_id].sensitivity.summary}</div>
                          <div>
                            score delta: {simulations[c.quarantine_case_id].sensitivity.score_range.delta.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 18 }}>Resolved quarantines</h2>
            {resolvedCases.length === 0 ? (
              <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                No resolved cases yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {resolvedCases.map((c) => (
                  <div key={c.quarantine_case_id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                    <strong>{c.quarantine_case_id}</strong>
                    <div style={{ opacity: 0.8 }}>
                      {c.status} {c.resolved_at ? `— ${new Date(c.resolved_at).toLocaleString()}` : ""}
                    </div>
                    {c.resolution_note && <div style={{ marginTop: 4 }}>{c.resolution_note}</div>}

                    {!!c.overrides?.length && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontWeight: 600 }}>Overrides</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.overrides.map((o, i) => (
                            <li key={i}>
                              <code>{o.resolution}</code> by {o.reviewer.id} — {o.justification.summary}

                              <div style={{ marginTop: 8, marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Record Outcome</div>
                                <textarea
                                  value={outcomeNotes[o.override_id] ?? ""}
                                  onChange={(e) =>
                                    setOutcomeNotes((m) => ({
                                      ...m,
                                      [o.override_id]: e.target.value,
                                    }))
                                  }
                                  rows={2}
                                  style={{ width: "100%", marginBottom: 4 }}
                                  placeholder="Summary of outcome evidence..."
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button disabled={busy} onClick={() => onOutcome(c.quarantine_case_id, o.override_id, "correct")}>Mark Correct</button>
                                  <button disabled={busy} onClick={() => onOutcome(c.quarantine_case_id, o.override_id, "benign_but_noisy")}>Mark Benign</button>
                                  <button disabled={busy} onClick={() => onOutcome(c.quarantine_case_id, o.override_id, "harmful_or_false")}>Mark Harmful</button>
                                </div>
                              </div>

                              {!!o.outcomes?.length && (
                                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                                  {o.outcomes.map((out, j) => (
                                    <li key={j}>
                                      <code>{out.label}</code> — {out.summary}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Immune doctrine analysis</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button disabled={busy} onClick={onRunBatchSimulation}>
                Run batch simulation
              </button>
            </div>

            {batchSim && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Posture sensitivity histogram</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {batchSim.posture_sensitivity_histogram.map((h: any) => (
                      <li key={h.bucket}>
                        <code>{h.bucket}</code>: {h.count}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Most brittle families</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {batchSim.most_brittle_families.map((f: any) => (
                      <li key={f.family_code}>
                        <code>{f.family_code}</code> — sensitivity {(f.sensitivity_rate * 100).toFixed(0)}%, avg Δ {f.avg_score_delta.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Flip-prone antibodies</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {batchSim.most_brittle_antibodies.map((a: any) => (
                      <li key={a.antibody_id}>
                        <code>{a.antibody_id}</code> — flip rate {(a.flip_rate * 100).toFixed(0)}%
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Policy cleanup recommendations</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {batchSim.recommendations.map((r: any, i: number) => (
                      <li key={i}>
                        <strong>{r.title}</strong> — {r.suggested_action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Longitudinal immune governance</h2>

            {doctrineTrends ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Posture sensitivity trend</strong>
                  <div>
                    current: {(doctrineTrends.posture_sensitivity_trend.current * 100).toFixed(1)}%
                  </div>
                  {doctrineTrends.posture_sensitivity_trend.previous != null && (
                    <div>
                      previous: {(doctrineTrends.posture_sensitivity_trend.previous * 100).toFixed(1)}%,
                      delta: {((doctrineTrends.posture_sensitivity_trend.delta ?? 0) * 100).toFixed(1)}%
                    </div>
                  )}
                  <div>direction: {doctrineTrends.posture_sensitivity_trend.direction}</div>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Brittle family movements</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {doctrineTrends.brittle_family_movements.slice(0, 5).map((f: any) => (
                      <li key={f.family_code}>
                        <code>{f.family_code}</code> — rank {f.current_rank}
                        {f.previous_rank != null ? ` (prev ${f.previous_rank})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Antibody flip trends</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {doctrineTrends.antibody_flip_trends.slice(0, 5).map((a: any) => (
                      <li key={a.antibody_id}>
                        <code>{a.antibody_id}</code> — {a.direction}
                        {a.flip_rate_delta != null ? ` (${(a.flip_rate_delta * 100).toFixed(1)}%)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Recommendation churn</strong>
                  <div>
                    churn rate: {(doctrineTrends.recommendation_churn.churn_rate * 100).toFixed(1)}%
                  </div>
                  {!!doctrineTrends.recommendation_churn.added_titles?.length && (
                    <div style={{ marginTop: 6 }}>
                      added: {doctrineTrends.recommendation_churn.added_titles.join("; ")}
                    </div>
                  )}
                  {!!doctrineTrends.recommendation_churn.removed_titles?.length && (
                    <div style={{ marginTop: 6 }}>
                      removed: {doctrineTrends.recommendation_churn.removed_titles.join("; ")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                No doctrine snapshots yet.
              </div>
            )}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Doctrine watchkeeping</h2>

            {doctrineAlerts.length === 0 ? (
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                No active doctrine alerts.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {doctrineAlerts.map((a) => (
                  <div
                    key={a.alert_id}
                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{a.title}</strong>
                      <div>
                        <code>{a.severity}</code> <code>{a.status}</code>
                      </div>
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>{a.summary}</div>
                    <div style={{ marginTop: 6 }}>
                      <code>{a.category}</code>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      Recommended action: {a.recommended_action}
                    </div>

                    {a.ack && (
                      <div style={{ marginTop: 6 }}>
                        Acknowledged by {a.ack.acknowledged_by.id} at {new Date(a.ack.acknowledged_at).toLocaleString()}
                      </div>
                    )}

                    {a.remediation && (
                      <div style={{ marginTop: 6 }}>
                        Remediation: <code>{a.remediation.action_type}</code> — {a.remediation.summary}
                      </div>
                    )}

                    {a.resolution && (
                      <div style={{ marginTop: 6 }}>
                        Resolution: <code>{a.resolution.resolution_type}</code> — {a.resolution.summary}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => acknowledgeDoctrineAlert({
                        alert_id: a.alert_id,
                        actor: { id: "brian.long", kind: "user" }
                      })}>
                        Acknowledge
                      </button>

                      <button onClick={() => remediateDoctrineAlert({
                        alert_id: a.alert_id,
                        chosen_by: { id: "brian.long", kind: "user" },
                        action_type: "monitor_only",
                        summary: "Monitoring pending next doctrine snapshot.",
                      })}>
                        Monitor
                      </button>

                      <button onClick={() => resolveDoctrineAlert({
                        alert_id: a.alert_id,
                        resolution_type: "dismissed",
                        summary: "Dismissed after operator review.",
                      })}>
                        Dismiss
                      </button>
                      <button onClick={() => onRecommendAlert(a.alert_id)}>
                        Recommend actions
                      </button>
                    </div>

                    {alertRecommendations[a.alert_id] && (
                      <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Doctrine advisor</div>
                        <div style={{ opacity: 0.8, marginBottom: 8 }}>
                          {alertRecommendations[a.alert_id].summary}
                        </div>

                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {alertRecommendations[a.alert_id].recommendations.map((r: any) => (
                            <li key={`${r.rank}-${r.action_type}`} style={{ marginBottom: 12 }}>
                              <code>{r.action_type}</code> — {r.confidence} confidence
                              <div style={{ marginTop: 2 }}>{r.rationale}</div>
                              {!!r.known_side_effects?.length && (
                                <div style={{ marginTop: 2, opacity: 0.8 }}>
                                  Side effects: {r.known_side_effects.join(", ")}
                                </div>
                              )}
                              <button style={{ marginTop: 4 }} onClick={() => onAcceptRecommendation(a.alert_id, r)}>
                                Accept recommendation
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Doctrine intervention evaluation</h2>

            {remediationEffectiveness.length === 0 ? (
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                No remediation evaluations yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {remediationEffectiveness.map((e) => (
                  <div key={e.evaluation_id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{e.alert_id}</strong>
                      <code>{e.verdict}</code>
                    </div>

                    <div style={{ marginTop: 4 }}>{e.summary}</div>

                    <div style={{ marginTop: 8 }}>
                      <div><code>score</code>: {e.score.toFixed(2)}</div>
                      {e.metrics.posture_sensitivity_delta != null && (
                        <div><code>posture_sensitivity_delta</code>: {e.metrics.posture_sensitivity_delta.toFixed(2)}</div>
                      )}
                      {e.metrics.family_rank_delta != null && (
                        <div><code>family_rank_delta</code>: {e.metrics.family_rank_delta}</div>
                      )}
                      {e.metrics.family_sensitivity_delta != null && (
                        <div><code>family_sensitivity_delta</code>: {e.metrics.family_sensitivity_delta.toFixed(2)}</div>
                      )}
                      {e.metrics.recommendation_churn_delta != null && (
                        <div><code>recommendation_churn_delta</code>: {e.metrics.recommendation_churn_delta.toFixed(2)}</div>
                      )}
                      <div><code>alert_cleared</code>: {String(e.metrics.alert_cleared)}</div>
                      <div><code>alert_recurred</code>: {String(e.metrics.alert_recurred)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Doctrine playbook</h2>

            {!doctrinePlaybook ? (
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                No playbook data yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Top interventions</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {doctrinePlaybook.top_interventions.map((x: any) => (
                      <li key={`${x.action_type}-${x.rank}`}>
                        <code>{x.action_type}</code>
                        {x.scope.target_family_code ? ` / ${x.scope.target_family_code}` : ""}
                        {x.scope.severity ? ` / ${x.scope.severity}` : ""}
                        {" — "}
                        {x.rationale}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Weakest interventions</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {doctrinePlaybook.weakest_interventions.map((x: any) => (
                      <li key={`${x.action_type}-${x.rank}`}>
                        <code>{x.action_type}</code>
                        {x.scope.target_family_code ? ` / ${x.scope.target_family_code}` : ""}
                        {x.scope.severity ? ` / ${x.scope.severity}` : ""}
                        {" — "}
                        {x.rationale}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  <strong>Playbook insights</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {doctrinePlaybook.insights.map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

        </div>

        <div>
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Immune event feed</h2>
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, minHeight: 180 }}>
              {feed.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Waiting for events…</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {feed.map((line, i) => <li key={i}><code>{line}</code></li>)}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 18 }}>Antibody library</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {antibodies.length === 0 ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  No antibodies learned yet.
                </div>
              ) : (
                antibodies.map((a) => (
                  <div key={a.antibody_id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                    <strong>{a.motif}</strong>
                    <div style={{ opacity: 0.8, marginTop: 2 }}>{a.summary}</div>
                    <div style={{ marginTop: 6 }}>
                      <code>{a.recommended_action}</code>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 18 }}>Immune families</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {families.length === 0 ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                  No family stats yet.
                </div>
              ) : (
                families.map((f) => (
                  <div key={f.family_code} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                    <strong>{f.family_code}</strong>
                    <div style={{ opacity: 0.8, marginTop: 2 }}>
                      Recommended: <code>{f.tuning.recommended_action}</code>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Cases: {f.stats.total_cases} |
                      Correct ovr: {f.stats.override_correct} |
                      Harmful ovr: {f.stats.override_harmful}
                    </div>
                    <div style={{ marginTop: 4, fontStyle: "italic", fontSize: 14 }}>
                      {f.tuning.reason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
