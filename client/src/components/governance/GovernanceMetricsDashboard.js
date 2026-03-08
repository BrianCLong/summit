"use strict";
/**
 * AI Governance Metrics Dashboard
 * Real-time dashboard for AI governance metrics with ODNI compliance tracking
 * Implements p95 < 2s latency requirement
 */
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
exports.GovernanceMetricsDashboard = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
// GraphQL Queries
const GET_GOVERNANCE_METRICS = (0, client_1.gql) `
  query GetGovernanceMetrics($input: GovernanceMetricsInput!) {
    governanceMetrics(input: $input) {
      validationRate {
        totalDecisions
        validatedDecisions
        validationRate
        targetRate
        trend
        breakdown {
          category
          validated
          total
          rate
          compliant
        }
        lastUpdated
        meetsODNIRequirement
      }
      incidentTrends {
        current {
          totalIncidents
          resolvedIncidents
          mttr
          startDate
          endDate
        }
        previous {
          totalIncidents
        }
        trend
        byCategory {
          name
          count
          percentOfTotal
          trend
        }
        bySeverity {
          severity
          count
          percentOfTotal
          avgResolutionTime
        }
        timeline {
          timestamp
          incidents
          resolved
          validationRate
        }
      }
      complianceGaps {
        id
        framework
        requirement
        category
        severity
        description
        currentState
        requiredState
        remediationPlan
        dueDate
        owner
        status
        daysUntilDue
      }
      riskScore {
        overall
        components {
          name
          score
          status
        }
        trend
        riskLevel
      }
      auditTrail {
        id
        timestamp
        eventType
        actor
        resource
        action
        outcome
        riskLevel
      }
      modelGovernance {
        totalModels
        approvedModels
        pendingReview
        rejectedModels
        deploymentMetrics {
          totalDeployments
          successfulDeployments
          failedDeployments
          successRate
        }
        biasMetrics {
          modelsAudited
          biasDetected
          biasRemediations
          detectionRate
        }
        approvalRate
      }
      overallCompliance {
        isCompliant
        validationMeetsODNI
        criticalGapsCount
        highGapsCount
        riskLevel
      }
      timestamp
    }
  }
`;
const GOVERNANCE_METRICS_SUBSCRIPTION = (0, client_1.gql) `
  subscription OnGovernanceMetricsUpdated($tenantId: String!) {
    governanceMetricsUpdated(tenantId: $tenantId) {
      validationRate {
        validationRate
        meetsODNIRequirement
      }
      riskScore {
        overall
        riskLevel
      }
      timestamp
    }
  }
`;
// Helper Components
const TrendIndicator = ({ trend, value, }) => {
    const Icon = trend === 'UP'
        ? icons_material_1.TrendingUp
        : trend === 'DOWN'
            ? icons_material_1.TrendingDown
            : icons_material_1.TrendingFlat;
    const color = trend === 'UP' ? 'success.main' : trend === 'DOWN' ? 'error.main' : 'grey.500';
    return (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Icon fontSize="small" sx={{ color }}/>
      {value !== undefined && (<material_1.Typography variant="body2" sx={{ color }}>
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}%
        </material_1.Typography>)}
    </material_1.Box>);
};
const SeverityChip = ({ severity }) => {
    const colorMap = {
        CRITICAL: 'error',
        HIGH: 'warning',
        MEDIUM: 'info',
        LOW: 'success',
    };
    return (<material_1.Chip label={severity} color={colorMap[severity] || 'default'} size="small" sx={{ fontWeight: 600 }}/>);
};
const StatusChip = ({ status }) => {
    const colorMap = {
        OPEN: 'error',
        IN_PROGRESS: 'warning',
        MITIGATED: 'success',
        ACCEPTED: 'default',
    };
    return (<material_1.Chip label={status.replace('_', ' ')} color={colorMap[status] || 'default'} size="small" variant="outlined"/>);
};
// Main Dashboard Component
const GovernanceMetricsDashboard = ({ tenantId, onExport, realTimeEnabled = true }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [timeRangeLabel, setTimeRangeLabel] = (0, react_1.useState)('24h');
    const [autoRefresh, setAutoRefresh] = (0, react_1.useState)(realTimeEnabled);
    const timeRange = (0, react_1.useMemo)(() => {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
        };
        return {
            start: now - ranges[timeRangeLabel],
            end: now,
            label: timeRangeLabel,
        };
    }, [timeRangeLabel]);
    const { data, loading, error, refetch } = (0, client_1.useQuery)(GET_GOVERNANCE_METRICS, {
        variables: {
            input: {
                tenantId,
                timeRange,
                includeHistorical: true,
            },
        },
        pollInterval: autoRefresh ? 30000 : 0, // Poll every 30s if auto-refresh enabled
    });
    // Real-time subscription
    (0, client_1.useSubscription)(GOVERNANCE_METRICS_SUBSCRIPTION, {
        variables: { tenantId },
        skip: !realTimeEnabled,
        onData: () => {
            // Metrics will update via subscription
        },
    });
    const handleRefresh = (0, react_1.useCallback)(() => {
        refetch();
    }, [refetch]);
    const metrics = data?.governanceMetrics;
    if (loading && !metrics) {
        return (<material_1.Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
            }}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Alert severity="error">
        <material_1.AlertTitle>Error Loading Governance Metrics</material_1.AlertTitle>
        {error.message}
      </material_1.Alert>);
    }
    return (<material_1.Box sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
        }}>
        <material_1.Box>
          <material_1.Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            AI Governance Dashboard
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Last updated:{' '}
            {metrics?.timestamp
            ? new Date(metrics.timestamp).toLocaleString()
            : 'N/A'}
          </material_1.Typography>
        </material_1.Box>

        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Time Range</material_1.InputLabel>
            <material_1.Select value={timeRangeLabel} label="Time Range" onChange={(e) => setTimeRangeLabel(e.target.value)}>
              <material_1.MenuItem value="1h">Last Hour</material_1.MenuItem>
              <material_1.MenuItem value="24h">Last 24 Hours</material_1.MenuItem>
              <material_1.MenuItem value="7d">Last 7 Days</material_1.MenuItem>
              <material_1.MenuItem value="30d">Last 30 Days</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>

          <material_1.FormControlLabel control={<material_1.Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} size="small"/>} label="Auto-refresh"/>

          <material_1.Tooltip title="Refresh Now">
            <material_1.IconButton onClick={handleRefresh} disabled={loading}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Tooltip>

          <material_1.Tooltip title="Export Data">
            <material_1.IconButton onClick={() => onExport?.('csv')}>
              <icons_material_1.Download />
            </material_1.IconButton>
          </material_1.Tooltip>

          <material_1.Tooltip title="Settings">
            <material_1.IconButton>
              <icons_material_1.Settings />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Stack>
      </material_1.Box>

      {/* Loading Progress */}
      {loading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {/* Compliance Alert Banner */}
      {metrics?.overallCompliance && !metrics.overallCompliance.isCompliant && (<material_1.Alert severity="warning" sx={{ mb: 3 }} icon={<icons_material_1.Warning />} action={<material_1.Button color="inherit" size="small">
              View Details
            </material_1.Button>}>
          <material_1.AlertTitle>Compliance Issues Detected</material_1.AlertTitle>
          {!metrics.overallCompliance.validationMeetsODNI && (<material_1.Typography variant="body2">
              ODNI Validation Rate below 85% target (current:{' '}
              {metrics.validationRate?.validationRate?.toFixed(1)}%)
            </material_1.Typography>)}
          {metrics.overallCompliance.criticalGapsCount > 0 && (<material_1.Typography variant="body2">
              {metrics.overallCompliance.criticalGapsCount} critical compliance
              gap(s) require immediate attention
            </material_1.Typography>)}
        </material_1.Alert>)}

      {/* Key Metrics Cards */}
      <Grid_1.default container spacing={3} sx={{ mb: 3 }}>
        {/* ODNI Validation Rate Card */}
        <Grid_1.default xs={12} sm={6} md={3}>
          <material_1.Card elevation={2} sx={{
            borderLeft: 4,
            borderColor: metrics?.validationRate?.meetsODNIRequirement
                ? 'success.main'
                : 'error.main',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
        }}>
                <material_1.Typography variant="body2" color="text.secondary">
                  ODNI Validation Rate
                </material_1.Typography>
                <material_1.Chip label="85% Target" size="small" color={metrics?.validationRate?.meetsODNIRequirement
            ? 'success'
            : 'error'}/>
              </material_1.Box>
              <material_1.Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.validationRate?.validationRate?.toFixed(1) || 0}%
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator trend={metrics?.validationRate?.trend || 'STABLE'}/>
                <material_1.Typography variant="body2" color="text.secondary">
                  {metrics?.validationRate?.validatedDecisions || 0} /{' '}
                  {metrics?.validationRate?.totalDecisions || 0} decisions
                </material_1.Typography>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {/* Risk Score Card */}
        <Grid_1.default xs={12} sm={6} md={3}>
          <material_1.Card elevation={2} sx={{
            borderLeft: 4,
            borderColor: metrics?.riskScore?.riskLevel === 'LOW'
                ? 'success.main'
                : metrics?.riskScore?.riskLevel === 'MEDIUM'
                    ? 'warning.main'
                    : 'error.main',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
        }}>
                <material_1.Typography variant="body2" color="text.secondary">
                  Risk Score
                </material_1.Typography>
                <SeverityChip severity={metrics?.riskScore?.riskLevel || 'LOW'}/>
              </material_1.Box>
              <material_1.Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.riskScore?.overall?.toFixed(0) || 0}
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator trend={metrics?.riskScore?.trend || 'STABLE'}/>
                <material_1.Typography variant="body2" color="text.secondary">
                  {metrics?.riskScore?.components?.length || 0} components tracked
                </material_1.Typography>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {/* Active Incidents Card */}
        <Grid_1.default xs={12} sm={6} md={3}>
          <material_1.Card elevation={2} sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <material_1.CardContent>
              <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
        }}>
                <material_1.Typography variant="body2" color="text.secondary">
                  Active Incidents
                </material_1.Typography>
                <icons_material_1.BugReport color="warning"/>
              </material_1.Box>
              <material_1.Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {(metrics?.incidentTrends?.current?.totalIncidents || 0) -
            (metrics?.incidentTrends?.current?.resolvedIncidents || 0)}
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator trend={metrics?.incidentTrends?.trend || 'STABLE'}/>
                <material_1.Typography variant="body2" color="text.secondary">
                  MTTR: {Math.round((metrics?.incidentTrends?.current?.mttr || 0) / 60)}m
                </material_1.Typography>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {/* Compliance Gaps Card */}
        <Grid_1.default xs={12} sm={6} md={3}>
          <material_1.Card elevation={2} sx={{
            borderLeft: 4,
            borderColor: (metrics?.overallCompliance?.criticalGapsCount || 0) > 0
                ? 'error.main'
                : 'success.main',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
        }}>
                <material_1.Typography variant="body2" color="text.secondary">
                  Compliance Gaps
                </material_1.Typography>
                <icons_material_1.Gavel color={(metrics?.overallCompliance?.criticalGapsCount || 0) > 0
            ? 'error'
            : 'success'}/>
              </material_1.Box>
              <material_1.Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.complianceGaps?.length || 0}
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="body2" color="error.main">
                  {metrics?.overallCompliance?.criticalGapsCount || 0} critical
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  / {metrics?.overallCompliance?.highGapsCount || 0} high
                </material_1.Typography>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      {/* Tabs */}
      <material_1.Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <material_1.Tab icon={<icons_material_1.Assessment />} label="Overview" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.Security />} label="Validation" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.Timeline />} label="Incidents" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.Gavel />} label="Compliance Gaps" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.Speed />} label="Model Governance" iconPosition="start"/>
      </material_1.Tabs>

      {/* Tab Content */}
      {activeTab === 0 && (<OverviewTab metrics={metrics}/>)}

      {activeTab === 1 && (<ValidationTab validationMetrics={metrics?.validationRate}/>)}

      {activeTab === 2 && (<IncidentsTab incidentTrends={metrics?.incidentTrends}/>)}

      {activeTab === 3 && (<ComplianceGapsTab gaps={metrics?.complianceGaps || []}/>)}

      {activeTab === 4 && (<ModelGovernanceTab modelGovernance={metrics?.modelGovernance}/>)}
    </material_1.Box>);
};
exports.GovernanceMetricsDashboard = GovernanceMetricsDashboard;
// Sub-components for each tab
const OverviewTab = ({ metrics }) => (<Grid_1.default container spacing={3}>
    {/* Validation Breakdown */}
    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Validation by Category
        </material_1.Typography>
        <material_1.TableContainer>
          <material_1.Table size="small">
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>Category</material_1.TableCell>
                <material_1.TableCell align="right">Rate</material_1.TableCell>
                <material_1.TableCell align="center">Status</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {metrics?.validationRate?.breakdown?.map((item) => (<material_1.TableRow key={item.category}>
                  <material_1.TableCell>{item.category}</material_1.TableCell>
                  <material_1.TableCell align="right">{item.rate?.toFixed(1)}%</material_1.TableCell>
                  <material_1.TableCell align="center">
                    {item.compliant ? (<icons_material_1.CheckCircle color="success" fontSize="small"/>) : (<icons_material_1.Error color="error" fontSize="small"/>)}
                  </material_1.TableCell>
                </material_1.TableRow>))}
            </material_1.TableBody>
          </material_1.Table>
        </material_1.TableContainer>
      </material_1.Paper>
    </Grid_1.default>

    {/* Risk Components */}
    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Risk Components
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          {metrics?.riskScore?.components?.map((component) => (<material_1.Box key={component.name}>
              <material_1.Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 0.5,
        }}>
                <material_1.Typography variant="body2">{component.name}</material_1.Typography>
                <material_1.Typography variant="body2" fontWeight={600}>
                  {component.score?.toFixed(0)}
                </material_1.Typography>
              </material_1.Box>
              <material_1.LinearProgress variant="determinate" value={component.score} color={component.status === 'HEALTHY'
            ? 'success'
            : component.status === 'WARNING'
                ? 'warning'
                : 'error'} sx={{ height: 8, borderRadius: 4 }}/>
            </material_1.Box>))}
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    {/* Recent Audit Events */}
    <Grid_1.default xs={12}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Recent Audit Events
        </material_1.Typography>
        <material_1.TableContainer>
          <material_1.Table size="small">
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>Time</material_1.TableCell>
                <material_1.TableCell>Event Type</material_1.TableCell>
                <material_1.TableCell>Actor</material_1.TableCell>
                <material_1.TableCell>Resource</material_1.TableCell>
                <material_1.TableCell>Action</material_1.TableCell>
                <material_1.TableCell>Outcome</material_1.TableCell>
                <material_1.TableCell>Risk</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {metrics?.auditTrail?.slice(0, 10).map((event) => (<material_1.TableRow key={event.id}>
                  <material_1.TableCell>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </material_1.TableCell>
                  <material_1.TableCell>{event.eventType.replace(/_/g, ' ')}</material_1.TableCell>
                  <material_1.TableCell>{event.actor}</material_1.TableCell>
                  <material_1.TableCell>{event.resource}</material_1.TableCell>
                  <material_1.TableCell>{event.action}</material_1.TableCell>
                  <material_1.TableCell>
                    <material_1.Chip label={event.outcome} size="small" color={event.outcome === 'SUCCESS'
            ? 'success'
            : event.outcome === 'FAILURE'
                ? 'error'
                : 'warning'}/>
                  </material_1.TableCell>
                  <material_1.TableCell>
                    <SeverityChip severity={event.riskLevel}/>
                  </material_1.TableCell>
                </material_1.TableRow>))}
            </material_1.TableBody>
          </material_1.Table>
        </material_1.TableContainer>
      </material_1.Paper>
    </Grid_1.default>
  </Grid_1.default>);
const ValidationTab = ({ validationMetrics, }) => (<Grid_1.default container spacing={3}>
    <Grid_1.default xs={12}>
      <material_1.Alert severity={validationMetrics?.meetsODNIRequirement ? 'success' : 'error'} icon={validationMetrics?.meetsODNIRequirement ? (<icons_material_1.CheckCircle />) : (<icons_material_1.Warning />)}>
        <material_1.AlertTitle>
          ODNI 85% Validation Requirement:{' '}
          {validationMetrics?.meetsODNIRequirement ? 'Met' : 'Not Met'}
        </material_1.AlertTitle>
        Current validation rate: {validationMetrics?.validationRate?.toFixed(2)}%
        (Target: {validationMetrics?.targetRate}%)
      </material_1.Alert>
    </Grid_1.default>

    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Validation Summary
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Total Decisions</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {validationMetrics?.totalDecisions?.toLocaleString()}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Validated Decisions</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {validationMetrics?.validatedDecisions?.toLocaleString()}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Divider />
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Validation Rate</material_1.Typography>
            <material_1.Typography fontWeight={600} color={validationMetrics?.meetsODNIRequirement
        ? 'success.main'
        : 'error.main'}>
              {validationMetrics?.validationRate?.toFixed(2)}%
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Category Breakdown
        </material_1.Typography>
        <material_1.TableContainer>
          <material_1.Table size="small">
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>Category</material_1.TableCell>
                <material_1.TableCell align="right">Validated</material_1.TableCell>
                <material_1.TableCell align="right">Total</material_1.TableCell>
                <material_1.TableCell align="right">Rate</material_1.TableCell>
                <material_1.TableCell align="center">Compliant</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {validationMetrics?.breakdown?.map((item) => (<material_1.TableRow key={item.category}>
                  <material_1.TableCell>{item.category}</material_1.TableCell>
                  <material_1.TableCell align="right">{item.validated}</material_1.TableCell>
                  <material_1.TableCell align="right">{item.total}</material_1.TableCell>
                  <material_1.TableCell align="right">{item.rate?.toFixed(1)}%</material_1.TableCell>
                  <material_1.TableCell align="center">
                    {item.compliant ? (<icons_material_1.CheckCircle color="success" fontSize="small"/>) : (<icons_material_1.Error color="error" fontSize="small"/>)}
                  </material_1.TableCell>
                </material_1.TableRow>))}
            </material_1.TableBody>
          </material_1.Table>
        </material_1.TableContainer>
      </material_1.Paper>
    </Grid_1.default>
  </Grid_1.default>);
const IncidentsTab = ({ incidentTrends }) => (<Grid_1.default container spacing={3}>
    <Grid_1.default xs={12} md={4}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Current Period
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Total Incidents</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {incidentTrends?.current?.totalIncidents || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Resolved</material_1.Typography>
            <material_1.Typography fontWeight={600} color="success.main">
              {incidentTrends?.current?.resolvedIncidents || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>MTTR</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {Math.round((incidentTrends?.current?.mttr || 0) / 60)} min
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    <Grid_1.default xs={12} md={4}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          By Severity
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          {incidentTrends?.bySeverity?.map((item) => (<material_1.Box key={item.severity} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <SeverityChip severity={item.severity}/>
              <material_1.Typography fontWeight={600}>
                {item.count} ({item.percentOfTotal?.toFixed(1)}%)
              </material_1.Typography>
            </material_1.Box>))}
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    <Grid_1.default xs={12} md={4}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          By Category
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          {incidentTrends?.byCategory?.map((item) => (<material_1.Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <material_1.Typography>{item.name}</material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography fontWeight={600}>{item.count}</material_1.Typography>
                <TrendIndicator trend={item.trend}/>
              </material_1.Box>
            </material_1.Box>))}
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>
  </Grid_1.default>);
const ComplianceGapsTab = ({ gaps }) => (<material_1.Paper sx={{ p: 3 }}>
    <material_1.Typography variant="h6" sx={{ mb: 2 }}>
      Open Compliance Gaps ({gaps.length})
    </material_1.Typography>
    {gaps.length === 0 ? (<material_1.Alert severity="success">
        No open compliance gaps. All requirements are met.
      </material_1.Alert>) : (<material_1.TableContainer>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Framework</material_1.TableCell>
              <material_1.TableCell>Requirement</material_1.TableCell>
              <material_1.TableCell>Category</material_1.TableCell>
              <material_1.TableCell>Severity</material_1.TableCell>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Due</material_1.TableCell>
              <material_1.TableCell>Owner</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {gaps.map((gap) => (<material_1.TableRow key={gap.id} sx={{
                bgcolor: gap.severity === 'CRITICAL'
                    ? 'error.light'
                    : gap.severity === 'HIGH'
                        ? 'warning.light'
                        : 'inherit',
            }}>
                <material_1.TableCell>{gap.framework}</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Tooltip title={gap.description}>
                    <material_1.Typography variant="body2">{gap.requirement}</material_1.Typography>
                  </material_1.Tooltip>
                </material_1.TableCell>
                <material_1.TableCell>{gap.category}</material_1.TableCell>
                <material_1.TableCell>
                  <SeverityChip severity={gap.severity}/>
                </material_1.TableCell>
                <material_1.TableCell>
                  <StatusChip status={gap.status}/>
                </material_1.TableCell>
                <material_1.TableCell>
                  {gap.daysUntilDue !== null && (<material_1.Typography variant="body2" color={gap.daysUntilDue < 0 ? 'error.main' : 'text.secondary'}>
                      {gap.daysUntilDue < 0
                    ? `${Math.abs(gap.daysUntilDue)} days overdue`
                    : `${gap.daysUntilDue} days`}
                    </material_1.Typography>)}
                </material_1.TableCell>
                <material_1.TableCell>{gap.owner || 'Unassigned'}</material_1.TableCell>
              </material_1.TableRow>))}
          </material_1.TableBody>
        </material_1.Table>
      </material_1.TableContainer>)}
  </material_1.Paper>);
const ModelGovernanceTab = ({ modelGovernance, }) => (<Grid_1.default container spacing={3}>
    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Model Status
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Total Models</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {modelGovernance?.totalModels || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Approved</material_1.Typography>
            <material_1.Typography fontWeight={600} color="success.main">
              {modelGovernance?.approvedModels || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Pending Review</material_1.Typography>
            <material_1.Typography fontWeight={600} color="warning.main">
              {modelGovernance?.pendingReview || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Rejected</material_1.Typography>
            <material_1.Typography fontWeight={600} color="error.main">
              {modelGovernance?.rejectedModels || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Divider />
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Approval Rate</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {modelGovernance?.approvalRate?.toFixed(1) || 0}%
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    <Grid_1.default xs={12} md={6}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Deployment Metrics
        </material_1.Typography>
        <material_1.Stack spacing={2}>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Total Deployments</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {modelGovernance?.deploymentMetrics?.totalDeployments || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Successful</material_1.Typography>
            <material_1.Typography fontWeight={600} color="success.main">
              {modelGovernance?.deploymentMetrics?.successfulDeployments || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Failed</material_1.Typography>
            <material_1.Typography fontWeight={600} color="error.main">
              {modelGovernance?.deploymentMetrics?.failedDeployments || 0}
            </material_1.Typography>
          </material_1.Box>
          <material_1.Divider />
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <material_1.Typography>Success Rate</material_1.Typography>
            <material_1.Typography fontWeight={600}>
              {modelGovernance?.deploymentMetrics?.successRate?.toFixed(1) || 0}%
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
      </material_1.Paper>
    </Grid_1.default>

    <Grid_1.default xs={12}>
      <material_1.Paper sx={{ p: 3 }}>
        <material_1.Typography variant="h6" sx={{ mb: 2 }}>
          Bias Detection & Remediation
        </material_1.Typography>
        <Grid_1.default container spacing={3}>
          <Grid_1.default xs={3}>
            <material_1.Typography variant="body2" color="text.secondary">
              Models Audited
            </material_1.Typography>
            <material_1.Typography variant="h5" fontWeight={600}>
              {modelGovernance?.biasMetrics?.modelsAudited || 0}
            </material_1.Typography>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Typography variant="body2" color="text.secondary">
              Bias Detected
            </material_1.Typography>
            <material_1.Typography variant="h5" fontWeight={600} color="warning.main">
              {modelGovernance?.biasMetrics?.biasDetected || 0}
            </material_1.Typography>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Typography variant="body2" color="text.secondary">
              Remediations
            </material_1.Typography>
            <material_1.Typography variant="h5" fontWeight={600} color="success.main">
              {modelGovernance?.biasMetrics?.biasRemediations || 0}
            </material_1.Typography>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Typography variant="body2" color="text.secondary">
              Detection Rate
            </material_1.Typography>
            <material_1.Typography variant="h5" fontWeight={600}>
              {modelGovernance?.biasMetrics?.detectionRate?.toFixed(1) || 0}%
            </material_1.Typography>
          </Grid_1.default>
        </Grid_1.default>
      </material_1.Paper>
    </Grid_1.default>
  </Grid_1.default>);
exports.default = exports.GovernanceMetricsDashboard;
