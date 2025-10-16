import React from 'react';

type Preview = {
  depth: number;
  fieldCount: number;
  estExecutionMs: number;
  estCostUSD: number;
  budgetSuggestion: { timeMs: number; costUSD: number; notes: string[] };
};

export default function CostPreviewPanel() {
  const [operation, setOperation] = React.useState<string>(
    'query { me { id name } }',
  );
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch('/api/graphql/cost-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setPreview(json.preview as Preview);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (import.meta?.env?.VITE_COST_PREVIEW !== '1') return null;

  return (
    <div
      style={{
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Query Cost Preview</div>
      <textarea
        value={operation}
        onChange={(e) => setOperation(e.target.value)}
        rows={6}
        style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: 8,
        }}
        aria-label="GraphQL operation"
      />
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={run} disabled={loading} aria-busy={loading}>
          {loading ? 'Estimating…' : 'Estimate'}
        </button>
        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
      {preview && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <div>Depth: {preview.depth}</div>
          <div>Fields: {preview.fieldCount}</div>
          <div>Est Exec: {preview.estExecutionMs} ms</div>
          <div>Est Cost: ${preview.estCostUSD.toFixed(6)}</div>
          <div style={{ marginTop: 6 }}>
            <strong>Budget Suggestion</strong>
            <div>Time: {preview.budgetSuggestion.timeMs} ms</div>
            <div>Cost: ${preview.budgetSuggestion.costUSD.toFixed(6)}</div>
            <ul>
              {preview.budgetSuggestion.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
