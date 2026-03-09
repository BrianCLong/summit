interface NavProps {
  page: string;
  onNavigate: (page: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const LINKS = [
  { id: 'dashboard',  label: '⛰ Dashboard'  },
  { id: 'prompts',    label: '🔍 Prompts'    },
  { id: 'artifacts',  label: '📦 Artifacts'  },
  { id: 'release',    label: '🚦 Go/No-Go'   },
  { id: 'backlog',    label: '📋 Backlog'    },
];

export function Nav({ page, onNavigate, theme, onToggleTheme }: NavProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <span className="nav-brand" tabIndex={0}>⛰️ Summit Code UI</span>
      <div className="nav-links">
        {LINKS.map((l) => (
          <button
            key={l.id}
            className={`nav-link${page === l.id ? ' active' : ''}`}
            onClick={() => onNavigate(l.id)}
            aria-current={page === l.id ? 'page' : undefined}
          >
            {l.label}
          </button>
        ))}
      </div>

      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="nav-link"
          style={{ marginLeft: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      )}
    </nav>
  );
}
