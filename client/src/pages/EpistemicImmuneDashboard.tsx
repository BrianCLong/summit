import React from 'react';

type SignalEntry = { code: string; score: number; detail?: Record<string, unknown> };
type MissingReq = { code: string; message: string };
type NextEvidence = { hint: string; query?: string };
type ArtifactRef = { kind: string; id: string };

type QuarantineCase = {
  quarantine_case_id: string;
  created_at: string;
  status: string;
  signals: SignalEntry[];
  missing_requirements: MissingReq[];
  recommended_next_evidence: NextEvidence[];
  affected_artifacts: ArtifactRef[];
};

async function ingestFixtures(): Promise<unknown> {
  const r = await fetch('/api/eis/ingest-fixtures', { method: 'POST' });
  if (!r.ok) throw new Error(`ingestFixtures failed: ${r.status}`);
  return r.json();
}

async function listQuarantineCases(): Promise<QuarantineCase[]> {
  const r = await fetch('/api/eis/quarantine');
  if (!r.ok) throw new Error(`listQuarantineCases failed: ${r.status}`);
  return r.json();
}

function SignalBadge({ signal }: { signal: SignalEntry }) {
  const color = signal.score >= 0.8 ? '#c62828' : signal.score >= 0.4 ? '#e65100' : '#1565c0';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: color + '18',
        border: `1px solid ${color}40`,
        color,
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 12,
        fontFamily: 'monospace',
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      {signal.code}
      <span style={{ opacity: 0.7 }}>{(signal.score * 100).toFixed(0)}%</span>
    </span>
  );
}

function CaseCard({ c }: { c: QuarantineCase }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        border: '1px solid #e0e0e0',
        borderRadius: 10,
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <code style={{ fontSize: 12, color: '#555' }}>{c.quarantine_case_id}</code>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          {new Date(c.created_at).toLocaleString()}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 4 }}>
          Signals
        </div>
        <div>
          {c.signals.map((s, i) => (
            <SignalBadge key={i} signal={s} />
          ))}
        </div>
      </div>

      {c.missing_requirements?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 4 }}>
            Missing requirements
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {c.missing_requirements.map((m, i) => (
              <li key={i}>
                <code>{m.code}</code>: {m.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.recommended_next_evidence?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 4 }}>
            Recommended next evidence
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {c.recommended_next_evidence.map((r, i) => (
              <li key={i}>{r.hint}</li>
            ))}
          </ul>
        </div>
      )}

      {c.affected_artifacts?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 4 }}>
            Affected artifacts
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.affected_artifacts.map((a, i) => (
              <span key={i} style={{ fontSize: 11, background: '#f5f5f5', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace' }}>
                {a.kind}/{a.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EpistemicImmuneDashboard() {
  const [cases, setCases] = React.useState<QuarantineCase[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function refresh() {
    setErr(null);
    try {
      const data = await listQuarantineCases();
      setCases(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  React.useEffect(() => { void refresh(); }, []);

  async function onIngestFixtures() {
    setBusy(true);
    setErr(null);
    try {
      await ingestFixtures();
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const openCases = cases.filter((c) => c.status === 'open');

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Epistemic Immune Dashboard
      </h1>
      <p style={{ margin: '0 0 20px', color: '#666', lineHeight: 1.5 }}>
        Quarantine cases are knowledge writes intercepted by the EIS before they could
        pollute the Reality Graph (RG), Belief Graph (BG), or Narrative Graph (NG).
        Resolve each case by adding corroborating evidence or rejecting the write.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={onIngestFixtures}
          disabled={busy}
          style={{
            padding: '8px 16px',
            background: busy ? '#ccc' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: busy ? 'default' : 'pointer',
            fontSize: 14,
          }}
        >
          {busy ? 'Ingesting…' : 'Ingest fixtures'}
        </button>
        <button
          onClick={refresh}
          disabled={busy}
          style={{
            padding: '8px 16px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Refresh
        </button>
        {err && (
          <span style={{ color: 'crimson', fontSize: 13 }}>{err}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>
          {openCases.length} open {openCases.length === 1 ? 'case' : 'cases'}
        </span>
      </div>

      {openCases.length === 0 ? (
        <div
          style={{
            padding: 20,
            border: '1px dashed #ccc',
            borderRadius: 10,
            color: '#888',
            textAlign: 'center',
          }}
        >
          No open quarantine cases. The epistemic graph is clean.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {openCases.map((c) => (
            <CaseCard key={c.quarantine_case_id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
