import { useState } from 'react';
import { Nav } from './components/Nav';
import { Dashboard } from './pages/Dashboard';
import { PromptSearch } from './pages/PromptSearch';
import { ArtifactBrowser } from './pages/ArtifactBrowser';
import { GoNoGo } from './pages/GoNoGo';
import './styles/app.css';

type Page = 'dashboard' | 'prompts' | 'artifacts' | 'release';

function getInitialPage(): Page {
  const hash = window.location.hash.replace('#', '') as Page;
  return ['dashboard', 'prompts', 'artifacts', 'release'].includes(hash) ? hash : 'dashboard';
}

export function App() {
  const [page, setPage] = useState<Page>(getInitialPage);

  const navigate = (p: string) => {
    setPage(p as Page);
    window.location.hash = p;
  };

  return (
    <div className="app">
      <Nav page={page} onNavigate={navigate} />
      <main className="main" id="main-content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'prompts'   && <PromptSearch />}
        {page === 'artifacts' && <ArtifactBrowser />}
        {page === 'release'   && <GoNoGo />}
      </main>
    </div>
  );
}
