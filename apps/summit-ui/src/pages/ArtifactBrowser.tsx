import { useState, useEffect, useCallback } from 'react';
import { listArtifacts } from '../api';
import type { ArtifactEntry, ArtifactStatus } from '../types';
import { ArtifactBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

const STATUSES: ArtifactStatus[] = ['superseded', 'merged', 'quarantined', 'abandoned'];
const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function ArtifactBrowser() {
  const [items,   setItems]   = useState<ArtifactEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState<ArtifactStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (pg: number, st: ArtifactStatus | '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await listArtifacts(pg, PAGE_SIZE, st || undefined);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page, status); }, [page, status, load]);

  return (
    <div>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>PR Artifact Browser</h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Browsing <code>.artifacts/pr/</code> — evidence-first governance records.
      </p>

      {/* Filter chips */}
      <div className="search-bar">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filter by status:</span>
        <button
          className={status === '' ? 'primary' : ''}
          style={{ fontSize: 11, padding: '2px 10px' }}
          onClick={() => { setStatus(''); setPage(1); }}
          aria-pressed={status === ''}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={status === s ? 'primary' : ''}
            style={{ fontSize: 11, padding: '2px 10px' }}
            onClick={() => { setStatus(s); setPage(1); }}
            aria-pressed={status === s}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
        {loading ? 'Loading…' : `${total} artifact${total !== 1 ? 's' : ''}${status ? ` · status: ${status}` : ''}`}
      </div>

      {error && <div className="finding finding-error" role="alert">{error}</div>}

      {!loading && items.length === 0 && !error ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">📦</span>
          <span className="empty-text">No artifacts found</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Add JSON files to <code>.artifacts/pr/</code> matching the schema
          </span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>PR #</th>
                <th>Status</th>
                <th>Concern</th>
                <th>Superseded by</th>
                <th>Date</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={`${a.pr}-${a.file}`}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>#{a.pr}</td>
                  <td><ArtifactBadge status={a.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.concern}</td>
                  <td>{a.superseded_by ? <span style={{ color: 'var(--accent)' }}>#{a.superseded_by}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(a.timestamp)}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
