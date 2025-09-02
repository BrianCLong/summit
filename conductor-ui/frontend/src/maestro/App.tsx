import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import CommandPalette from './components/CommandPalette';
import RunDetail from './pages/RunDetail';
import PipelineDetail from './pages/PipelineDetail';
import Secrets from './pages/Secrets';
import RoutingStudio from './pages/RoutingStudio';
import CompareRun from './pages/CompareRun';
import { api } from './api';
import SLOPanel from './components/SLOPanel';
import ServingLaneTrends from './components/ServingLaneTrends';
import TenantObservability from './pages/TenantObservability';
import DLQSignatures from './pages/DLQSignatures';
import DLQPolicy from './pages/DLQPolicy';
import AlertCenter from './pages/AlertCenter';
import ProviderRates from './pages/ProviderRates';
import CICD from './pages/CICD';

function Shell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (metaK) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
      // Quick nav: g r, g o, g t
      if (e.key.toLowerCase() === 'g') {
        const handler = (ev: KeyboardEvent) => {
          const m = ev.key.toLowerCase();
          if (m === 'r') window.history.pushState({}, '', '/maestro/runs');
          if (m === 'o') window.history.pushState({}, '', '/maestro/observability');
          if (m === 't') window.history.pushState({}, '', '/maestro/tickets');
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler, { once: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border rounded px-2 py-1"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-indigo-600" aria-hidden />
            <div>
              <div className="text-sm font-semibold tracking-wide text-slate-700">
                Maestro builds IntelGraph
              </div>
              <div className="text-xs text-slate-500">Maestro ≠ IntelGraph — Control Plane</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              aria-label="Open command palette"
              className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              onClick={() => setPaletteOpen(true)}
            >
              ⌘K Command
            </button>
            <div className="text-xs text-slate-500">v1.0 • Dev Preview</div>
            <UserProfile />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-screen-2xl grid-cols-[250px_1fr] gap-0 px-4">
        <nav
          className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto border-r bg-white pr-3"
          aria-label="Primary"
        >
          <ul className="py-3 text-sm">
            {[
              ['/', 'Home'],
              ['/runs', 'Runs'],
              ['/pipelines', 'Pipelines'],
              ['/autonomy', 'Autonomy & Guardrails'],
              ['/recipes', 'Recipes'],
              ['/observability', 'Observability & SLOs'],
              ['/cost', 'Costs & Budgets'],
              ['/routing', 'Routing Studio'],
              ['/secrets', 'Secrets & Connections'],
              ['/tenants/observability', 'Tenant Observability'],
              ['/tenants/costs', 'Tenant Costs'],
              ['/ops/dlq/signatures', 'DLQ Signatures'],
              ['/ops/dlq/root', 'DLQ Root Causes'],
              ['/ops/dlq/sim', 'DLQ Simulator'],
              ['/alertcenter', 'Alert Center'],
              ['/providers/rates', 'Provider Rates'],
              ['/cicd', 'CI/CD & Environments'],
              ['/tickets', 'Tickets & Projects'],
              ['/admin', 'Admin Studio'],
            ].map(([href, label]) => (
              <li key={href as string}>
                <NavLink
                  to={href as string}
                  className={({ isActive }) =>
                    [
                      'block rounded px-3 py-2 hover:bg-slate-100',
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700',
                    ].join(' ')
                  }
                  end
                  aria-current={({ isActive }) => (isActive ? 'page' : undefined) as any}
                >
                  {label as string}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="px-3 pb-4 pt-2 text-[11px] text-slate-500">
            Evidence-first • Explainable • A11y AA
          </div>
        </nav>
        <main
          id="main"
          role="main"
          className="min-h-[calc(100vh-57px)] overflow-x-hidden bg-slate-50 p-4"
        >
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Card({
  title,
  children,
  footer,
}: {
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-2 text-sm font-semibold text-slate-700">{title}</div>
      <div className="px-4 py-3">{children}</div>
      {footer && (
        <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">{footer}</div>
      )}
    </section>
  );
}

function Home() {
  const { useSummary } = api();
  const { data } = useSummary();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Autonomy">
        <div className="flex items-center gap-4">
          <div
            className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
            aria-hidden
          />
          <div>
            <div className="text-sm text-slate-600">Current Level</div>
            <div className="text-2xl font-semibold">L{data?.autonomy?.level ?? 0}</div>
            <div className="text-xs text-slate-500">
              Canary: {Math.round((data?.autonomy?.canary ?? 0) * 100)}%
            </div>
          </div>
        </div>
      </Card>
      <Card title="Health & SLOs">
        <ul className="text-sm text-slate-700">
          <li>
            Success rate:{' '}
            <span className="font-semibold">{Math.round((data?.health?.success ?? 0) * 100)}%</span>
          </li>
          <li>
            P95 latency: <span className="font-semibold">{data?.health?.p95 ?? '—'} ms</span>
          </li>
          <li>
            Burn rate: <span className="font-semibold">{data?.health?.burn ?? '—'}×</span>
          </li>
        </ul>
      </Card>
      <Card title="Budgets">
        <ul className="text-sm text-slate-700">
          <li>
            Remaining: <span className="font-semibold">${data?.budgets?.remaining ?? 0}</span>
          </li>
          <li>
            Hard cap: <span className="font-semibold">${data?.budgets?.cap ?? 0}</span>
          </li>
        </ul>
      </Card>

      <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Live Runs">
          <div className="text-sm text-slate-600">
            {data?.runs?.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-b py-2 last:border-0"
              >
                <span className="font-mono text-xs">{r.id}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Pending Approvals">
          <div className="text-sm text-slate-600">{data?.approvals?.length || 0} items</div>
        </Card>
      </div>

      <Card title="Recent Changes" footer="Provenance and diffs are recorded for each change.">
        <div className="text-sm text-slate-600">
          {data?.changes?.slice(0, 6).map((c, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] gap-3 border-b py-2 last:border-0">
              <span className="font-mono text-xs text-slate-500">{c.at}</span>
              <div>
                <div className="text-slate-800">{c.title}</div>
                <div className="text-xs text-slate-500">{c.by}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Runs() {
  const { useRuns } = api();
  const { data, refetch } = useRuns();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Runs</h2>
        <button className="rounded bg-indigo-600 px-3 py-1.5 text-white" onClick={() => refetch()}>
          Refresh
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Run ID</th>
              <th className="px-3 py-2 font-medium">Pipeline</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link className="text-indigo-700 hover:underline" to={`/maestro/runs/${r.id}`}>
                    {r.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.pipeline}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
                </td>
                <td className="px-3 py-2">{r.durationMs} ms</td>
                <td className="px-3 py-2">${r.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pipelines() {
  const { usePipelines } = api();
  const { data } = usePipelines();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pipelines</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data?.map((p) => (
          <Card key={p.id} title={p.name}>
            <div className="text-sm text-slate-600">Version {p.version}</div>
            <div className="mt-2 text-xs text-slate-500">Owner: {p.owner}</div>
            <div className="mt-3 text-xs">
              <Link className="text-indigo-700 hover:underline" to={`/maestro/pipelines/${p.id}`}>
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Autonomy() {
  const { useAutonomy, patchAutonomy } = api();
  const { data, setLevel } = useAutonomy();
  const [decision, setDecision] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const levels = [0, 1, 2, 3, 4, 5];
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Autonomy & Guardrails</h2>
      <Card title="Level">
        <div className="flex items-center gap-2">
          {levels.map((l) => (
            <button
              key={l}
              onClick={async () => {
                setLevel(l);
                setError(null);
                try {
                  const resp = await patchAutonomy({
                    level: l,
                    canary: 0.1,
                    window: '09:00-17:00',
                    caps: { blastRadius: 0.1, cost: 200 },
                  });
                  setDecision(resp);
                } catch (e: any) {
                  setError(e?.message || 'Autonomy update failed');
                }
              }}
              className={[
                'rounded px-3 py-1.5 text-sm',
                data?.level === l
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              L{l}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Policies">
        <ul className="text-sm text-slate-700">
          {data?.policies?.map((p, i) => (
            <li key={i} className="flex items-center justify-between border-b py-2 last:border-0">
              <span>{p.title}</span>
              <span className="text-xs text-slate-500">{p.state}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Simulation" footer="Preview impact; risk bands and SLO deltas shown here.">
        {error && <div className="mb-2 text-sm text-red-700">{error}</div>}
        {!decision && (
          <div className="text-sm text-slate-600">
            Simulation preview coming from backend policy engine…
          </div>
        )}
        {decision && (
          <div className="space-y-2 text-sm">
            <div>
              Decision:{' '}
              <span className="font-semibold">
                {decision?.decision?.allowed ? 'Allow' : 'Deny'}
              </span>
            </div>
            {decision?.decision?.gates?.length > 0 && (
              <div>
                Gates: <span className="text-xs">{decision.decision.gates.join(', ')}</span>
              </div>
            )}
            {Array.isArray(decision?.decision?.reasons) && decision.decision.reasons.length > 0 && (
              <div>
                Reasons:
                <ul className="list-disc pl-5">
                  {decision.decision.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Recipes() {
  const { useRecipes } = api();
  const { data } = useRecipes();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recipe Library</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {data?.map((r) => (
          <Card key={r.id} title={r.name}>
            <div className="text-xs text-slate-500">v{r.version}</div>
            <div className="mt-2 text-sm text-slate-700">Verified: {r.verified ? 'Yes' : 'No'}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Observability() {
  const { useObservability } = api();
  const { data } = useObservability();
  const [tab, setTab] = React.useState<'Dashboards' | 'Traces' | 'Logs' | 'Alerts' | 'SLOs'>(
    'Dashboards',
  );
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Observability & SLOs</h2>
      <div className="flex gap-2 border-b">
        {(['Dashboards', 'Traces', 'Logs', 'Alerts', 'SLOs'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={[
              'rounded-t px-3 py-1.5 text-sm',
              tab === t
                ? 'bg-white font-semibold text-slate-800 border border-b-transparent'
                : 'text-slate-600 hover:bg-slate-100',
            ].join(' ')}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <Card title="Golden Signals">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <li>
            Latency p95: <span className="font-semibold">{data?.latencyP95} ms</span>
          </li>
          <li>
            Error rate: <span className="font-semibold">{data?.errorRate}%</span>
          </li>
          <li>
            Throughput: <span className="font-semibold">{data?.throughput}/min</span>
          </li>
          <li>
            Queue depth: <span className="font-semibold">{data?.queueDepth}</span>
          </li>
        </ul>
      </Card>
      <ServingLanePanel />
      <ServingLaneTrends />
      <SLOPanel />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GrafanaEmbed uidKey="overview" />
        <GrafanaEmbed uidKey="slo" />
        <GrafanaEmbed uidKey="cost" />
      </div>
      {tab !== 'SLOs' && (
        <Card title={`Open in Grafana: ${tab}`}>
          <div className="text-sm text-slate-600">
            Use the top-right SLO panel link and switch dashboards to {tab}.
          </div>
        </Card>
      )}
    </div>
  );
}

function Cost() {
  const { useCosts, getBudgets, putBudgets } = api();
  const { data } = useCosts();
  const [budget, setBudget] = React.useState<any | null>(null);
  const [cap, setCap] = React.useState<string>('');
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const b = await getBudgets();
        setBudget(b);
        setCap(String(b?.cap ?? ''));
      } catch {}
    })();
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Costs & Budgets</h2>
      <Card title="Spend">
        <div className="text-sm text-slate-700">
          Today: ${data?.today} • This week: ${data?.week}
        </div>
      </Card>
      <Card title="Budgets">
        <div className="text-sm text-slate-700">
          Utilization: {data?.utilization}% • Hard cap: ${budget?.cap ?? data?.cap}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <label className="text-slate-600" htmlFor="cap">
            Edit cap
          </label>
          <input
            id="cap"
            className="w-40 rounded border px-2 py-1"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          />
          <button
            className="rounded border px-2 py-1"
            onClick={async () => {
              try {
                const resp = await putBudgets({ cap: Number(cap) });
                setBudget(resp);
                setMsg('Saved');
                setTimeout(() => setMsg(null), 1500);
              } catch (e: any) {
                setMsg(e?.message || 'Save failed');
              }
            }}
          >
            Save
          </button>
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
        </div>
      </Card>
    </div>
  );
}

// CICD page moved to pages/CICD.tsx

function Tickets() {
  const { useTickets } = api();
  const { data } = useTickets();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Tickets / Issues / Projects</h2>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Issue</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Linked Run</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((t) => (
              <tr key={t.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.owner}</td>
                <td className="px-3 py-2">{t.runId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Admin() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Admin Studio</h2>
      <Card title="Registry">
        <div className="text-sm text-slate-600">
          Schema registry • Connectors • Feature Flags • Access (RBAC/ABAC) • Audit • Jobs
        </div>
      </Card>
    </div>
  );
}

export default function MaestroApp() {
  // memoize API facade to keep hooks stable
  useMemo(() => api(), []);
  return (
    <AuthProvider>
      <BrowserRouter basename="/maestro">
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<AuthLogin />} /> {/* Add a dedicated login route */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Shell>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/runs" element={<Runs />} />
                    <Route path="/runs/:id" element={<RunDetail />} />
                    <Route path="/runs/:id/compare" element={<CompareRun />} />
                    <Route path="/pipelines" element={<Pipelines />} />
                    <Route path="/pipelines/:id" element={<PipelineDetail />} />
                    <Route
                      path="/autonomy"
                      element={
                        <ProtectedRoute roles={['operator']}>
                          <Autonomy />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/recipes" element={<Recipes />} />
                    <Route path="/observability" element={<Observability />} />
                    <Route path="/tenants/observability" element={<TenantObservability />} />
                    <Route
                      path="/tenants/costs"
                      element={React.createElement(require('./pages/TenantCosts').default)}
                    />
                    <Route path="/cost" element={<Cost />} />
                    <Route
                      path="/routing"
                      element={
                        <ProtectedRoute roles={['operator']}>
                          <RoutingStudio />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/secrets"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <Secrets />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/ops/dlq/signatures" element={<DLQSignatures />} />
                    <Route
                      path="/ops/dlq/policy"
                      element={
                        <ProtectedRoute roles={['operator']}>
                          <DLQPolicy />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ops/dlq/root"
                      element={React.createElement(require('./pages/DLQRootCauses').default)}
                    />
                    <Route
                      path="/ops/dlq/sim"
                      element={
                        <ProtectedRoute roles={['operator']}>
                          {React.createElement(require('./pages/DLQSimulator').default)}
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/alertcenter" element={<AlertCenter />} />
                    <Route
                      path="/providers/rates"
                      element={
                        <ProtectedRoute roles={['operator']}>
                          <ProviderRates />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/cicd" element={<CICD />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Shell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function GrafanaEmbed({ uidKey }: { uidKey: 'overview' | 'slo' | 'cost' }) {
  const cfg: any = (window as any).__MAESTRO_CFG__ || {};
  const uids = cfg.grafanaDashboards || {
    overview: 'maestro-overview',
    slo: 'maestro-slo',
    cost: 'maestro-cost',
  };
  const GrafanaPanel = require('./components/GrafanaPanel').default;
  return <GrafanaPanel uid={uids[uidKey]} />;
}

function ServingLanePanel() {
  const { getServingMetrics } = api();
  const [m, setM] = React.useState<any>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getServingMetrics();
        setM(r);
      } catch {}
    })();
  }, []);
  return (
    <Card title="Serving Lane (vLLM/Ray)">
      {!m ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border p-2">
            <div className="text-xs text-slate-500">Queue depth</div>
            <div className="text-2xl font-semibold">{m.summary?.qDepth ?? '—'}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-slate-500">Batch size</div>
            <div className="text-2xl font-semibold">{m.summary?.batch ?? '—'}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-slate-500">KV hit ratio</div>
            <div className="text-2xl font-semibold">
              {Math.round((m.summary?.kvHit ?? 0) * 100)}%
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
