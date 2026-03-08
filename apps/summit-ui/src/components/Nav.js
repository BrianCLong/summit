"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = Nav;
const LINKS = [
    { id: 'dashboard', label: '⛰ Dashboard' },
    { id: 'prompts', label: '🔍 Prompts' },
    { id: 'artifacts', label: '📦 Artifacts' },
    { id: 'release', label: '🚦 Go/No-Go' },
];
function Nav({ page, onNavigate }) {
    return (<nav className="nav" role="navigation" aria-label="Main navigation">
      <span className="nav-brand">⛰️ Summit Code UI</span>
      <div className="nav-links">
        {LINKS.map((l) => (<button key={l.id} className={`nav-link${page === l.id ? ' active' : ''}`} onClick={() => onNavigate(l.id)} aria-current={page === l.id ? 'page' : undefined}>
            {l.label}
          </button>))}
      </div>
    </nav>);
}
