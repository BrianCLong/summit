"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactBrowser = ArtifactBrowser;
const react_1 = require("react");
const api_1 = require("../api");
const StatusBadge_1 = require("../components/StatusBadge");
const Pagination_1 = require("../components/Pagination");
const STATUSES = ['superseded', 'merged', 'quarantined', 'abandoned'];
const PAGE_SIZE = 20;
function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
function ArtifactBrowser() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [total, setTotal] = (0, react_1.useState)(0);
    const [page, setPage] = (0, react_1.useState)(1);
    const [status, setStatus] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const load = (0, react_1.useCallback)(async (pg, st) => {
        setLoading(true);
        setError(null);
        try {
            const res = await (0, api_1.listArtifacts)(pg, PAGE_SIZE, st || undefined);
            setItems(res.items);
            setTotal(res.total);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => { void load(page, status); }, [page, status, load]);
    return (<div>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>PR Artifact Browser</h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Browsing <code>.artifacts/pr/</code> — evidence-first governance records.
      </p>

      {/* Filter chips */}
      <div className="search-bar">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filter by status:</span>
        <button className={status === '' ? 'primary' : ''} style={{ fontSize: 11, padding: '2px 10px' }} onClick={() => { setStatus(''); setPage(1); }} aria-pressed={status === ''}>
          All
        </button>
        {STATUSES.map((s) => (<button key={s} className={status === s ? 'primary' : ''} style={{ fontSize: 11, padding: '2px 10px' }} onClick={() => { setStatus(s); setPage(1); }} aria-pressed={status === s}>
            {s}
          </button>))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
        {loading ? 'Loading…' : `${total} artifact${total !== 1 ? 's' : ''}${status ? ` · status: ${status}` : ''}`}
      </div>

      {error && <div className="finding finding-error" role="alert">{error}</div>}

      {!loading && items.length === 0 && !error ? (<div className="empty">
          <span className="empty-icon" aria-hidden="true">📦</span>
          <span className="empty-text">No artifacts found</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Add JSON files to <code>.artifacts/pr/</code> matching the schema
          </span>
        </div>) : (<div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
              {items.map((a) => (<tr key={`${a.pr}-${a.file}`}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>#{a.pr}</td>
                  <td><StatusBadge_1.ArtifactBadge status={a.status}/></td>
                  <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.concern}</td>
                  <td>{a.superseded_by ? <span style={{ color: 'var(--accent)' }}>#{a.superseded_by}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(a.timestamp)}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.message ?? '—'}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <Pagination_1.Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage}/>
    </div>);
}
