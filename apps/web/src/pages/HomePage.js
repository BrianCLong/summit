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
exports.default = HomePage;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const KPIStrip_1 = require("@/components/panels/KPIStrip");
const Skeleton_1 = require("@/components/ui/Skeleton");
const EmptyState_1 = require("@/components/ui/EmptyState");
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("@/contexts/AuthContext");
const ActivationProgressTile_1 = require("@/components/activation/ActivationProgressTile");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const data_json_1 = __importDefault(require("@/mock/data.json"));
// Extracted Memoized Components for Performance
const QuickActionCard = (0, react_1.memo)(({ action, onActionClick, onActionKeyDown }) => {
    const Icon = action.icon;
    return (<Card_1.Card className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" onClick={() => onActionClick(action.href)} tabIndex={0} onKeyDown={(e) => onActionKeyDown(e, action.href)} role="button" aria-label={`${action.title}: ${action.description}`}>
      <Card_1.CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${action.color} text-white`}>
            <Icon className="h-6 w-6"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate flex items-center gap-2">
              {action.title}
              {action.badge && (<Badge_1.Badge variant="destructive" className="text-xs">
                  {action.badge}
                </Badge_1.Badge>)}
            </div>
            <div className="text-sm text-muted-foreground">
              {action.description}
            </div>
          </div>
          <lucide_react_1.ArrowRight className="h-4 w-4 text-muted-foreground"/>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
});
QuickActionCard.displayName = 'QuickActionCard';
const InvestigationRow = (0, react_1.memo)(({ investigation, onClick, onKeyDown }) => (<div role="button" tabIndex={0} aria-label={`View investigation: ${investigation.title}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onClick(investigation.id)} onKeyDown={(e) => onKeyDown(e, investigation.id)}>
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">
        {investigation.title}
      </div>
      <div className="text-sm text-muted-foreground">
        {investigation.status.replace('_', ' ')} •{' '}
        {new Date(investigation.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge_1.Badge variant="outline" className="text-xs">
        {investigation.priority}
      </Badge_1.Badge>
    </div>
  </div>));
InvestigationRow.displayName = 'InvestigationRow';
const AlertRow = (0, react_1.memo)(({ alert, onClick, onKeyDown, getSeverityBadgeVariant }) => (<div role="button" tabIndex={0} aria-label={`View alert: ${alert.title}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onClick(alert.id)} onKeyDown={(e) => onKeyDown(e, alert.id)}>
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{alert.title}</div>
      <div className="text-sm text-muted-foreground">
        {alert.source} •{' '}
        {new Date(alert.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge_1.Badge variant={getSeverityBadgeVariant(alert.severity)} className="text-xs">
        {alert.severity}
      </Badge_1.Badge>
    </div>
  </div>));
AlertRow.displayName = 'AlertRow';
const CaseRow = (0, react_1.memo)(({ caseItem, onClick, onKeyDown, getPriorityBadgeVariant }) => (<div role="button" tabIndex={0} aria-label={`View case: ${caseItem.title}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onClick(caseItem.id)} onKeyDown={(e) => onKeyDown(e, caseItem.id)}>
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{caseItem.title}</div>
      <div className="text-sm text-muted-foreground">
        {caseItem.investigationIds.length} investigations •{' '}
        {caseItem.alertIds.length} alerts
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge_1.Badge variant={getPriorityBadgeVariant(caseItem.priority)} className="text-xs">
        {caseItem.priority}
      </Badge_1.Badge>
      <Badge_1.Badge variant="outline" className="text-xs">
        {caseItem.status.replace('_', ' ')}
      </Badge_1.Badge>
    </div>
  </div>));
CaseRow.displayName = 'CaseRow';
function HomePage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { user } = (0, AuthContext_1.useAuth)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [kpiMetrics, setKpiMetrics] = (0, react_1.useState)([]);
    const [recentInvestigations, setRecentInvestigations] = (0, react_1.useState)([]);
    const [recentAlerts, setRecentAlerts] = (0, react_1.useState)([]);
    const [recentCases, setRecentCases] = (0, react_1.useState)([]);
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    (0, react_1.useEffect)(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                if (!isDemoMode) {
                    setKpiMetrics([]);
                    setRecentInvestigations([]);
                    setRecentAlerts([]);
                    setRecentCases([]);
                    return;
                }
                // Simulate API calls
                await new Promise(resolve => setTimeout(resolve, 1000));
                setKpiMetrics(data_json_1.default.kpiMetrics);
                setRecentInvestigations(data_json_1.default.investigations.slice(0, 3));
                setRecentAlerts(data_json_1.default.alerts.slice(0, 4));
                setRecentCases(data_json_1.default.cases.slice(0, 2));
            }
            catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
            finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [isDemoMode]);
    const quickActions = [
        {
            title: 'Start Investigation',
            description: 'Create a new investigation',
            icon: lucide_react_1.Search,
            href: '/explore',
            color: 'bg-blue-500',
        },
        {
            title: 'Review Alerts',
            description: 'Review security alerts and triage status',
            icon: lucide_react_1.AlertTriangle,
            href: '/alerts',
            color: 'bg-red-500',
            badge: isDemoMode ? '3' : undefined,
        },
        {
            title: 'View Cases',
            description: 'Manage active cases',
            icon: lucide_react_1.FileText,
            href: '/cases',
            color: 'bg-green-500',
        },
        {
            title: 'Command Center',
            description: 'Real-time operations dashboard',
            icon: lucide_react_1.BarChart3,
            href: '/dashboards/command-center',
            color: 'bg-purple-500',
        },
    ];
    const getSeverityBadgeVariant = (severity) => {
        switch (severity) {
            case 'critical':
                return 'destructive';
            case 'high':
                return 'destructive';
            case 'medium':
                return 'warning';
            case 'low':
                return 'secondary';
            default:
                return 'secondary';
        }
    };
    const getPriorityBadgeVariant = (priority) => {
        switch (priority) {
            case 'critical':
                return 'destructive';
            case 'high':
                return 'destructive';
            case 'medium':
                return 'warning';
            case 'low':
                return 'secondary';
            default:
                return 'secondary';
        }
    };
    const handleItemKeyDown = (0, react_1.useCallback)((e, path) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(path);
        }
    }, [navigate]);
    const handleActionClick = (0, react_1.useCallback)((href) => {
        navigate(href);
    }, [navigate]);
    const handleActionKeyDown = (0, react_1.useCallback)((e, href) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(href);
        }
    }, [navigate]);
    const handleInvestigationClick = (0, react_1.useCallback)((id) => {
        navigate(`/explore?investigation=${id}`);
    }, [navigate]);
    const handleInvestigationKeyDown = (0, react_1.useCallback)((e, id) => {
        handleItemKeyDown(e, `/explore?investigation=${id}`);
    }, [handleItemKeyDown]);
    const handleAlertClick = (0, react_1.useCallback)((id) => {
        navigate(`/alerts/${id}`);
    }, [navigate]);
    const handleAlertKeyDown = (0, react_1.useCallback)((e, id) => {
        handleItemKeyDown(e, `/alerts/${id}`);
    }, [handleItemKeyDown]);
    const handleCaseClick = (0, react_1.useCallback)((id) => {
        navigate(`/cases/${id}`);
    }, [navigate]);
    const handleCaseKeyDown = (0, react_1.useCallback)((e, id) => {
        handleItemKeyDown(e, `/cases/${id}`);
    }, [handleItemKeyDown]);
    return (<div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your intelligence operations
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })}
        </div>
      </div>

      <DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Home overview"/>

      <ActivationProgressTile_1.ActivationProgressTile />

      {/* KPI Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        <KPIStrip_1.KPIStrip data={kpiMetrics} loading={loading} onSelect={metric => {
            if (metric.id === 'threats') {
                navigate('/alerts');
            }
            else if (metric.id === 'investigations') {
                navigate('/explore');
            }
        }}/>
        {!loading && kpiMetrics.length === 0 && (<div className="mt-4">
            <EmptyState_1.EmptyState icon="chart" title="No live metrics" description="Connect a data source to populate KPI metrics."/>
          </div>)}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => (<QuickActionCard key={action.title} action={action} onActionClick={handleActionClick} onActionKeyDown={handleActionKeyDown}/>))}
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Investigations */}
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle className="text-base flex items-center gap-2">
              <lucide_react_1.Search className="h-4 w-4"/>
              Recent Investigations
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="space-y-3">
            {loading
            ? [...Array(3)].map((_, i) => (<div key={i} className="space-y-2">
                    <Skeleton_1.Skeleton className="h-4 w-full"/>
                    <Skeleton_1.Skeleton className="h-3 w-2/3"/>
                  </div>))
            : recentInvestigations.map(investigation => (<InvestigationRow key={investigation.id} investigation={investigation} onClick={handleInvestigationClick} onKeyDown={handleInvestigationKeyDown}/>))}
            {!loading && recentInvestigations.length === 0 && (<EmptyState_1.EmptyState icon="search" title="No investigations" description="Start a new investigation to see it here." className="py-4" action={{
                label: 'Start Investigation',
                onClick: () => navigate('/explore'),
                variant: 'outline',
            }}/>)}
            <Button_1.Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/explore')}>
              View All Investigations
              <lucide_react_1.ArrowRight className="h-3 w-3 ml-1"/>
            </Button_1.Button>
          </Card_1.CardContent>
        </Card_1.Card>

        {/* Recent Alerts */}
        <Card_1.Card className="h-full flex flex-col">
          <Card_1.CardHeader>
            <Card_1.CardTitle className="text-base flex items-center gap-2">
              <lucide_react_1.AlertTriangle className="h-4 w-4"/>
              Recent Alerts
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="space-y-3 flex-1">
            {loading
            ? [...Array(4)].map((_, i) => (<div key={i} className="space-y-2">
                    <Skeleton_1.Skeleton className="h-4 w-full"/>
                    <Skeleton_1.Skeleton className="h-3 w-1/2"/>
                  </div>))
            : recentAlerts.map(alert => (<AlertRow key={alert.id} alert={alert} onClick={handleAlertClick} onKeyDown={handleAlertKeyDown} getSeverityBadgeVariant={getSeverityBadgeVariant}/>))}
            {!loading && recentAlerts.length === 0 && (<EmptyState_1.EmptyState icon="alert" title="No alerts" description="New security alerts will appear here." className="py-4" action={{
                label: 'View All Alerts',
                onClick: () => navigate('/alerts'),
                variant: 'outline',
            }}/>)}
            <Button_1.Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/alerts')}>
              View All Alerts
              <lucide_react_1.ArrowRight className="h-3 w-3 ml-1"/>
            </Button_1.Button>
          </Card_1.CardContent>
        </Card_1.Card>

        {/* Recent Cases */}
        <Card_1.Card className="h-full flex flex-col">
          <Card_1.CardHeader>
            <Card_1.CardTitle className="text-base flex items-center gap-2">
              <lucide_react_1.FileText className="h-4 w-4"/>
              Active Cases
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="space-y-3 flex-1">
            {loading
            ? [...Array(2)].map((_, i) => (<div key={i} className="space-y-2">
                    <Skeleton_1.Skeleton className="h-4 w-full"/>
                    <Skeleton_1.Skeleton className="h-3 w-3/4"/>
                  </div>))
            : recentCases.map(case_ => (<CaseRow key={case_.id} caseItem={case_} onClick={handleCaseClick} onKeyDown={handleCaseKeyDown} getPriorityBadgeVariant={getPriorityBadgeVariant}/>))}
            {!loading && recentCases.length === 0 && (<EmptyState_1.EmptyState icon="file" title="No active cases" description="Manage your active investigations in cases." className="py-4" action={{
                label: 'View All Cases',
                onClick: () => navigate('/cases'),
                variant: 'outline',
            }}/>)}
            <Button_1.Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/cases')}>
              View All Cases
              <lucide_react_1.ArrowRight className="h-3 w-3 ml-1"/>
            </Button_1.Button>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}
