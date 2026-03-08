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
exports.default = AlertsPage;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const Table_1 = require("@/components/ui/Table");
const Skeleton_1 = require("@/components/ui/Skeleton");
const EmptyState_1 = require("@/components/ui/EmptyState");
const SearchBar_1 = require("@/components/ui/SearchBar");
const KPIStrip_1 = require("@/components/panels/KPIStrip");
const ConnectionStatus_1 = require("@/components/ConnectionStatus");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const useGraphQL_1 = require("@/hooks/useGraphQL");
const data_json_1 = __importDefault(require("@/mock/data.json"));
// Helper functions moved outside component
const getSeverityColor = (severity) => {
    switch (severity) {
        case 'critical':
            return 'bg-red-500';
        case 'high':
            return 'bg-orange-500';
        case 'medium':
            return 'bg-yellow-500';
        case 'low':
            return 'bg-blue-500';
        default:
            return 'bg-gray-500';
    }
};
const getStatusColor = (status) => {
    switch (status) {
        case 'open':
            return 'destructive';
        case 'investigating':
            return 'warning';
        case 'resolved':
            return 'success';
        default:
            return 'secondary';
    }
};
// Extracted AlertRow component
const AlertRow = react_1.default.memo(({ alert, onStatusChange }) => {
    return (<tr className="group">
      <td>
        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}/>
      </td>
      <td>
        <div>
          <div className="font-medium">{alert.title}</div>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {alert.description}
          </div>
        </div>
      </td>
      <td>
        <Badge_1.Badge variant={alert.severity === 'critical'
            ? 'destructive'
            : 'secondary'}>
          {alert.severity}
        </Badge_1.Badge>
      </td>
      <td>
        <Badge_1.Badge variant={getStatusColor(alert.status)}>
          {alert.status}
        </Badge_1.Badge>
      </td>
      <td className="text-sm text-muted-foreground">
        {new Date(alert.createdAt).toLocaleDateString()}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {alert.status === 'open' && (<Button_1.Button size="sm" variant="outline" onClick={() => onStatusChange(alert.id, 'investigating')}>
              Investigate
            </Button_1.Button>)}
          {alert.status === 'investigating' && (<Button_1.Button size="sm" variant="outline" onClick={() => onStatusChange(alert.id, 'resolved')}>
              Resolve
            </Button_1.Button>)}
          <Button_1.Button size="sm" variant="ghost">
            View
          </Button_1.Button>
        </div>
      </td>
    </tr>);
});
AlertRow.displayName = 'AlertRow';
function AlertsPage() {
    // GraphQL hooks
    const { data: alertsData, loading: alertsLoading, error: alertsError, refetch, } = (0, useGraphQL_1.useAlerts)();
    const { data: alertUpdates } = (0, useGraphQL_1.useAlertUpdates)();
    const [updateAlertStatus] = (0, useGraphQL_1.useUpdateAlertStatus)();
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedSeverity, setSelectedSeverity] = (0, react_1.useState)('');
    const [selectedStatus, setSelectedStatus] = (0, react_1.useState)('');
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    // Load data - prefer GraphQL over mock data in demo mode only
    (0, react_1.useEffect)(() => {
        if (alertsData?.alerts) {
            setAlerts(alertsData.alerts);
            setLoading(alertsLoading);
            setError(alertsError);
        }
        else {
            if (!isDemoMode) {
                setAlerts([]);
                setLoading(false);
                setError(new Error('Live alerts are unavailable without a backend connection.'));
                return;
            }
            // Fallback to demo data
            const loadMockData = async () => {
                try {
                    setLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setAlerts(data_json_1.default.alerts);
                }
                catch (err) {
                    setError(err);
                }
                finally {
                    setLoading(false);
                }
            };
            loadMockData();
        }
    }, [alertsData, alertsLoading, alertsError, isDemoMode]);
    // Handle real-time alert updates
    (0, react_1.useEffect)(() => {
        if (alertUpdates?.alertCreated) {
            setAlerts(prev => [alertUpdates.alertCreated, ...prev]);
        }
    }, [alertUpdates]);
    // Filter alerts - Memoized
    const filteredAlerts = (0, react_1.useMemo)(() => alerts.filter(alert => {
        if (selectedSeverity && alert.severity !== selectedSeverity) {
            return false;
        }
        if (selectedStatus && alert.status !== selectedStatus) {
            return false;
        }
        if (searchQuery &&
            !alert.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    }), [alerts, selectedSeverity, selectedStatus, searchQuery]);
    // Calculate KPIs (do not show change deltas in demo-only mode) - Memoized
    const kpiMetrics = (0, react_1.useMemo)(() => [
        {
            id: 'critical',
            title: 'Critical Alerts',
            value: alerts.filter(a => a.severity === 'critical').length,
            format: 'number',
            status: alerts.filter(a => a.severity === 'critical').length > 0
                ? 'error'
                : 'success',
            ...(alertsData ? { change: { value: 12, direction: 'up', period: 'last hour' } } : {}),
        },
        {
            id: 'active',
            title: 'Active Alerts',
            value: alerts.filter(a => a.status === 'open').length,
            format: 'number',
            status: 'warning',
            ...(alertsData ? { change: { value: 5, direction: 'down', period: 'last hour' } } : {}),
        },
        {
            id: 'resolved',
            title: 'Resolved Today',
            value: alerts.filter(a => a.status === 'resolved').length,
            format: 'number',
            status: 'success',
            ...(alertsData ? { change: { value: 23, direction: 'up', period: 'yesterday' } } : {}),
        },
        {
            id: 'response',
            title: 'Avg Response Time',
            value: 156,
            format: 'duration',
            status: 'neutral',
            ...(alertsData ? { change: { value: 8, direction: 'down', period: 'last week' } } : {}),
        },
    ], [alerts, alertsData]);
    // Memoized handler
    const handleStatusChange = (0, react_1.useCallback)(async (alertId, newStatus) => {
        try {
            if (alertsData) {
                await updateAlertStatus({
                    variables: { id: alertId, status: newStatus },
                });
            }
            else {
                // Update mock data
                setAlerts(prev => prev.map(alert => alert.id === alertId
                    ? {
                        ...alert,
                        status: newStatus,
                        updatedAt: new Date().toISOString(),
                    }
                    : alert));
            }
        }
        catch (error) {
            console.error('Failed to update alert status:', error);
        }
    }, [alertsData, updateAlertStatus]);
    const handleRefresh = async () => {
        if (alertsData) {
            await refetch();
        }
        else {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 800));
            setLoading(false);
        }
    };
    if (error) {
        return (<div className="h-full flex items-center justify-center">
        <EmptyState_1.EmptyState icon="alert" title="Failed to load alerts" description={error.message} action={{ label: 'Retry', onClick: () => window.location.reload() }}/>
      </div>);
    }
    return (<div className="h-full flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Security Alerts</h1>
          <ConnectionStatus_1.ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          <SearchBar_1.SearchBar placeholder="Search alerts..." value={searchQuery} onChange={setSearchQuery} className="w-80"/>

          <Button_1.Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <lucide_react_1.RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm">
            <lucide_react_1.Download className="h-4 w-4 mr-2"/>
            Export
          </Button_1.Button>
        </div>
      </div>

      {!alertsData && (<DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Alerts overview"/>)}

      {/* KPI Strip */}
      <KPIStrip_1.KPIStrip data={kpiMetrics} loading={loading} columns={4}/>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Severity:</span>
          <select value={selectedSeverity} onChange={e => setSelectedSeverity(e.target.value)} className="px-3 py-1 border rounded-md text-sm">
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-1 border rounded-md text-sm">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alerts Table */}
      <Card_1.Card className="flex-1">
        <Card_1.CardHeader>
          <Card_1.CardTitle>Alert Details</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          {loading ? (<div className="space-y-4">
              {[...Array(8)].map((_, i) => (<div key={i} className="flex items-center space-x-4">
                  <Skeleton_1.Skeleton className="h-8 w-8 rounded"/>
                  <div className="space-y-2 flex-1">
                    <Skeleton_1.Skeleton className="h-4 w-2/3"/>
                    <Skeleton_1.Skeleton className="h-3 w-1/2"/>
                  </div>
                  <Skeleton_1.Skeleton className="h-6 w-20"/>
                  <Skeleton_1.Skeleton className="h-6 w-24"/>
                </div>))}
            </div>) : filteredAlerts.length === 0 ? (<EmptyState_1.EmptyState icon="search" title="No alerts found" description="Try adjusting your filters or search criteria" action={{
                label: 'Clear Filters',
                onClick: () => {
                    setSearchQuery('');
                    setSelectedSeverity('');
                    setSelectedStatus('');
                },
            }}/>) : (<Table_1.Table>
              <thead>
                <tr>
                  <th className="w-4"></th>
                  <th>Alert</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => (<AlertRow key={alert.id} alert={alert} onStatusChange={handleStatusChange}/>))}
              </tbody>
            </Table_1.Table>)}
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
