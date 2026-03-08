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
exports.default = TenantCosts;
const react_1 = __importStar(require("react"));
const TenantSLO_1 = __importDefault(require("../components/TenantSLO"));
const TenantSLOChart_1 = __importDefault(require("../components/TenantSLOChart"));
const TenantCost_1 = __importDefault(require("../components/TenantCost"));
const TenantBudgetForecast_1 = __importDefault(require("../components/TenantBudgetForecast"));
const TenantCostAnomalies_1 = __importDefault(require("../components/TenantCostAnomalies"));
const api_1 = require("../api");
const GrafanaPanel_1 = __importDefault(require("../components/GrafanaPanel"));
const ModelAnomalyPanels_1 = __importDefault(require("../components/ModelAnomalyPanels"));
function TenantCosts() {
    const [tenant, setTenant] = (0, react_1.useState)('acme');
    const cfg = window.__MAESTRO_CFG__ || window.MAESTRO_CFG || {};
    const { listAlertRoutes, createAlertRoute, deleteAlertRoute, testAlertEvent, getTenantBudgetPolicy, billingExport, } = (0, api_1.api)();
    const [routes, setRoutes] = react_1.default.useState([]);
    const [receiver, setReceiver] = react_1.default.useState('email');
    const [severity, setSeverity] = react_1.default.useState('page');
    const [endpoint, setEndpoint] = react_1.default.useState('');
    const [budgetPolicy, setBudgetPolicy] = (0, react_1.useState)(null);
    const refreshRoutes = react_1.default.useCallback(() => listAlertRoutes().then((r) => setRoutes(r.routes || [])), [listAlertRoutes]);
    (0, react_1.useEffect)(() => {
        refreshRoutes();
    }, [refreshRoutes]);
    (0, react_1.useEffect)(() => {
        const fetchBudgetPolicy = async () => {
            try {
                const policy = await getTenantBudgetPolicy(tenant);
                setBudgetPolicy(policy);
            }
            catch (error) {
                console.error('Failed to fetch budget policy:', error);
                setBudgetPolicy(null);
            }
        };
        fetchBudgetPolicy();
    }, [tenant, getTenantBudgetPolicy]);
    const handleDownloadExport = async (format) => {
        try {
            const now = new Date();
            const month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
            const result = await billingExport(tenant, month, format);
            const url = format === 'csv' ? result.csvUrl : result.jsonUrl;
            if (url) {
                window.open(url, '_blank');
            }
            else {
                alert(`Failed to get download URL for ${format} format.`);
            }
        }
        catch (error) {
            console.error('Failed to download export:', error);
            alert(`Error downloading export: ${error.message}`);
        }
    };
    return (<section className="space-y-3 p-4" aria-label="Tenant cost">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Tenant Cost & SLO</h1>
        <input aria-label="Tenant" className="rounded border px-2 py-1" value={tenant} onChange={(e) => setTenant(e.target.value)}/>
        {budgetPolicy && (<span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${budgetPolicy.type === 'hard'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'}`}>
            Budget: {budgetPolicy.type.toUpperCase()} Cap ${budgetPolicy.limit}
            {budgetPolicy.type === 'soft' &&
                ` (Grace: ${budgetPolicy.grace * 100}%)`}
          </span>)}
        <button className="rounded border px-2 py-1 text-sm" onClick={() => handleDownloadExport('csv')}>
          Download Usage (CSV)
        </button>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => handleDownloadExport('json')}>
          Download Usage (JSON)
        </button>
      </div>
      <TenantSLO_1.default tenant={tenant}/>
      <TenantSLOChart_1.default tenant={tenant}/>
      <TenantCost_1.default tenant={tenant}/>
      <TenantBudgetForecast_1.default tenant={tenant}/>
      <TenantCostAnomalies_1.default tenant={tenant}/>
      <section className="space-y-2 rounded-2xl border p-4" aria-label="Alert routes">
        <div className="text-sm font-medium">Forecast alert routes</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            Severity
            <select className="rounded border px-2 py-1" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="warn">Warn</option>
              <option value="page">Page</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Receiver
            <select className="rounded border px-2 py-1" value={receiver} onChange={(e) => setReceiver(e.target.value)}>
              <option value="email">Email</option>
              <option value="webhook">Webhook</option>
            </select>
          </label>
          <input className="w-72 rounded border px-2 py-1" placeholder={receiver === 'email' ? 'Email' : 'Webhook URL'} value={endpoint} onChange={(e) => setEndpoint(e.target.value)}/>
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={async () => {
            await createAlertRoute({
                type: 'forecast',
                tenant,
                severity,
                receiver,
                meta: { endpoint },
            });
            setEndpoint('');
            refreshRoutes();
        }}>
            Create route
          </button>
          <button className="rounded border px-3 py-2" onClick={() => testAlertEvent({ tenant })}>
            Test alert
          </button>
        </div>
        <div className="rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Severity</th>
                <th>Receiver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes
            .filter((r) => r.tenant === tenant && r.type === 'forecast')
            .map((r) => (<tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.severity}</td>
                    <td>{r.receiver}</td>
                    <td>
                      <button className="text-red-600 underline" onClick={() => deleteAlertRoute(r.id).then(refreshRoutes)}>
                        Delete
                      </button>
                    </td>
                  </tr>))}
              {!routes.length && (<tr>
                  <td colSpan={4} className="p-3 text-center text-gray-500">
                    No routes
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.cost || 'maestro-cost'} vars={{ tenant }}/>
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.overview || 'maestro-overview'} vars={{ tenant }}/>
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.slo || 'maestro-slo'} vars={{ tenant }}/>
      </div>
      <ModelAnomalyPanels_1.default tenant={tenant}/>
    </section>);
}
