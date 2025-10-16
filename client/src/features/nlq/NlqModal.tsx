import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { PREVIEW_NL_QUERY } from '../../graphql/nlq.gql.js';

interface NLPreview {
  cypher: string;
  estimatedRows?: number | null;
  estimatedCost?: number | null;
  warnings: string[];
  diffVsManual?: unknown;
}

export function NlqModal() {
  const [nl, setNl] = useState('');
  const [manual, setManual] = useState('');
  const [cypher, setCypher] = useState('');
  const [rows, setRows] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [diff, setDiff] = useState<any | null>(null);
  const [tenantId, setTenantId] = useState<string>('default');

  const [preview, { loading, error }] = useMutation(PREVIEW_NL_QUERY);

  const handlePreview = async () => {
    try {
      const { data } = await preview({
        variables: { prompt: nl, tenantId, manualCypher: manual || null },
      });
      const p: NLPreview | undefined = data?.previewNLQuery;
      if (!p) return;
      setCypher(p.cypher || '');
      setRows(p.estimatedRows ?? null);
      setCost(p.estimatedCost ?? null);
      setWarnings(p.warnings || []);
      setDiff(p.diffVsManual ?? null);
    } catch (e) {
      // Errors are shown minimally in UI; keep state as-is
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          aria-label="tenant-id"
          placeholder="tenantId"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        />
      </div>
      <textarea
        aria-label="nl-input"
        placeholder="Ask a graph question..."
        value={nl}
        onChange={(e) => setNl(e.target.value)}
      />
      <div style={{ marginTop: 8 }}>
        <textarea
          aria-label="manual-cypher"
          placeholder="Optional: manual Cypher for diff"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={handlePreview} disabled={loading}>
          Preview
        </button>
        <button onClick={handlePreview} disabled={loading || !cypher}>
          Run in Sandbox
        </button>
      </div>
      {cypher && (
        <div>
          <pre aria-label="cypher-output">{cypher}</pre>
          <p aria-label="cost-display">
            Rows: {rows ?? '–'} Cost: {cost ?? '–'}
          </p>
          {warnings?.length ? (
            <div aria-label="warnings">
              <strong>Warnings:</strong>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {diff ? (
            <details>
              <summary>Diff vs Manual</summary>
              <pre>{JSON.stringify(diff, null, 2)}</pre>
            </details>
          ) : null}
          {error ? (
            <p style={{ color: 'crimson' }}>Error: {(error as any)?.message}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
