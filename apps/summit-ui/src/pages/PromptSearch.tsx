import { useState, useEffect, useCallback, useRef } from 'react';
import { searchPrompts, streamPromptSearch } from '../api';
import type { PromptEntry, Registry } from '../types';
import { Pagination } from '../components/Pagination';

const REGISTRIES: Registry[] = ['agentic-prompts', 'claude', 'jules'];
const PAGE_SIZE = 20;

export function PromptSearch() {
  const [query,    setQuery]    = useState('');
  const [registry, setRegistry] = useState<Registry | ''>('');
  const [results,  setResults]  = useState<PromptEntry[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const cancelStream = useRef<(() => void) | null>(null);

  // Debounced search
  const search = useCallback(async (q: string, reg: Registry | '', pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchPrompts(q, pg, PAGE_SIZE, reg || undefined);
      setResults(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + search on change
  useEffect(() => {
    const tid = setTimeout(() => { void search(query, registry, page); }, 250);
    return () => clearTimeout(tid);
  }, [query, registry, page, search]);

  // Stream live results (for empty query, show first N via SSE then switch to paginated)
  const handleStream = () => {
    if (cancelStream.current) { cancelStream.current(); cancelStream.current = null; }
    setResults([]);
    setTotal(0);
    setStreaming(true);
    const streamed: PromptEntry[] = [];
    cancelStream.current = streamPromptSearch(
      query,
      registry || undefined,
      (line) => {
        try {
          const entry = JSON.parse(line) as PromptEntry;
          streamed.push(entry);
          setResults([...streamed]);
          setTotal(streamed.length);
        } catch { /* skip */ }
      },
      () => { setStreaming(false); cancelStream.current = null; },
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Prompt Registry Search</h1>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="search"
          placeholder="Search prompts, docs, runbooks…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          aria-label="Search query"
          style={{ minWidth: 280 }}
        />
        <select
          value={registry}
          onChange={(e) => { setRegistry(e.target.value as Registry | ''); setPage(1); }}
          aria-label="Registry filter"
        >
          <option value="">All registries</option>
          {REGISTRIES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={handleStream} disabled={streaming} title="Stream results via SSE">
          {streaming ? <>Streaming<span className="streaming-dot" aria-hidden="true" /></> : '⚡ Stream'}
        </button>
      </div>

      {/* Registry chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Registries:</span>
        {REGISTRIES.map((r) => (
          <button
            key={r}
            className={registry === r ? 'primary' : ''}
            style={{ padding: '2px 10px', fontSize: 11 }}
            onClick={() => { setRegistry(registry === r ? '' : r); setPage(1); }}
            aria-pressed={registry === r}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Status line */}
      <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        {loading ? 'Searching…' : `${total} result${total !== 1 ? 's' : ''}${query ? ` for "${query}"` : ''}`}
        {streaming && <><span className="streaming-dot" aria-label="streaming" /> live</>}
      </div>

      {error && (
        <div className="finding finding-error" role="alert">{error}</div>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Registry</th>
                <th>Title</th>
                <th>Excerpt</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e, i) => (
                <tr key={`${e.path}-${i}`}>
                  <td>
                    <span className={`badge ${e.registry === 'claude' ? 'badge-blue' : e.registry === 'jules' ? 'badge-yellow' : 'badge-grey'}`}>
                      {e.registry}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, maxWidth: 200 }}>{e.title}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.excerpt}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{e.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">🔍</span>
          <span className="empty-text">{query ? 'No results found' : 'Start typing to search prompt registries'}</span>
        </div>
      ) : null}

      {!streaming && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      )}
    </div>
  );
}
