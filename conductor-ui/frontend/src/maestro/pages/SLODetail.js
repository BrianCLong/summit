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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SLODetail;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("../api");
const useFocusTrap_1 = require("../utils/useFocusTrap");
function SLODetail() {
    const { sloId } = (0, react_router_dom_1.useParams)();
    const [slo, setSLO] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [editingAlert, setEditingAlert] = (0, react_1.useState)(null);
    const [timeRange, setTimeRange] = (0, react_1.useState)('7d');
    const [hasEditPermission, setHasEditPermission] = (0, react_1.useState)(false);
    const { getSLO, getSLOHistory, updateAlertRule, checkPermission } = (0, api_1.api)();
    const dialogRef = react_1.default.useRef(null);
    (0, useFocusTrap_1.useFocusTrap)(dialogRef, !!editingAlert, () => setEditingAlert(null));
    (0, react_1.useEffect)(() => {
        if (sloId) {
            loadSLODetails();
            checkEditPermission();
        }
    }, [sloId, timeRange]);
    const loadSLODetails = async () => {
        if (!sloId)
            return;
        setLoading(true);
        try {
            const [sloData, historyData] = await Promise.all([
                getSLO(sloId),
                getSLOHistory(sloId, timeRange),
            ]);
            setSLO({
                ...sloData,
                history: historyData,
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load SLO details');
        }
        finally {
            setLoading(false);
        }
    };
    const checkEditPermission = async () => {
        try {
            const allowed = await checkPermission('update_slo_alerts');
            setHasEditPermission(allowed);
        }
        catch {
            setHasEditPermission(false);
        }
    };
    const handleSaveAlert = async (alertRule) => {
        if (!hasEditPermission || !sloId)
            return;
        try {
            await updateAlertRule(sloId, alertRule.id, alertRule);
            await loadSLODetails(); // Refresh data
            setEditingAlert(null);
        }
        catch (err) {
            console.error('Failed to update alert rule:', err);
        }
    };
    const formatPercentage = (value) => `${(value * 100).toFixed(2)}%`;
    const getBurnRateColor = (burnRate) => {
        if (burnRate > 10)
            return 'text-red-600';
        if (burnRate > 5)
            return 'text-orange-600';
        if (burnRate > 2)
            return 'text-yellow-600';
        return 'text-green-600';
    };
    const getErrorBudgetColor = (consumedPercentage) => {
        if (consumedPercentage > 90)
            return 'bg-red-500';
        if (consumedPercentage > 70)
            return 'bg-orange-500';
        if (consumedPercentage > 50)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>);
    }
    if (error || !slo) {
        return (<div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">
            Error Loading SLO
          </h2>
          <p className="text-red-600">{error || 'SLO not found'}</p>
        </div>
      </div>);
    }
    return (<div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{slo.name}</h1>
            <p className="text-gray-600 mt-1">{slo.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Service: {slo.service}</span>
              <span>Window: {slo.window}</span>
              <span>Type: {slo.sli.type.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* SLO Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Current SLI
              </div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {formatPercentage(slo.status.currentSLI)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Target: {formatPercentage(slo.objective)}
              </div>
              <div className={`text-sm mt-1 ${slo.status.currentSLI >= slo.objective
            ? 'text-green-600'
            : 'text-red-600'}`}>
                {slo.status.currentSLI >= slo.objective
            ? 'Meeting SLO'
            : 'Below Target'}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Error Budget
              </div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {formatPercentage(slo.status.errorBudget.remaining /
            slo.status.errorBudget.total)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className={`h-2 rounded-full transition-all duration-300 ${getErrorBudgetColor(slo.status.errorBudget.consumedPercentage)}`} style={{
            width: `${slo.status.errorBudget.consumedPercentage}%`,
        }}/>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {formatPercentage(slo.status.errorBudget.consumedPercentage)}{' '}
                consumed
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Burn Rate</div>
              <div className={`text-3xl font-bold mt-2 ${getBurnRateColor(slo.status.errorBudget.burnRate)}`}>
                {slo.status.errorBudget.burnRate.toFixed(1)}x
              </div>
              {slo.status.errorBudget.exhaustionDate && (<div className="text-sm text-red-600 mt-1">
                  Exhaustion:{' '}
                  {new Date(slo.status.errorBudget.exhaustionDate).toLocaleDateString()}
                </div>)}
            </div>
          </div>

          {/* Burn History Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                SLI & Error Budget History
              </h2>
            </div>
            <div className="p-6">
              {/* Simple chart representation - in a real app, you'd use a charting library */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                  <div>Time</div>
                  <div>SLI</div>
                  <div>Error Budget</div>
                  <div>Burn Rate</div>
                </div>
                {slo.history.slice(-10).map((point, index) => (<div key={index} className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-gray-600">
                      {new Date(point.timestamp).toLocaleTimeString()}
                    </div>
                    <div className={point.sli >= slo.objective
                ? 'text-green-600'
                : 'text-red-600'}>
                      {formatPercentage(point.sli)}
                    </div>
                    <div>{formatPercentage(point.errorBudgetConsumed)}</div>
                    <div className={getBurnRateColor(point.burnRate)}>
                      {point.burnRate.toFixed(1)}x
                    </div>
                  </div>))}
              </div>
            </div>
          </div>

          {/* Incidents Timeline */}
          {slo.incidents.length > 0 && (<div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Related Incidents</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {slo.incidents.map((incident) => (<div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {incident.title}
                        </h3>
                        <div className="text-sm text-gray-500">
                          Started:{' '}
                          {new Date(incident.startedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          -{formatPercentage(incident.impact)} SLI Impact
                        </div>
                      </div>
                    </div>))}
                </div>
              </div>
            </div>)}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Alert Rules */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Alert Rules</h3>
              {hasEditPermission && (<button className="text-sm text-blue-600 hover:text-blue-800">
                  + Add Rule
                </button>)}
            </div>
            <div className="p-4 space-y-3">
              {slo.alertRules.map((rule) => (<div key={rule.id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{rule.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${rule.enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'}`}>
                          {rule.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${rule.severity === 'critical'
                ? 'bg-red-100 text-red-800'
                : rule.severity === 'high'
                    ? 'bg-orange-100 text-orange-800'
                    : rule.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'}`}>
                          {rule.severity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {rule.condition} {rule.threshold}
                      </div>
                      {rule.channels.length > 0 && (<div className="text-xs text-gray-500 mt-1">
                          Channels: {rule.channels.join(', ')}
                        </div>)}
                    </div>
                    {hasEditPermission && (<button onClick={() => setEditingAlert(rule)} className="text-sm text-blue-600 hover:text-blue-800">
                        Edit
                      </button>)}
                  </div>
                </div>))}
            </div>
          </div>

          {/* SLO Configuration */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">Configuration</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  SLI Query
                </div>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                  {slo.sli.query}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Objective
                </div>
                <div className="text-sm text-gray-600">
                  {formatPercentage(slo.objective)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Time Window
                </div>
                <div className="text-sm text-gray-600">{slo.window}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Rule Edit Dialog */}
      {editingAlert && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={dialogRef} className="w-full max-w-md rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Alert Rule</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveAlert(editingAlert);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input type="text" className="mt-1 block w-full rounded border border-gray-300 px-3 py-2" value={editingAlert.name} onChange={(e) => setEditingAlert({ ...editingAlert, name: e.target.value })}/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Condition
                  </label>
                  <select className="mt-1 block w-full rounded border border-gray-300 px-3 py-2" value={editingAlert.condition} onChange={(e) => setEditingAlert({
                ...editingAlert,
                condition: e.target.value,
            })}>
                    <option value="burn_rate_gt">Burn rate greater than</option>
                    <option value="error_budget_lt">
                      Error budget less than
                    </option>
                    <option value="sli_lt">SLI less than</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Threshold
                  </label>
                  <input type="number" step="0.01" className="mt-1 block w-full rounded border border-gray-300 px-3 py-2" value={editingAlert.threshold} onChange={(e) => setEditingAlert({
                ...editingAlert,
                threshold: parseFloat(e.target.value),
            })}/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Severity
                  </label>
                  <select className="mt-1 block w-full rounded border border-gray-300 px-3 py-2" value={editingAlert.severity} onChange={(e) => setEditingAlert({
                ...editingAlert,
                severity: e.target.value,
            })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="enabled" className="rounded border-gray-300" checked={editingAlert.enabled} onChange={(e) => setEditingAlert({
                ...editingAlert,
                enabled: e.target.checked,
            })}/>
                  <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                    Enable this alert rule
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="submit" className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingAlert(null)} className="flex-1 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
