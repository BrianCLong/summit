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
exports.default = ServingAlertsConfig;
// =============================================
// Serving Lane Alerts Configuration
// =============================================
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
// Mock API functions
const mockGetServingAlertConfig = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        enabled: true,
        qDepthMax: 20,
        batchMax: 128,
        kvHitMin: 0.8,
        notificationChannels: {
            email: true,
            slack: true,
            webhook: false,
        },
        escalationRules: {
            warningThreshold: 0.8,
            criticalThreshold: 0.9,
            autoThrottle: false,
        },
    };
};
const mockPutServingAlertConfig = async (_config) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ok: true };
};
const mockGetRecentAlerts = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const now = new Date();
    return Array.from({ length: 5 }, (_, i) => ({
        id: `alert_${i + 1}`,
        timestamp: new Date(now.getTime() - (i + 1) * 3600000), // Hours ago
        type: ['qDepth', 'batch', 'kvHit', 'latency'][Math.floor(Math.random() * 4)],
        severity: Math.random() > 0.7 ? 'critical' : 'warning',
        message: `Serving metric exceeded threshold`,
        value: Math.random() * 100,
        threshold: 80,
        resolved: Math.random() > 0.3,
    }));
};
function ServingAlertsConfig() {
    const [config, setConfig] = (0, react_1.useState)(null);
    const [recentAlerts, setRecentAlerts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [testingAlert, setTestingAlert] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [configData, alertsData] = await Promise.all([
                    mockGetServingAlertConfig(),
                    mockGetRecentAlerts(),
                ]);
                setConfig(configData);
                setRecentAlerts(alertsData);
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
    const handleSave = async () => {
        if (!config) {
            return;
        }
        try {
            setSaving(true);
            await mockPutServingAlertConfig(config);
            // Show success notification
            alert('Alert configuration saved successfully!');
        }
        catch (error) {
            alert('Failed to save configuration');
        }
        finally {
            setSaving(false);
        }
    };
    const handleTestAlert = async () => {
        try {
            setTestingAlert(true);
            // Simulate test alert
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Test alert sent to configured channels');
        }
        finally {
            setTestingAlert(false);
        }
    };
    const updateConfig = (updates) => {
        if (!config) {
            return;
        }
        setConfig({ ...config, ...updates });
    };
    if (loading || !config) {
        return (<section className="rounded-2xl border border-gray-200 p-6" aria-label="Serving alerts config">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"/>
          <span className="text-gray-600">Loading alert configuration...</span>
        </div>
      </section>);
    }
    return (<section className="rounded-2xl border border-gray-200 p-6 space-y-6" aria-label="Serving alerts config">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <outline_1.BellIcon className="h-6 w-6 text-gray-600"/>
          <h3 className="text-lg font-medium text-gray-900">
            Serving Lane Alerts
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.enabled
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'}`}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex space-x-2">
          <button onClick={handleTestAlert} disabled={testingAlert || !config.enabled} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
            <outline_1.ExclamationTriangleIcon className="h-4 w-4 mr-2"/>
            {testingAlert ? 'Testing...' : 'Test Alert'}
          </button>

          <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="flex items-center space-x-3">
          <input type="checkbox" checked={config.enabled} onChange={e => updateConfig({ enabled: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
          <span className="text-sm font-medium text-gray-900">
            Enable serving lane monitoring and alerts
          </span>
        </label>
        <p className="text-xs text-gray-600 mt-1 ml-7">
          Monitor queue depth, batch sizes, and cache hit rates with automatic
          alerting
        </p>
      </div>

      {config.enabled && (<>
          {/* Threshold Configuration */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Alert Thresholds
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Queue Depth
                </label>
                <input type="number" value={config.qDepthMax} onChange={e => updateConfig({ qDepthMax: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" min="1"/>
                <p className="text-xs text-gray-500 mt-1">
                  Alert when queue exceeds this depth
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Batch Size
                </label>
                <input type="number" value={config.batchMax} onChange={e => updateConfig({ batchMax: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" min="1"/>
                <p className="text-xs text-gray-500 mt-1">
                  Alert when batch size exceeds limit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Cache Hit Rate
                </label>
                <input type="number" step="0.01" min="0" max="1" value={config.kvHitMin} onChange={e => updateConfig({ kvHitMin: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <p className="text-xs text-gray-500 mt-1">
                  Alert when hit rate drops below (0-1)
                </p>
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Notification Channels
            </h4>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={config.notificationChannels.email} onChange={e => updateConfig({
                notificationChannels: {
                    ...config.notificationChannels,
                    email: e.target.checked,
                },
            })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                <span className="text-sm font-medium text-gray-900">
                  Email notifications
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={config.notificationChannels.slack} onChange={e => updateConfig({
                notificationChannels: {
                    ...config.notificationChannels,
                    slack: e.target.checked,
                },
            })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                <span className="text-sm font-medium text-gray-900">
                  Slack integration
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={config.notificationChannels.webhook} onChange={e => updateConfig({
                notificationChannels: {
                    ...config.notificationChannels,
                    webhook: e.target.checked,
                },
            })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                <span className="text-sm font-medium text-gray-900">
                  Webhook endpoints
                </span>
              </label>
            </div>
          </div>

          {/* Escalation Rules */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Escalation Rules
            </h4>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warning Threshold (%)
                  </label>
                  <input type="number" step="0.1" min="0" max="100" value={config.escalationRules.warningThreshold * 100} onChange={e => updateConfig({
                escalationRules: {
                    ...config.escalationRules,
                    warningThreshold: Number(e.target.value) / 100,
                },
            })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Critical Threshold (%)
                  </label>
                  <input type="number" step="0.1" min="0" max="100" value={config.escalationRules.criticalThreshold * 100} onChange={e => updateConfig({
                escalationRules: {
                    ...config.escalationRules,
                    criticalThreshold: Number(e.target.value) / 100,
                },
            })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                </div>
              </div>

              <div className="mt-3">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" checked={config.escalationRules.autoThrottle} onChange={e => updateConfig({
                escalationRules: {
                    ...config.escalationRules,
                    autoThrottle: e.target.checked,
                },
            })} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"/>
                  <span className="text-sm font-medium text-gray-900">
                    Auto-throttle on critical alerts
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-7">
                  Automatically reduce traffic when critical thresholds are
                  breached
                </p>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Recent Alert Activity
            </h4>

            <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
              {recentAlerts.length > 0 ? (recentAlerts.map(alert => (<div key={alert.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {alert.resolved ? (<outline_1.CheckCircleIcon className="h-5 w-5 text-green-500"/>) : alert.severity === 'critical' ? (<outline_1.ExclamationTriangleIcon className="h-5 w-5 text-red-500"/>) : (<outline_1.ExclamationTriangleIcon className="h-5 w-5 text-yellow-500"/>)}

                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {alert.type.toUpperCase()} Alert
                        </div>
                        <div className="text-xs text-gray-600">
                          {alert.message} (Value: {alert.value.toFixed(1)},
                          Threshold: {alert.threshold})
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-medium ${alert.severity === 'critical'
                    ? 'text-red-600'
                    : 'text-yellow-600'}`}>
                        {alert.severity.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>))) : (<div className="p-4 text-center text-gray-500 text-sm">
                  No recent alerts
                </div>)}
            </div>
          </div>
        </>)}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <outline_1.CogIcon className="h-5 w-5 text-blue-600 mt-0.5"/>
          <div className="text-sm">
            <p className="font-medium text-blue-900">Alert Integration</p>
            <p className="text-blue-700 mt-1">
              Breaches will appear in the AlertCenter with type:{' '}
              <code className="bg-blue-100 px-1 rounded">serving</code>.
              Configure notification channels and escalation rules to ensure
              proper incident response.
            </p>
          </div>
        </div>
      </div>
    </section>);
}
