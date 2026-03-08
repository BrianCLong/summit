"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MaestroDashboard;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================
// Maestro UI Dashboard - Complete Web Console
// =============================================
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const utils_1 = require("@/lib/utils");
const outline_1 = require("@heroicons/react/24/outline");
const CommandPaletteContext_1 = require("../../contexts/CommandPaletteContext");
const NotificationContext_1 = require("../../contexts/NotificationContext");
// Import page components (to be created)
const Overview_1 = __importDefault(require("./pages/Overview"));
const Runs_1 = __importDefault(require("./pages/Runs"));
const Runbooks_1 = __importDefault(require("./pages/Runbooks"));
const Approvals_1 = __importDefault(require("./pages/Approvals"));
const Artifacts_1 = __importDefault(require("./pages/Artifacts"));
const Policies_1 = __importDefault(require("./pages/Policies"));
const Budgets_1 = __importDefault(require("./pages/Budgets"));
const Observability_1 = __importDefault(require("./pages/Observability"));
const DLQReplay_1 = __importDefault(require("./pages/DLQReplay"));
const Integrations_1 = __importDefault(require("./pages/Integrations"));
const Admin_1 = __importDefault(require("./pages/Admin"));
const Audit_1 = __importDefault(require("./pages/Audit"));
// Global banner component
function MaestroBanner() {
    return (<div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="flex items-center justify-center text-sm text-blue-800">
        <outline_1.ExclamationTriangleIcon className="h-4 w-4 mr-2"/>
        <strong>Maestro builds IntelGraph</strong> — This is the conductor
        interface, not the IntelGraph product.
      </div>
    </div>);
}
// Navigation component
function MaestroNavigation() {
    const location = (0, react_router_dom_1.useLocation)();
    const navItems = [
        { path: '/maestro', icon: outline_1.HomeIcon, label: 'Overview', exact: true },
        { path: '/maestro/runs', icon: outline_1.PlayIcon, label: 'Runs' },
        { path: '/maestro/runbooks', icon: outline_1.DocumentTextIcon, label: 'Runbooks' },
        { path: '/maestro/approvals', icon: outline_1.ClockIcon, label: 'Approvals' },
        { path: '/maestro/artifacts', icon: outline_1.ArchiveBoxIcon, label: 'Artifacts' },
        { path: '/maestro/policies', icon: outline_1.ShieldCheckIcon, label: 'Policies' },
        { path: '/maestro/budgets', icon: outline_1.CurrencyDollarIcon, label: 'Budgets' },
        {
            path: '/maestro/observability',
            icon: outline_1.ChartBarIcon,
            label: 'Observability',
        },
        { path: '/maestro/dlq', icon: outline_1.QueueListIcon, label: 'DLQ & Replay' },
        {
            path: '/maestro/integrations',
            icon: outline_1.CommandLineIcon,
            label: 'Integrations',
        },
        { path: '/maestro/admin', icon: outline_1.Cog6ToothIcon, label: 'Admin' },
    ];
    return (<nav className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">🎼 Maestro</h1>
        <p className="text-sm text-gray-500">Build Orchestrator</p>
      </div>

      <div className="px-2 pb-4">
        {navItems.map(item => {
            const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
            return (<react_router_dom_1.Link key={item.path} to={item.path} className={`flex items-center px-3 py-2 text-sm rounded-md mb-1 transition-colors ${isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'}`}>
              <item.icon className="h-5 w-5 mr-3"/>
              {item.label}
            </react_router_dom_1.Link>);
        })}
      </div>
    </nav>);
}
// Context bar for tenant/environment switching
function ContextBar() {
    const [tenant, setTenant] = (0, react_1.useState)('default');
    const [environment, setEnvironment] = (0, react_1.useState)('dev');
    return (<div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Tenant:</label>
            <select value={tenant} onChange={e => setTenant(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value="default">Default</option>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Environment:
            </label>
            <select value={environment} onChange={e => setEnvironment(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value="dev">Development</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-sm text-blue-600 hover:text-blue-800">
            Command Palette ({utils_1.MODIFIER_KEY}K)
          </button>
          <div className="h-6 w-px bg-gray-300"/>
          <button className="text-sm text-gray-600 hover:text-gray-800">
            User Menu
          </button>
        </div>
      </div>
    </div>);
}
// Main dashboard layout component
function MaestroDashboard() {
    return (<CommandPaletteContext_1.CommandPaletteProvider>
      <NotificationContext_1.NotificationProvider>
        <div className="min-h-screen bg-gray-50">
          <MaestroBanner />

          <div className="flex h-[calc(100vh-theme(spacing.12))]">
            <MaestroNavigation />

            <div className="flex-1 flex flex-col">
              <ContextBar />

              <main className="flex-1 overflow-y-auto">
                <react_router_dom_1.Routes>
                  <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/maestro" replace/>}/>
                  <react_router_dom_1.Route path="/maestro" element={<Overview_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/runs/*" element={<Runs_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/runbooks/*" element={<Runbooks_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/approvals" element={<Approvals_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/artifacts/*" element={<Artifacts_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/policies/*" element={<Policies_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/budgets" element={<Budgets_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/observability" element={<Observability_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/dlq" element={<DLQReplay_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/integrations/*" element={<Integrations_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/admin/*" element={<Admin_1.default />}/>
                  <react_router_dom_1.Route path="/maestro/audit" element={<Audit_1.default />}/>
                </react_router_dom_1.Routes>
              </main>
            </div>
          </div>
        </div>
      </NotificationContext_1.NotificationProvider>
    </CommandPaletteContext_1.CommandPaletteProvider>);
}
