import { useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { PREVIEW_NL_QUERY, RUN_NL_GRAPH_SEARCH } from '../../graphql/nlq.gql.js';

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
  const [graphRows, setGraphRows] = useState<any[]>([]);

  const [preview, { loading, error }] = useMutation(PREVIEW_NL_QUERY);
  const [runGraphSearch, { loading: searchLoading, error: searchError }] = useLazyQuery(
    RUN_NL_GRAPH_SEARCH,
    {
      fetchPolicy: 'no-cache'
    }
  );

  const sanitizePrompt = (value: string) =>
    value.replace(/[^a-zA-Z0-9\s,\.\-_'?]/g, ' ').replace(/\s+/g, ' ').trim();

  const handlePreview = async () => {
    try {
      const { data } = await preview({
        variables: { prompt: nl, tenantId, manualCypher: manual || null },
      });
      const p: NLPreview | undefined = data?.previewNLQuery;
      if (!p) return;
      setGraphRows([]);
      setCypher(p.cypher || '');
      setRows(p.estimatedRows ?? null);
      setCost(p.estimatedCost ?? null);
      setWarnings(p.warnings || []);
      setDiff(p.diffVsManual ?? null);
    } catch (e) {
      // Errors are shown minimally in UI; keep state as-is
    }
  };

  const handleGraphSearch = async () => {
    const sanitized = sanitizePrompt(nl);
    if (!sanitized) {
      setWarnings(['Enter a valid question to run a graph search.']);
      return;
    }

    try {
      const { data } = await runGraphSearch({
        variables: {
          input: {
            prompt: sanitized,
            tenantId,
            limit: 25
          }
        }
      });

      const result = data?.naturalLanguageGraphSearch;
      if (!result) {
        return;
      }

      const warningMessages = [...(result.warnings ?? [])];
      if (sanitized !== nl.trim()) {
        warningMessages.push('Unsupported characters were removed before executing the search.');
      }

      setCypher(result.cypher || '');
      setGraphRows(result.rows ?? []);
      setWarnings(warningMessages);
      setRows(null);
      setCost(null);
      setDiff(null);
    } catch (e) {
      setWarnings(['Failed to run the graph search.']);
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
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handlePreview} disabled={loading}>
          Preview
        </button>
        <button onClick={handleGraphSearch} disabled={searchLoading}>
          Run Graph Search
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
          {graphRows.length ? (
            <div aria-label="graph-results" style={{ marginTop: 12 }}>
              <strong>Graph Results</strong>
              <pre>{JSON.stringify(graphRows, null, 2)}</pre>
            </div>
          ) : null}
          {diff ? (
            <details>
              <summary>Diff vs Manual</summary>
              <pre>{JSON.stringify(diff, null, 2)}</pre>
            </details>
          ) : null}
          {error ? <p style={{ color: 'crimson' }}>Error: {(error as any)?.message}</p> : null}
          {searchError ? (
            <p style={{ color: 'crimson' }}>Graph Search Error: {(searchError as any)?.message}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
