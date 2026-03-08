"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroApp = MaestroApp;
// @ts-nocheck - React 18/19 type compatibility with react-router-dom
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const Dashboard_1 = require("./pages/Dashboard");
const Pipelines_1 = require("./pages/Pipelines");
const PipelineDetail_1 = require("./pages/PipelineDetail");
const RunView_1 = require("./pages/RunView");
const Releases_1 = require("./pages/Releases");
const Observability_1 = require("./pages/Observability");
const Admin_1 = require("./pages/Admin");
const CommandPalette_1 = require("./components/CommandPalette");
const RightRail_1 = require("./components/RightRail");
const ReasonForAccessContext_1 = require("./ReasonForAccessContext");
const useMaestroHooks_1 = require("./hooks/useMaestroHooks");
const navItems = [
    { to: 'dashboard', label: 'Dashboard', view: 'dashboard' },
    { to: 'pipelines', label: 'Pipelines', view: 'pipelines' },
    { to: 'runs/run-1', label: 'Builds', view: 'runs' },
    { to: 'releases', label: 'Releases', view: 'releases' },
    { to: 'observability', label: 'Observability', view: 'observability' },
    { to: 'admin', label: 'Admin', view: 'admin' },
];
function useBasePath() {
    const location = (0, react_router_dom_1.useLocation)();
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0)
        return '/';
    if ([
        'dashboard',
        'pipelines',
        'runs',
        'releases',
        'observability',
        'admin',
    ].includes(segments[0])) {
        return '/';
    }
    return `/${segments[0]}/`;
}
function GlobalBar({ onOpenPalette, basePath, }) {
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 py-3 text-sm text-slate-200">
      <div className="flex items-center gap-4">
        <button type="button" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-emerald-300">
          Maestro Conductor
        </button>
        <select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200" aria-label="Tenant switcher">
          <option>Tenant: Aurora Labs</option>
          <option>Tenant: Acme Co</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpenPalette} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400">
          ⌘K Command
        </button>
        <button type="button" onClick={() => navigate(`${basePath}runs/run-1`)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400">
          Alerts (2)
        </button>
        <div className="h-8 w-8 rounded-full border border-emerald-400/50 bg-emerald-500/20" aria-label="Presence"/>
      </div>
    </header>);
}
function LeftNav({ basePath }) {
    return (<nav className="hidden w-60 shrink-0 border-r border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200 lg:block">
      <ul className="space-y-2">
        {navItems.map((item) => (<li key={item.to}>
            <react_router_dom_1.NavLink to={`${basePath}${item.to}`} className={({ isActive }) => `flex items-center justify-between rounded-xl px-4 py-2 transition ${isActive ? 'bg-emerald-500 text-slate-950' : 'hover:bg-slate-800/70'}`} end={item.to === 'dashboard'}>
              <span>{item.label}</span>
              <span className="text-xs text-slate-400">
                {item.view === 'runs' ? 'g r' : ''}
              </span>
            </react_router_dom_1.NavLink>
          </li>))}
      </ul>
    </nav>);
}
function useViewKey() {
    const location = (0, react_router_dom_1.useLocation)();
    if (location.pathname.includes('pipelines'))
        return 'pipelines';
    if (location.pathname.includes('runs'))
        return 'runs';
    if (location.pathname.includes('releases'))
        return 'releases';
    if (location.pathname.includes('observability'))
        return 'observability';
    if (location.pathname.includes('admin'))
        return 'admin';
    return 'dashboard';
}
function MaestroApp() {
    const [paletteOpen, setPaletteOpen] = react_1.default.useState(false);
    const view = useViewKey();
    const basePath = useBasePath();
    (0, useMaestroHooks_1.useNavigationShortcuts)(basePath);
    (0, useMaestroHooks_1.useKeyboardShortcuts)([
        { combo: 'ctrl+k', handler: () => setPaletteOpen(true) },
    ]);
    return (<ReasonForAccessContext_1.ReasonForAccessProvider>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <GlobalBar onOpenPalette={() => setPaletteOpen(true)} basePath={basePath}/>
        <div className="flex min-h-[calc(100vh-56px)]">
          <LeftNav basePath={basePath}/>
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <react_router_dom_1.Routes>
              <react_router_dom_1.Route index element={<Dashboard_1.DashboardPage />}/>
              <react_router_dom_1.Route path="dashboard" element={<Dashboard_1.DashboardPage />}/>
              <react_router_dom_1.Route path="pipelines" element={<Pipelines_1.PipelinesPage />}/>
              <react_router_dom_1.Route path="pipelines/:pipelineId" element={<PipelineDetail_1.PipelineDetailPage />}/>
              <react_router_dom_1.Route path="runs/:runId" element={<RunView_1.RunViewPage />}/>
              <react_router_dom_1.Route path="releases" element={<Releases_1.ReleasesPage />}/>
              <react_router_dom_1.Route path="observability" element={<Observability_1.ObservabilityPage />}/>
              <react_router_dom_1.Route path="admin" element={<Admin_1.AdminPage />}/>
              <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="dashboard" replace/>}/>
            </react_router_dom_1.Routes>
          </main>
          <RightRail_1.RightRail view={view}/>
        </div>
        <CommandPalette_1.CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} basePath={basePath}/>
      </div>
    </ReasonForAccessContext_1.ReasonForAccessProvider>);
}
exports.default = MaestroApp;
