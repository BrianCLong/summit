"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlqModal = NlqModal;
const react_1 = require("react");
const client_1 = require("@apollo/client");
const nlq_gql_js_1 = require("../../graphql/nlq.gql.js");
function NlqModal() {
    const [nl, setNl] = (0, react_1.useState)('');
    const [manual, setManual] = (0, react_1.useState)('');
    const [cypher, setCypher] = (0, react_1.useState)('');
    const [rows, setRows] = (0, react_1.useState)(null);
    const [cost, setCost] = (0, react_1.useState)(null);
    const [warnings, setWarnings] = (0, react_1.useState)([]);
    const [diff, setDiff] = (0, react_1.useState)(null);
    const [tenantId, setTenantId] = (0, react_1.useState)('default');
    const [preview, { loading, error }] = (0, client_1.useMutation)(nlq_gql_js_1.PREVIEW_NL_QUERY);
    const handlePreview = async () => {
        try {
            const { data } = await preview({
                variables: { prompt: nl, tenantId, manualCypher: manual || null },
            });
            const p = data?.previewNLQuery;
            if (!p)
                return;
            setCypher(p.cypher || '');
            setRows(p.estimatedRows ?? null);
            setCost(p.estimatedCost ?? null);
            setWarnings(p.warnings || []);
            setDiff(p.diffVsManual ?? null);
        }
        catch (e) {
            // Errors are shown minimally in UI; keep state as-is
        }
    };
    return (<div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input aria-label="tenant-id" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)}/>
      </div>
      <textarea aria-label="nl-input" placeholder="Ask a graph question..." value={nl} onChange={(e) => setNl(e.target.value)}/>
      <div style={{ marginTop: 8 }}>
        <textarea aria-label="manual-cypher" placeholder="Optional: manual Cypher for diff" value={manual} onChange={(e) => setManual(e.target.value)}/>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={handlePreview} disabled={loading}>
          Preview
        </button>
        <button onClick={handlePreview} disabled={loading || !cypher}>
          Run in Sandbox
        </button>
      </div>
      {cypher && (<div>
          <pre aria-label="cypher-output">{cypher}</pre>
          <p aria-label="cost-display">
            Rows: {rows ?? '–'} Cost: {cost ?? '–'}
          </p>
          {warnings?.length ? (<div aria-label="warnings">
              <strong>Warnings:</strong>
              <ul>
                {warnings.map((w, i) => (<li key={i}>{w}</li>))}
              </ul>
            </div>) : null}
          {diff ? (<details>
              <summary>Diff vs Manual</summary>
              <pre>{JSON.stringify(diff, null, 2)}</pre>
            </details>) : null}
          {error ? (<p style={{ color: 'crimson' }}>Error: {error?.message}</p>) : null}
        </div>)}
    </div>);
}
