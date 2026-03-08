"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pagination = Pagination;
function Pagination({ page, pageSize, total, onPage }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1)
        return null;
    const window = 2;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= window) {
            pages.push(i);
        }
        else if (pages[pages.length - 1] !== '…') {
            pages.push('…');
        }
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (<div className="pagination" role="navigation" aria-label="Pagination">
      <span className="pagination-info">{start}–{end} of {total}</span>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
      {pages.map((p, i) => p === '…'
            ? <span key={`ellipsis-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
            : (<button key={p} onClick={() => onPage(p)} className={p === page ? 'primary' : ''} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}>
              {p}
            </button>))}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
    </div>);
}
