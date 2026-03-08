"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoNoGo = GoNoGo;
const react_1 = require("react");
const api_1 = require("../api");
const StatusBadge_1 = require("../components/StatusBadge");
function ProvenancePanel({ p }) {
    return (<div className="card">
      <div className="card-title">Provenance</div>
      <table>
        <tbody>
          <tr><td style={{ color: 'var(--text-muted)', width: 160 }}>Latest tag</td><td>{p.latestTag ?? <span style={{ color: 'var(--text-muted)' }}>none</span>}</td></tr>
          <tr><td style={{ color: 'var(--text-muted)' }}>Commit</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.latestCommit.slice(0, 12)}</td></tr>
          <tr><td style={{ color: 'var(--text-muted)' }}>Message</td><td>{p.commitMessage}</td></tr>
          <tr><td style={{ color: 'var(--text-muted)' }}>Author</td><td>{p.author}</td></tr>
          <tr><td style={{ color: 'var(--text-muted)' }}>Date</td><td>{p.date}</td></tr>
          <tr>
            <td style={{ color: 'var(--text-muted)' }}>Signed commits</td>
            <td>
              <span style={{ color: p.signedCommits > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                {p.signedCommits} of last 50
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>);
}
function EvidencePanel({ checks }) {
    return (<div className="card">
      <div className="card-title">Evidence bundle</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((c) => (<div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(48,54,61,.4)', fontSize: 12 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden="true">{c.present ? '✅' : '❌'}</span>
            <span style={{ flex: 1 }}>{c.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, maxWidth: 260, textAlign: 'right' }}>{c.details}</span>
          </div>))}
      </div>
    </div>);
}
function SbomPanel({ sbom }) {
    if (sbom.length === 0) {
        return (<div className="card">
        <div className="card-title">SBOM</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No SBOM files detected. Run <code>pnpm sbom:generate</code> to produce one.</div>
      </div>);
    }
    return (<div className="card">
      <div className="card-title">SBOM artifacts</div>
      <table>
        <thead><tr><th>File</th><th>Size</th><th>Modified</th></tr></thead>
        <tbody>
          {sbom.map((s) => (<tr key={s.file}>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.file}</td>
              <td>{s.sizeBytes > 0 ? `${(s.sizeBytes / 1024).toFixed(1)} KB` : '—'}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.mtime ? new Date(s.mtime).toLocaleDateString() : '—'}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
function PolicyPanel({ policies }) {
    if (policies.length === 0) {
        return (<div className="card">
        <div className="card-title">OPA policies</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No .rego policy files found in <code>.ci/policies/</code>.</div>
      </div>);
    }
    return (<div className="card">
      <div className="card-title">OPA / policy checks</div>
      <table>
        <thead><tr><th>Policy</th><th>Result</th><th>Details</th></tr></thead>
        <tbody>
          {policies.map((p) => (<tr key={p.file}>
              <td>{p.name}</td>
              <td><StatusBadge_1.PolicyBadge result={p.result}/></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.details}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
function GoNoGo() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const refresh = () => {
        setLoading(true);
        setError(null);
        (0, api_1.getGoNoGo)()
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };
    (0, react_1.useEffect)(() => { refresh(); }, []);
    if (loading)
        return <div className="loading" role="status" aria-busy="true">Evaluating release gate…</div>;
    if (error)
        return <div className="empty"><span className="empty-icon">⚠</span><span>{error}</span></div>;
    if (!data)
        return null;
    const verdictClass = data.verdict === 'GO' ? 'verdict-go' : data.verdict === 'NO-GO' ? 'verdict-nogo' : 'verdict-pending';
    return (<div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600 }}>Release Go/No-Go</h1>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(data.generatedAt).toLocaleString()}</span>
        <button onClick={refresh} style={{ marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {/* Verdict banner */}
      <div className={`verdict ${verdictClass}`} role="status" aria-label={`Release verdict: ${data.verdict}`}>
        {data.verdict === 'GO' ? '✔ GO' : data.verdict === 'NO-GO' ? '✖ NO-GO' : '⏳ PENDING'}
      </div>

      <ProvenancePanel p={data.provenance}/>
      <PolicyPanel policies={data.policies}/>
      <SbomPanel sbom={data.sbom}/>
      <EvidencePanel checks={data.evidence}/>
    </div>);
}
