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
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const ui_1 = require("@/components/ui");
const lucide_react_1 = require("lucide-react");
const queries_1 = require("../queries");
const OperationCard_1 = __importDefault(require("./OperationCard"));
const SimulationPanel_1 = __importDefault(require("./SimulationPanel"));
const ApprovalPanel_1 = __importDefault(require("./ApprovalPanel"));
const MonitoringPanel_1 = __importDefault(require("./MonitoringPanel"));
const PsyOpsPanel_1 = __importDefault(require("./PsyOpsPanel"));
const SecurityPanel_1 = __importDefault(require("./SecurityPanel"));
const ActiveMeasuresDashboard = ({ className, }) => {
    const [selectedOperation, setSelectedOperation] = (0, react_1.useState)(null);
    const [dashboardView, setDashboardView] = (0, react_1.useState)('overview');
    const [classificationFilter, setClassificationFilter] = (0, react_1.useState)('all');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    // GraphQL queries
    const { data: portfolioData, loading: portfolioLoading, error: portfolioError, } = (0, client_1.useQuery)(queries_1.GET_ACTIVE_MEASURES_PORTFOLIO, {
        variables: {
            filters: {
                classification: classificationFilter !== 'all' ? [classificationFilter] : undefined,
                status: statusFilter !== 'all' ? [statusFilter] : undefined,
            },
        },
        pollInterval: 30000, // Refresh every 30 seconds
    });
    const { data: operationsData, loading: operationsLoading } = (0, client_1.useQuery)(queries_1.GET_OPERATIONS, {
        variables: {
            status: statusFilter !== 'all' ? statusFilter : undefined,
            pagination: { limit: 50, offset: 0 },
        },
        pollInterval: 15000,
    });
    // Calculate portfolio statistics
    const portfolioStats = react_1.default.useMemo(() => {
        if (!operationsData?.getOperations?.operations) {
            return {
                totalOperations: 0,
                activeOperations: 0,
                successRate: 0,
                averageEffectiveness: 0,
                totalMeasures: 0,
                riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
            };
        }
        const operations = operationsData.getOperations.operations;
        const activeOps = operations.filter((op) => op.status === 'EXECUTING' || op.status === 'ACTIVE');
        const completedOps = operations.filter((op) => op.status === 'COMPLETED');
        const successfulOps = completedOps.filter((op) => op.effectiveness > 70);
        // Risk distribution
        const riskDistribution = operations.reduce((acc, op) => {
            acc[op.riskLevel.toLowerCase()] =
                (acc[op.riskLevel.toLowerCase()] || 0) + 1;
            return acc;
        }, { low: 0, medium: 0, high: 0, critical: 0 });
        return {
            totalOperations: operations.length,
            activeOperations: activeOps.length,
            successRate: completedOps.length > 0
                ? (successfulOps.length / completedOps.length) * 100
                : 0,
            averageEffectiveness: operations.length > 0
                ? operations.reduce((sum, op) => sum + (op.effectiveness || 0), 0) / operations.length
                : 0,
            totalMeasures: portfolioData?.activeMeasuresPortfolio?.measures?.length || 0,
            riskDistribution,
        };
    }, [operationsData, portfolioData]);
    const getRiskColor = (riskLevel) => {
        switch (riskLevel.toLowerCase()) {
            case 'low':
                return 'bg-green-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'high':
                return 'bg-orange-500';
            case 'critical':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
            case 'EXECUTING':
                return 'bg-green-500';
            case 'PAUSED':
                return 'bg-yellow-500';
            case 'COMPLETED':
                return 'bg-blue-500';
            case 'FAILED':
            case 'ABORTED':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };
    const getTrendIcon = (value, threshold = 0) => {
        if (value > threshold)
            return <lucide_react_1.TrendingUp className="h-4 w-4 text-green-500"/>;
        if (value < -threshold)
            return <lucide_react_1.TrendingDown className="h-4 w-4 text-red-500"/>;
        return <lucide_react_1.Minus className="h-4 w-4 text-gray-500"/>;
    };
    if (portfolioLoading || operationsLoading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>);
    }
    if (portfolioError) {
        return (<ui_1.Alert className="m-4">
        <lucide_react_1.AlertTriangle className="h-4 w-4"/>
        <ui_1.AlertDescription>
          Error loading portfolio data: {portfolioError.message}
        </ui_1.AlertDescription>
      </ui_1.Alert>);
    }
    return (<div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Active Measures Command Center
          </h1>
          <p className="text-muted-foreground">
            Comprehensive operational management and monitoring dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ui_1.Button variant={classificationFilter === 'SECRET' ? 'default' : 'outline'} size="sm" onClick={() => setClassificationFilter(classificationFilter === 'SECRET' ? 'all' : 'SECRET')} className="text-xs">
            <lucide_react_1.Shield className="h-3 w-3 mr-1"/>
            {classificationFilter === 'SECRET' ? (<lucide_react_1.Eye className="h-3 w-3"/>) : (<lucide_react_1.EyeOff className="h-3 w-3"/>)}
          </ui_1.Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">
              Total Operations
            </ui_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-muted-foreground"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">
              {portfolioStats.totalOperations}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ui_1.Badge variant="outline" className="mr-1">
                {portfolioStats.activeOperations} active
              </ui_1.Badge>
              {getTrendIcon(portfolioStats.activeOperations - 5)}{' '}
              {/* Mock trend */}
            </div>
          </ui_1.CardContent>
        </ui_1.Card>

        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">Success Rate</ui_1.CardTitle>
            <lucide_react_1.Target className="h-4 w-4 text-muted-foreground"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">
              {portfolioStats.successRate.toFixed(1)}%
            </div>
            <ui_1.Progress value={portfolioStats.successRate} className="mt-2"/>
          </ui_1.CardContent>
        </ui_1.Card>

        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">
              Avg Effectiveness
            </ui_1.CardTitle>
            <lucide_react_1.CheckCircle className="h-4 w-4 text-muted-foreground"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">
              {portfolioStats.averageEffectiveness.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: 75%
            </div>
          </ui_1.CardContent>
        </ui_1.Card>

        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">
              Risk Distribution
            </ui_1.CardTitle>
            <lucide_react_1.AlertTriangle className="h-4 w-4 text-muted-foreground"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="flex space-x-2">
              {Object.entries(portfolioStats.riskDistribution).map(([level, count]) => (<div key={level} className="flex flex-col items-center">
                    <div className={`h-8 w-6 rounded ${getRiskColor(level)}`} style={{
                height: `${Math.max(8, count * 4)}px`,
            }}/>
                    <span className="text-xs mt-1 capitalize">{level}</span>
                    <span className="text-xs font-bold">{count}</span>
                  </div>))}
            </div>
          </ui_1.CardContent>
        </ui_1.Card>
      </div>

      {/* Main Dashboard Tabs */}
      <ui_1.Tabs value={dashboardView} onValueChange={(value) => setDashboardView(value)} className="space-y-4">
        <ui_1.TabsList className="grid w-full grid-cols-4">
          <ui_1.TabsTrigger value="overview">Overview</ui_1.TabsTrigger>
          <ui_1.TabsTrigger value="operations">Operations</ui_1.TabsTrigger>
          <ui_1.TabsTrigger value="psyops">PsyOps</ui_1.TabsTrigger>
          <ui_1.TabsTrigger value="security">Security</ui_1.TabsTrigger>
        </ui_1.TabsList>

        <ui_1.TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Operations */}
            <ui_1.Card>
              <ui_1.CardHeader>
                <ui_1.CardTitle className="flex items-center">
                  <lucide_react_1.Clock className="h-5 w-5 mr-2"/>
                  Recent Operations
                </ui_1.CardTitle>
              </ui_1.CardHeader>
              <ui_1.CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {operationsData?.getOperations?.operations
            ?.slice(0, 8)
            .map((operation) => (<div key={operation.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedOperation(operation.id)}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm">
                              {operation.name}
                            </h4>
                            <ui_1.Badge variant="outline" className={`text-xs ${getStatusColor(operation.status)}`}>
                              {operation.status}
                            </ui_1.Badge>
                          </div>
                          <div className="flex items-center mt-1 text-xs text-muted-foreground">
                            <lucide_react_1.Users className="h-3 w-3 mr-1"/>
                            {operation.classification}
                            <ui_1.Separator orientation="vertical" className="mx-2 h-3"/>
                            Risk: {operation.riskLevel}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {operation.effectiveness}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            effectiveness
                          </div>
                        </div>
                      </div>))}
                </div>
              </ui_1.CardContent>
            </ui_1.Card>

            {/* System Health and Monitoring */}
            <MonitoringPanel_1.default operationId={selectedOperation}/>
          </div>

          {/* Portfolio Measures Grid */}
          <ui_1.Card>
            <ui_1.CardHeader>
              <ui_1.CardTitle>Available Measures Portfolio</ui_1.CardTitle>
              <div className="flex items-center space-x-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1 border rounded-md text-sm">
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </ui_1.CardHeader>
            <ui_1.CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolioData?.activeMeasuresPortfolio?.measures?.map((measure) => (<div key={measure.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm">{measure.name}</h3>
                        <ui_1.Badge variant="outline" className="text-xs">
                          {measure.category}
                        </ui_1.Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {measure.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center">
                          <lucide_react_1.Shield className="h-3 w-3 mr-1"/>
                          {(measure.unattributabilityScore * 100).toFixed(0)}%
                          unattributable
                        </span>
                        <span className="flex items-center">
                          <lucide_react_1.Target className="h-3 w-3 mr-1"/>
                          {(measure.effectivenessRating * 100).toFixed(0)}%
                          effective
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Risk Level</span>
                          <span className="capitalize">
                            {measure.riskLevel}
                          </span>
                        </div>
                        <div className={`h-1 rounded-full ${getRiskColor(measure.riskLevel)}`}/>
                      </div>
                    </div>))}
              </div>
            </ui_1.CardContent>
          </ui_1.Card>
        </ui_1.TabsContent>

        <ui_1.TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {operationsData?.getOperations?.operations?.map((operation) => (<OperationCard_1.default key={operation.id} operation={operation} selected={selectedOperation === operation.id} onSelect={() => setSelectedOperation(operation.id)}/>))}
          </div>
        </ui_1.TabsContent>

        <ui_1.TabsContent value="psyops" className="space-y-4">
          <PsyOpsPanel_1.default operationId={selectedOperation}/>
        </ui_1.TabsContent>

        <ui_1.TabsContent value="security" className="space-y-4">
          <SecurityPanel_1.default operationId={selectedOperation}/>
        </ui_1.TabsContent>
      </ui_1.Tabs>

      {/* Simulation and Approval Panels */}
      {selectedOperation && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimulationPanel_1.default operationId={selectedOperation}/>
          <ApprovalPanel_1.default operationId={selectedOperation}/>
        </div>)}
    </div>);
};
exports.default = ActiveMeasuresDashboard;
