import React from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { DashboardPage } from './pages/Dashboard';
import { PipelinesPage } from './pages/Pipelines';
import { PipelineDetailPage } from './pages/PipelineDetail';
import { RunViewPage } from './pages/RunView';
import { ReleasesPage } from './pages/Releases';
import { ObservabilityPage } from './pages/Observability';
import { AdminPage } from './pages/Admin';
import { CommandPalette } from './components/CommandPalette';
import { RightRail } from './components/RightRail';
import { ReasonForAccessProvider } from './ReasonForAccessContext';
import {
  useKeyboardShortcuts,
  useNavigationShortcuts,
} from './hooks/useMaestroHooks';

const navItems = [
  { to: 'dashboard', label: 'Dashboard', view: 'dashboard' },
  { to: 'pipelines', label: 'Pipelines', view: 'pipelines' },
  { to: 'runs/run-1', label: 'Builds', view: 'runs' },
  { to: 'releases', label: 'Releases', view: 'releases' },
  { to: 'observability', label: 'Observability', view: 'observability' },
  { to: 'admin', label: 'Admin', view: 'admin' },
];

function useBasePath() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  if (
    [
      'dashboard',
      'pipelines',
      'runs',
      'releases',
      'observability',
      'admin',
    ].includes(segments[0])
  ) {
    return '/';
  }
  return `/${segments[0]}/`;
}

function GlobalBar({
  onOpenPalette,
  basePath,
}: {
  onOpenPalette: () => void;
  basePath: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 py-3 text-sm text-slate-200">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-emerald-300"
        >
          Maestro Conductor
        </button>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
          aria-label="Tenant switcher"
        >
          <option>Tenant: Aurora Labs</option>
          <option>Tenant: Acme Co</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400"
        >
          ⌘K Command
        </button>
        <button
          type="button"
          onClick={() => navigate(`${basePath}runs/run-1`)}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400"
        >
          Alerts (2)
        </button>
        <div
          className="h-8 w-8 rounded-full border border-emerald-400/50 bg-emerald-500/20"
          aria-label="Presence"
        />
      </div>
    </header>
  );
}

function LeftNav({ basePath }: { basePath: string }) {
  return (
    <nav className="hidden w-60 shrink-0 border-r border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200 lg:block">
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={`${basePath}${item.to}`}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-4 py-2 transition ${isActive ? 'bg-emerald-500 text-slate-950' : 'hover:bg-slate-800/70'}`
              }
              end={item.to === 'dashboard'}
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-400">
                {item.view === 'runs' ? 'g r' : ''}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function useViewKey() {
  const location = useLocation();
  if (location.pathname.includes('pipelines')) return 'pipelines';
  if (location.pathname.includes('runs')) return 'runs';
  if (location.pathname.includes('releases')) return 'releases';
  if (location.pathname.includes('observability')) return 'observability';
  if (location.pathname.includes('admin')) return 'admin';
  return 'dashboard';
}

export function MaestroApp() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const view = useViewKey();
  const basePath = useBasePath();
  useNavigationShortcuts(basePath);
  useKeyboardShortcuts([
    { combo: 'ctrl+k', handler: () => setPaletteOpen(true) },
  ]);

  return (
    <ReasonForAccessProvider>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <GlobalBar
          onOpenPalette={() => setPaletteOpen(true)}
          basePath={basePath}
        />
        <div className="flex min-h-[calc(100vh-56px)]">
          <LeftNav basePath={basePath} />
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pipelines" element={<PipelinesPage />} />
              <Route
                path="pipelines/:pipelineId"
                element={<PipelineDetailPage />}
              />
              <Route path="runs/:runId" element={<RunViewPage />} />
              <Route path="releases" element={<ReleasesPage />} />
              <Route path="observability" element={<ObservabilityPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </main>
          <RightRail view={view} />
        </div>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          basePath={basePath}
        />
      </div>
    </ReasonForAccessProvider>
  );
}

export default MaestroApp;
