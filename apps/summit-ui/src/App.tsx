import { useState, useEffect } from 'react';
import { Nav } from './components/Nav';
import { Dashboard } from './pages/Dashboard';
import { PromptSearch } from './pages/PromptSearch';
import { ArtifactBrowser } from './pages/ArtifactBrowser';
import { GoNoGo } from './pages/GoNoGo';
import { TaskBacklog } from './pages/TaskBacklog';
import './styles/app.css';

type Page = 'dashboard' | 'prompts' | 'artifacts' | 'release' | 'backlog';

function getInitialPage(): Page {
  const hash = window.location.hash.replace('#', '') as Page;
  return ['dashboard', 'prompts', 'artifacts', 'release', 'backlog'].includes(hash) ? hash : 'dashboard';
}

export function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navigate = (p: string) => {
    setPage(p as Page);
    window.location.hash = p;
  };

  useEffect(() => {
    // Setup SSE for notifications
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.text) {
          setNotifications((prev) => [...prev, msg.text]);
          // Auto dismiss after 5 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter(n => n !== msg.text));
          }, 5000);
        }
      } catch (err) {
        console.error('Failed to parse notification message', err);
      }
    };

    eventSource.onerror = () => {
      console.error('Notification SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="app">
      <Nav page={page} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
      <main className="main" id="main-content" tabIndex={-1}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'prompts'   && <PromptSearch />}
        {page === 'artifacts' && <ArtifactBrowser />}
        {page === 'release'   && <GoNoGo />}
        {page === 'backlog'   && <TaskBacklog />}
      </main>

      {/* Toast Notifications */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 9999,
        }}
        role="log"
        aria-live="polite"
        >
          {notifications.map((msg, i) => (
            <div key={i} style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              padding: '12px 16px',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid var(--border)',
              fontSize: 13,
            }}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
