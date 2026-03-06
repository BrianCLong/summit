import React from "react";
import { ingestFixtures, listQuarantineCases } from "../api/eis";

type QCase = {
  quarantine_case_id: string;
  created_at: string;
  status: string;
  signals: Array<{ code: string; score: number }>;
  missing_requirements: Array<{ code: string; message: string }>;
  recommended_next_evidence: Array<{ hint: string; query?: string }>;
};

export default function EpistemicImmuneDashboard() {
  const [cases, setCases] = React.useState<QCase[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function refresh() {
    setErr(null);
    const data = await listQuarantineCases();
    setCases(data);
  }

  React.useEffect(() => { refresh(); }, []);

  async function onIngestFixtures() {
    setBusy(true);
    setErr(null);
    try {
      await ingestFixtures();
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Epistemic Immune Dashboard</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Quarantine cases are “knowledge infections” contained before they can pollute RG/BG/NG.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={onIngestFixtures} disabled={busy}>
          {busy ? "Ingesting…" : "Ingest fixtures"}
        </button>
        <button onClick={refresh} disabled={busy}>Refresh</button>
        {err && <span style={{ color: "crimson" }}>{err}</span>}
      </div>

      {cases.length === 0 ? (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          No open quarantines.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {cases.map((c) => (
            <div key={c.quarantine_case_id} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{c.quarantine_case_id}</strong>
                <span style={{ opacity: 0.7 }}>{new Date(c.created_at).toLocaleString()}</span>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Signals</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.signals.map((s, i) => (
                    <li key={i}>
                      <code>{s.code}</code> — score {s.score.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              {c.missing_requirements?.length ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Missing requirements</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {c.missing_requirements.map((m, i) => <li key={i}><code>{m.code}</code>: {m.message}</li>)}
                  </ul>
                </div>
              ) : null}

              {c.recommended_next_evidence?.length ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Recommended next evidence</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {c.recommended_next_evidence.map((r, i) => <li key={i}>{r.hint}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
