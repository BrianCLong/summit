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
exports.default = Overview;
// =============================================
// Maestro Overview Dashboard - Health Cards & Widgets
// =============================================
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
const recharts_1 = require("recharts");
const TenantContext_1 = require("../../../contexts/TenantContext");
const NotificationContext_1 = require("../../../contexts/NotificationContext");
const DataIntegrityNotice_1 = require("../../../components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("../../../components/common/DemoIndicator");
const EmptyState_1 = require("../../../components/ui/EmptyState");
// Mock data - in production would come from API
const mockHealthData = {
    activeRuns: 12,
    queuedRuns: 3,
    successRate: 94.5,
    p95Latency: 1250,
    errorBudgetBurn: 2.3,
    costToday: 45.67,
    budgetRemaining: 78.2,
    dlqSize: 5,
    alertsOpen: 2,
    sloStatus: 'healthy',
};
const mockRunsData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    runs: Math.floor(Math.random() * 20) + 5,
    success: Math.floor(Math.random() * 18) + 4,
    failed: Math.floor(Math.random() * 3),
}));
const mockCostData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    cost: Math.random() * 100 + 20,
    budget: 120,
}));
function HealthCard({ title, value, subtitle, icon: Icon, trend, status, onClick, }) {
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'border-green-200 bg-green-50';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50';
            case 'error':
                return 'border-red-200 bg-red-50';
            default:
                return 'border-gray-200 bg-white';
        }
    };
    const getTrendIcon = () => {
        if (trend === 'up') {
            return '↗';
        }
        if (trend === 'down') {
            return '↘';
        }
        return '';
    };
    return (<div className={`p-6 rounded-lg border ${getStatusColor()} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (<span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {getTrendIcon()}
              </span>)}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-400"/>
        </div>
      </div>
    </div>);
}
function QuickAction({ title, description, icon: Icon, onClick, disabled, }) {
    return (<button onClick={onClick} disabled={disabled} className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Icon className="h-6 w-6 text-blue-600"/>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </button>);
}
function Overview() {
    const { currentTenant, hasPermission } = (0, TenantContext_1.useTenant)();
    const { showNotification } = (0, NotificationContext_1.useNotification)();
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    const healthData = isDemoMode ? mockHealthData : null;
    const runsData = isDemoMode ? mockRunsData : [];
    const costData = isDemoMode ? mockCostData : [];
    const handleRefresh = async () => {
        setRefreshing(true);
        if (isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setRefreshing(false);
        showNotification({
            type: 'success',
            title: 'Dashboard refreshed',
            message: 'Latest metrics have been loaded',
        });
    };
    const handleQuickAction = (action) => {
        if (!hasPermission(`${action}.create`)) {
            showNotification({
                type: 'warning',
                title: 'Permission denied',
                message: `You don't have permission to ${action}`,
            });
            return;
        }
        showNotification({
            type: 'info',
            title: `${action} initiated`,
            message: 'Redirecting...',
        });
    };
    return (<div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maestro Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tenant: {currentTenant?.name} • Environment:{' '}
            {currentTenant?.environment}
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Maestro overview"/>

      {/* Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthCard title="Active Runs" value={healthData?.activeRuns ?? '--'} subtitle={healthData ? `${healthData.queuedRuns} queued` : 'No live data'} icon={outline_1.PlayIcon} status="info" trend="stable" onClick={() => (window.location.hash = '/maestro/runs')}/>

        <HealthCard title="Success Rate" value={healthData ? `${healthData.successRate}%` : '--'} subtitle="Last 24 hours" icon={outline_1.CheckCircleIcon} status={healthData && healthData.successRate >= 95 ? 'success' : 'warning'} trend={healthData && healthData.successRate >= 95 ? 'up' : 'down'}/>

        <HealthCard title="P95 Latency" value={healthData ? `${healthData.p95Latency}ms` : '--'} subtitle="Step completion time" icon={outline_1.ChartBarIcon} status={healthData && healthData.p95Latency <= 1000 ? 'success' : 'warning'} trend={healthData && healthData.p95Latency <= 1000 ? 'down' : 'up'}/>

        <HealthCard title="Cost Today" value={healthData ? `$${healthData.costToday}` : '--'} subtitle={healthData
            ? `${healthData.budgetRemaining}% budget left`
            : 'No live data'} icon={outline_1.CurrencyDollarIcon} status={healthData && healthData.budgetRemaining > 20 ? 'success' : 'warning'} onClick={() => (window.location.hash = '/maestro/budgets')}/>

        <HealthCard title="Error Budget" value={healthData ? `${healthData.errorBudgetBurn}%/hr` : '--'} subtitle="Current burn rate" icon={outline_1.ExclamationTriangleIcon} status={healthData && healthData.errorBudgetBurn <= 5 ? 'success' : 'error'}/>

        <HealthCard title="DLQ Size" value={healthData?.dlqSize ?? '--'} subtitle="Failed messages" icon={outline_1.QueueListIcon} status={healthData?.dlqSize === 0 ? 'success' : 'warning'} onClick={() => (window.location.hash = '/maestro/dlq')}/>

        <HealthCard title="Open Alerts" value={healthData?.alertsOpen ?? '--'} subtitle="Requiring attention" icon={outline_1.ExclamationTriangleIcon} status={healthData?.alertsOpen === 0 ? 'success' : 'error'}/>

        <HealthCard title="SLO Status" value={healthData ? 'Healthy' : '--'} subtitle={healthData ? 'All targets met' : 'No live data'} icon={outline_1.ServerIcon} status={healthData ? 'success' : 'info'} onClick={() => (window.location.hash = '/maestro/observability')}/>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runs Timeline */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Runs Over Time
            </h2>
            <span className="text-sm text-gray-500">Last 24 hours</span>
          </div>
          <div className="h-64">
            {runsData.length === 0 ? (<EmptyState_1.EmptyState icon="chart" title="No live run data" description="Connect Maestro telemetry to visualize run throughput."/>) : (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={runsData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Line type="monotone" dataKey="runs" stroke="#3B82F6" strokeWidth={2} dot={false}/>
                  <recharts_1.Line type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} dot={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>)}
          </div>
        </div>

        {/* Cost Tracking */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Daily Cost vs Budget
            </h2>
            <span className="text-sm text-gray-500">This week</span>
          </div>
          <div className="h-64">
            {costData.length === 0 ? (<EmptyState_1.EmptyState icon="chart" title="No live cost data" description="Connect billing telemetry to visualize spend."/>) : (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={costData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="day"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip formatter={(value, name) => [
                `$${Number(value).toFixed(2)}`,
                name === 'cost' ? 'Actual' : 'Budget',
            ]}/>
                  <recharts_1.Bar dataKey="cost" fill="#3B82F6"/>
                  <recharts_1.Bar dataKey="budget" fill="#E5E7EB" opacity={0.5}/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction title="Start Run" description="Execute a runbook or pipeline" icon={outline_1.PlayIcon} onClick={() => handleQuickAction('run')} disabled={!hasPermission('runs.create')}/>

          <QuickAction title="Create Runbook" description="Build a new automation workflow" icon={outline_1.ClockIcon} onClick={() => handleQuickAction('runbook')} disabled={!hasPermission('runbooks.create')}/>

          <QuickAction title="View Budgets" description="Monitor spend and set limits" icon={outline_1.CurrencyDollarIcon} onClick={() => (window.location.hash = '/maestro/budgets')}/>

          <QuickAction title="Check DLQ" description="Review failed messages" icon={outline_1.QueueListIcon} onClick={() => (window.location.hash = '/maestro/dlq')}/>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Recent Activity
        </h2>
        {isDemoMode ? (<div className="flow-root">
            <ul className="-mb-8">
              {[
                {
                    id: 1,
                    type: 'run',
                    status: 'completed',
                    title: 'Build pipeline completed successfully',
                    time: '2 minutes ago',
                    icon: outline_1.CheckCircleIcon,
                    color: 'text-green-400',
                },
                {
                    id: 2,
                    type: 'alert',
                    status: 'warning',
                    title: 'Budget threshold exceeded (80%)',
                    time: '15 minutes ago',
                    icon: outline_1.ExclamationTriangleIcon,
                    color: 'text-yellow-400',
                },
                {
                    id: 3,
                    type: 'run',
                    status: 'failed',
                    title: 'Deploy pipeline failed on step 3',
                    time: '1 hour ago',
                    icon: outline_1.XCircleIcon,
                    color: 'text-red-400',
                },
                {
                    id: 4,
                    type: 'run',
                    status: 'completed',
                    title: 'Data processing completed',
                    time: '2 hours ago',
                    icon: outline_1.CheckCircleIcon,
                    color: 'text-green-400',
                },
            ].map((item, itemIdx, items) => (<li key={item.id}>
                  <div className="relative pb-8">
                    {itemIdx !== items.length - 1 ? (<span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"/>) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${item.color === 'text-green-400' ? 'bg-green-100' : item.color === 'text-yellow-400' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                          <item.icon className={`h-5 w-5 ${item.color}`} aria-hidden="true"/>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">{item.title}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>{item.time}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>))}
            </ul>
          </div>) : (<EmptyState_1.EmptyState icon="activity" title="No live activity" description="Connect the activity feed to show recent Maestro events."/>)}
      </div>
    </div>);
}
