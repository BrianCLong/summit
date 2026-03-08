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
const react_1 = __importStar(require("react"));
const ui_1 = require("@/components/ui");
const lucide_react_1 = require("lucide-react");
const recharts_1 = require("recharts");
const MonitoringPanel = ({ operationId }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [realTimeData, setRealTimeData] = (0, react_1.useState)({
        metrics: [],
        alerts: [],
        healthScore: {
            overall: 0,
            operational: 0,
            technical: 0,
            strategic: 0,
            compliance: 0,
            status: 'healthy',
        },
        isConnected: false,
    });
    // Simulate WebSocket connection for real-time data
    (0, react_1.useEffect)(() => {
        if (!operationId)
            return;
        // Simulate connection
        setRealTimeData((prev) => ({ ...prev, isConnected: true }));
        const interval = setInterval(() => {
            // Generate mock real-time data
            const newMetrics = [
                {
                    id: 'effectiveness',
                    type: 'Effectiveness',
                    value: 75 + Math.random() * 20,
                    unit: '%',
                    timestamp: new Date(),
                    trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
                    status: 'healthy',
                },
                {
                    id: 'engagement',
                    type: 'Engagement',
                    value: 60 + Math.random() * 30,
                    unit: '%',
                    timestamp: new Date(),
                    trend: 'stable',
                    status: 'healthy',
                },
                {
                    id: 'attribution',
                    type: 'Attribution Risk',
                    value: Math.random() * 40,
                    unit: '%',
                    timestamp: new Date(),
                    trend: 'decreasing',
                    status: Math.random() > 0.3 ? 'healthy' : 'warning',
                },
                {
                    id: 'compliance',
                    type: 'Compliance Score',
                    value: 85 + Math.random() * 15,
                    unit: '%',
                    timestamp: new Date(),
                    trend: 'stable',
                    status: 'healthy',
                },
            ];
            const alerts = [
                ...(Math.random() > 0.8
                    ? [
                        {
                            id: `alert_${Date.now()}`,
                            severity: 'medium',
                            type: 'Performance',
                            title: 'Engagement Rate Below Target',
                            description: 'Current engagement rate is 5% below the target threshold',
                            timestamp: new Date(),
                            status: 'active',
                        },
                    ]
                    : []),
                ...(Math.random() > 0.9
                    ? [
                        {
                            id: `alert_${Date.now()}_2`,
                            severity: 'high',
                            type: 'Security',
                            title: 'Attribution Risk Elevated',
                            description: 'Attribution score has increased beyond acceptable limits',
                            timestamp: new Date(),
                            status: 'active',
                        },
                    ]
                    : []),
            ];
            const healthScore = {
                overall: 85 + Math.random() * 10,
                operational: 90 + Math.random() * 10,
                technical: 95 + Math.random() * 5,
                strategic: 80 + Math.random() * 15,
                compliance: 92 + Math.random() * 8,
                status: 'healthy',
            };
            setRealTimeData((prev) => ({
                metrics: newMetrics,
                alerts: [...prev.alerts.slice(-5), ...alerts], // Keep last 5 + new
                healthScore,
                isConnected: true,
            }));
        }, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, [operationId]);
    // Generate chart data for metrics
    const chartData = react_1.default.useMemo(() => {
        const timePoints = Array.from({ length: 20 }, (_, i) => {
            const time = new Date();
            time.setMinutes(time.getMinutes() - (19 - i) * 5); // 5-minute intervals
            return {
                time: time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                effectiveness: 75 + Math.sin(i * 0.3) * 10 + Math.random() * 5,
                engagement: 60 + Math.cos(i * 0.4) * 15 + Math.random() * 5,
                attribution: 30 + Math.sin(i * 0.2) * 10 + Math.random() * 3,
                compliance: 90 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
            };
        });
        return timePoints;
    }, []);
    if (!operationId) {
        return (<ui_1.Card>
        <ui_1.CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <lucide_react_1.BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
            <p className="text-muted-foreground">
              Select an operation to view monitoring data
            </p>
          </div>
        </ui_1.CardContent>
      </ui_1.Card>);
    }
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };
    const getHealthColor = (score) => {
        if (score >= 80)
            return 'text-green-600';
        if (score >= 60)
            return 'text-yellow-600';
        return 'text-red-600';
    };
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'increasing':
                return <lucide_react_1.TrendingUp className="h-3 w-3 text-green-500"/>;
            case 'decreasing':
                return <lucide_react_1.TrendingDown className="h-3 w-3 text-red-500"/>;
            default:
                return <div className="w-3 h-3"/>;
        }
    };
    return (<div className="space-y-6">
      <ui_1.Card>
        <ui_1.CardHeader>
          <div className="flex items-center justify-between">
            <ui_1.CardTitle className="flex items-center">
              <lucide_react_1.Activity className="h-5 w-5 mr-2"/>
              Real-Time Monitoring
            </ui_1.CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${realTimeData.isConnected ? 'bg-green-500' : 'bg-red-500'}`}/>
              <span className="text-xs text-muted-foreground">
                {realTimeData.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </ui_1.CardHeader>
        <ui_1.CardContent>
          <ui_1.Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
            <ui_1.TabsList className="grid w-full grid-cols-4">
              <ui_1.TabsTrigger value="overview">Overview</ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="metrics">Metrics</ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="alerts">
                Alerts
                {realTimeData.alerts.filter((a) => a.status === 'active')
            .length > 0 && (<ui_1.Badge variant="destructive" className="ml-1 text-xs">
                    {realTimeData.alerts.filter((a) => a.status === 'active')
                .length}
                  </ui_1.Badge>)}
              </ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="health">Health</ui_1.TabsTrigger>
            </ui_1.TabsList>

            <ui_1.TabsContent value="overview" className="space-y-4">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {realTimeData.metrics.map((metric) => (<ui_1.Card key={metric.id}>
                    <ui_1.CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {metric.type}
                        </span>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.value.toFixed(1)}
                        {metric.unit}
                      </div>
                      <div className="mt-2">
                        <ui_1.Progress value={metric.type === 'Attribution Risk'
                ? 100 - metric.value
                : metric.value} className="h-2"/>
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>))}
              </div>

              {/* Real-time Chart */}
              <ui_1.Card>
                <ui_1.CardHeader>
                  <ui_1.CardTitle className="text-lg">Performance Trends</ui_1.CardTitle>
                </ui_1.CardHeader>
                <ui_1.CardContent>
                  <recharts_1.ResponsiveContainer width="100%" height={300}>
                    <recharts_1.LineChart data={chartData}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                      <recharts_1.XAxis dataKey="time"/>
                      <recharts_1.YAxis />
                      <recharts_1.Tooltip />
                      <recharts_1.Line type="monotone" dataKey="effectiveness" stroke="#8884d8" strokeWidth={2} name="Effectiveness %"/>
                      <recharts_1.Line type="monotone" dataKey="engagement" stroke="#82ca9d" strokeWidth={2} name="Engagement %"/>
                      <recharts_1.Line type="monotone" dataKey="attribution" stroke="#ffc658" strokeWidth={2} name="Attribution Risk %"/>
                    </recharts_1.LineChart>
                  </recharts_1.ResponsiveContainer>
                </ui_1.CardContent>
              </ui_1.Card>
            </ui_1.TabsContent>

            <ui_1.TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {realTimeData.metrics.map((metric) => (<ui_1.Card key={metric.id}>
                    <ui_1.CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{metric.type}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last updated:{' '}
                            {metric.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold flex items-center">
                            {metric.value.toFixed(1)}
                            {metric.unit}
                            {getTrendIcon(metric.trend)}
                          </div>
                          <ui_1.Badge variant={metric.status === 'healthy'
                ? 'default'
                : 'destructive'} className="mt-1">
                            {metric.status}
                          </ui_1.Badge>
                        </div>
                      </div>
                      <div className="mt-4">
                        <ui_1.Progress value={metric.type === 'Attribution Risk'
                ? 100 - metric.value
                : metric.value} className="h-3"/>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0</span>
                          <span>
                            Target:{' '}
                            {metric.type === 'Attribution Risk' ? '<30' : '>80'}
                          </span>
                          <span>100</span>
                        </div>
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>))}
              </div>
            </ui_1.TabsContent>

            <ui_1.TabsContent value="alerts" className="space-y-4">
              {realTimeData.alerts.length > 0 ? (<div className="space-y-3">
                  {realTimeData.alerts
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((alert) => (<ui_1.Alert key={alert.id} className={`border-l-4 ${alert.severity === 'critical'
                    ? 'border-l-red-500'
                    : alert.severity === 'high'
                        ? 'border-l-orange-500'
                        : alert.severity === 'medium'
                            ? 'border-l-yellow-500'
                            : 'border-l-blue-500'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <lucide_react_1.AlertTriangle className="h-4 w-4"/>
                              <ui_1.Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </ui_1.Badge>
                              <ui_1.Badge variant="outline">{alert.type}</ui_1.Badge>
                              <ui_1.Badge variant={alert.status === 'active'
                    ? 'destructive'
                    : 'secondary'}>
                                {alert.status}
                              </ui_1.Badge>
                            </div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <ui_1.AlertDescription className="mt-1">
                              {alert.description}
                            </ui_1.AlertDescription>
                            <p className="text-xs text-muted-foreground mt-2">
                              {alert.timestamp.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            {alert.status === 'active' && (<>
                                <ui_1.Button variant="outline" size="sm">
                                  Acknowledge
                                </ui_1.Button>
                                <ui_1.Button variant="default" size="sm">
                                  Resolve
                                </ui_1.Button>
                              </>)}
                          </div>
                        </div>
                      </ui_1.Alert>))}
                </div>) : (<div className="text-center py-12">
                  <lucide_react_1.CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4"/>
                  <p className="text-muted-foreground">No active alerts</p>
                </div>)}
            </ui_1.TabsContent>

            <ui_1.TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Health Score */}
                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle className="flex items-center">
                      <lucide_react_1.Shield className="h-4 w-4 mr-2"/>
                      System Health
                    </ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent className="text-center">
                    <div className={`text-6xl font-bold mb-2 ${getHealthColor(realTimeData.healthScore.overall)}`}>
                      {realTimeData.healthScore.overall.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Overall Health Score
                    </div>
                    <ui_1.Badge variant={realTimeData.healthScore.status === 'healthy'
            ? 'default'
            : 'destructive'} className="text-sm">
                      {realTimeData.healthScore.status.toUpperCase()}
                    </ui_1.Badge>
                  </ui_1.CardContent>
                </ui_1.Card>

                {/* Health Breakdown */}
                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle>Health Breakdown</ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent className="space-y-4">
                    {[
            {
                label: 'Operational',
                value: realTimeData.healthScore.operational,
            },
            {
                label: 'Technical',
                value: realTimeData.healthScore.technical,
            },
            {
                label: 'Strategic',
                value: realTimeData.healthScore.strategic,
            },
            {
                label: 'Compliance',
                value: realTimeData.healthScore.compliance,
            },
        ].map((item) => (<div key={item.label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className={`font-medium ${getHealthColor(item.value)}`}>
                            {item.value.toFixed(0)}%
                          </span>
                        </div>
                        <ui_1.Progress value={item.value} className="h-2"/>
                      </div>))}
                  </ui_1.CardContent>
                </ui_1.Card>

                {/* Health Trends Chart */}
                <ui_1.Card className="lg:col-span-2">
                  <ui_1.CardHeader>
                    <ui_1.CardTitle>Health Trends (24h)</ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent>
                    <recharts_1.ResponsiveContainer width="100%" height={200}>
                      <recharts_1.AreaChart data={chartData}>
                        <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                        <recharts_1.XAxis dataKey="time"/>
                        <recharts_1.YAxis />
                        <recharts_1.Tooltip />
                        <recharts_1.Area type="monotone" dataKey="compliance" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="Compliance %"/>
                      </recharts_1.AreaChart>
                    </recharts_1.ResponsiveContainer>
                  </ui_1.CardContent>
                </ui_1.Card>
              </div>
            </ui_1.TabsContent>
          </ui_1.Tabs>
        </ui_1.CardContent>
      </ui_1.Card>
    </div>);
};
exports.default = MonitoringPanel;
