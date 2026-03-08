"use strict";
/**
 * Governance Dashboard
 *
 * Main dashboard for governance analytics and metrics visualization.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module pages/Analytics/GovernanceDashboard
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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useAnalytics_1 = require("../../../hooks/useAnalytics");
const MetricCard = ({ title, value, subtitle, color = 'primary.main', icon, trend, trendValue, }) => (<material_1.Card sx={{ height: '100%' }}>
    <material_1.CardContent>
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <material_1.Box>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </material_1.Typography>
          <material_1.Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </material_1.Typography>
          {subtitle && (<material_1.Typography variant="caption" color="text.secondary">
              {subtitle}
            </material_1.Typography>)}
        </material_1.Box>
        {icon && (<material_1.Box sx={{ color, opacity: 0.8 }}>
            {icon}
          </material_1.Box>)}
      </material_1.Box>
      {trend && trendValue && (<material_1.Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          {trend === 'up' ? (<icons_material_1.TrendingUp fontSize="small" color="success"/>) : trend === 'down' ? (<icons_material_1.TrendingDown fontSize="small" color="error"/>) : null}
          <material_1.Typography variant="caption" color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'} sx={{ ml: 0.5 }}>
            {trendValue}
          </material_1.Typography>
        </material_1.Box>)}
    </material_1.CardContent>
  </material_1.Card>);
const HealthScoreGauge = ({ score }) => {
    const getColor = () => {
        if (score >= 80)
            return 'success.main';
        if (score >= 60)
            return 'warning.main';
        return 'error.main';
    };
    return (<material_1.Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <material_1.CircularProgress variant="determinate" value={score} size={120} thickness={8} sx={{ color: getColor() }}/>
      <material_1.Box sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
        <material_1.Typography variant="h4" component="div" fontWeight="bold">
          {score}
        </material_1.Typography>
        <material_1.Typography variant="caption" color="text.secondary">
          Health
        </material_1.Typography>
      </material_1.Box>
    </material_1.Box>);
};
// ============================================================================
// Main Component
// ============================================================================
const GovernanceDashboard = () => {
    const [timePreset, setTimePreset] = (0, react_1.useState)('7d');
    const metrics = (0, useAnalytics_1.useGovernanceMetrics)(timePreset);
    const trends = (0, useAnalytics_1.useVerdictTrends)(timePreset);
    const policies = (0, useAnalytics_1.usePolicyEffectiveness)(timePreset, 5);
    const anomalies = (0, useAnalytics_1.useAnomalies)(timePreset);
    const handleTimeRangeChange = (0, react_1.useCallback)((event) => {
        setTimePreset(event.target.value);
    }, []);
    const handleRefresh = (0, react_1.useCallback)(() => {
        metrics.refresh();
        trends.refresh();
        policies.refresh();
        anomalies.refresh();
    }, [metrics, trends, policies, anomalies]);
    const isLoading = metrics.loading || trends.loading || policies.loading || anomalies.loading;
    const hasError = metrics.error || trends.error || policies.error || anomalies.error;
    return (<material_1.Box sx={{ p: 3 }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Box>
          <material_1.Typography variant="h4" component="h1">
            Governance Analytics
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Monitor policy effectiveness, verdicts, and system health
          </material_1.Typography>
        </material_1.Box>
        <material_1.Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <material_1.FormControl size="small" sx={{ minWidth: 150 }}>
            <material_1.InputLabel>Time Range</material_1.InputLabel>
            <material_1.Select value={timePreset} onChange={handleTimeRangeChange} label="Time Range">
              {useAnalytics_1.TIME_RANGE_PRESETS.map((preset) => (<material_1.MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </material_1.MenuItem>))}
            </material_1.Select>
          </material_1.FormControl>
          <material_1.Tooltip title="Refresh">
            <material_1.IconButton onClick={handleRefresh} disabled={isLoading}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Box>
      </material_1.Box>

      {isLoading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {hasError && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {metrics.error || trends.error || policies.error || anomalies.error}
        </material_1.Alert>)}

      <material_1.Grid container spacing={3}>
        {/* Health Score */}
        <material_1.Grid xs={12} md={3}>
          <material_1.Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              System Health
            </material_1.Typography>
            <HealthScoreGauge score={metrics.data?.healthScore || 0}/>
            <material_1.Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {metrics.data?.lastUpdated
            ? `Updated ${new Date(metrics.data.lastUpdated).toLocaleTimeString()}`
            : 'Loading...'}
            </material_1.Typography>
          </material_1.Paper>
        </material_1.Grid>

        {/* Verdict Distribution */}
        <material_1.Grid xs={12} md={9}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Verdict Distribution
            </material_1.Typography>
            <material_1.Grid container spacing={2}>
              <material_1.Grid xs={6} sm={3}>
                <MetricCard title="Allowed" value={metrics.data?.verdictDistribution.allow || 0} color="success.main" icon={<icons_material_1.CheckCircle fontSize="large"/>}/>
              </material_1.Grid>
              <material_1.Grid xs={6} sm={3}>
                <MetricCard title="Denied" value={metrics.data?.verdictDistribution.deny || 0} color="error.main" icon={<icons_material_1.Block fontSize="large"/>}/>
              </material_1.Grid>
              <material_1.Grid xs={6} sm={3}>
                <MetricCard title="Escalated" value={metrics.data?.verdictDistribution.escalate || 0} color="warning.main" icon={<icons_material_1.Warning fontSize="large"/>}/>
              </material_1.Grid>
              <material_1.Grid xs={6} sm={3}>
                <MetricCard title="Warned" value={metrics.data?.verdictDistribution.warn || 0} color="info.main" icon={<icons_material_1.Security fontSize="large"/>}/>
              </material_1.Grid>
            </material_1.Grid>
            {metrics.data?.verdictDistribution && (<material_1.Box sx={{ mt: 2 }}>
                <material_1.Typography variant="body2" color="text.secondary">
                  Total: {metrics.data.verdictDistribution.total.toLocaleString()} verdicts
                </material_1.Typography>
              </material_1.Box>)}
          </material_1.Paper>
        </material_1.Grid>

        {/* Top Policies */}
        <material_1.Grid xs={12} md={6}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Top Active Policies
            </material_1.Typography>
            {policies.data && policies.data.length > 0 ? (<material_1.List dense>
                {policies.data.map((policy) => (<material_1.ListItem key={policy.policyId}>
                    <material_1.ListItemIcon>
                      <icons_material_1.Speed color={policy.denyRate > 50 ? 'error' : 'primary'}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary={policy.policyName} secondary={`${policy.triggerCount} triggers | ${policy.denyRate}% deny rate`}/>
                    <material_1.Chip size="small" label={`${policy.averageLatencyMs}ms`} color={policy.averageLatencyMs < 100 ? 'success' : 'warning'}/>
                  </material_1.ListItem>))}
              </material_1.List>) : (<material_1.Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No policy data available
              </material_1.Typography>)}
          </material_1.Paper>
        </material_1.Grid>

        {/* Anomalies */}
        <material_1.Grid xs={12} md={6}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Detected Anomalies
            </material_1.Typography>
            {anomalies.data && anomalies.data.length > 0 ? (<material_1.List dense>
                {anomalies.data.map((anomaly) => (<material_1.ListItem key={anomaly.id}>
                    <material_1.ListItemIcon>
                      <icons_material_1.Warning color={anomaly.severity === 'critical' || anomaly.severity === 'high'
                    ? 'error'
                    : anomaly.severity === 'medium'
                        ? 'warning'
                        : 'info'}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary={anomaly.description} secondary={new Date(anomaly.detectedAt).toLocaleString()}/>
                    <material_1.Chip size="small" label={anomaly.severity} color={anomaly.severity === 'critical' || anomaly.severity === 'high'
                    ? 'error'
                    : anomaly.severity === 'medium'
                        ? 'warning'
                        : 'default'}/>
                  </material_1.ListItem>))}
              </material_1.List>) : (<material_1.Alert severity="success" sx={{ mt: 1 }}>
                No anomalies detected in the selected time range.
              </material_1.Alert>)}
          </material_1.Paper>
        </material_1.Grid>

        {/* Trends Chart Placeholder */}
        <material_1.Grid xs={12}>
          <material_1.Paper sx={{ p: 2 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Verdict Trends
            </material_1.Typography>
            {trends.data && trends.data.length > 0 ? (<material_1.Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 1, p: 2 }}>
                {trends.data.map((trend, index) => {
                const total = trend.allow + trend.deny + trend.escalate + trend.warn;
                const maxTotal = Math.max(...trends.data.map((t) => t.allow + t.deny + t.escalate + t.warn));
                const heightPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                return (<material_1.Tooltip key={index} title={`${trend.date}: ${total} total (${trend.allow} allow, ${trend.deny} deny)`}>
                      <material_1.Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                        <material_1.Box sx={{
                        width: '100%',
                        height: `${heightPercent}%`,
                        minHeight: 4,
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                    }}/>
                        <material_1.Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                          {trend.date.slice(-5)}
                        </material_1.Typography>
                      </material_1.Box>
                    </material_1.Tooltip>);
            })}
              </material_1.Box>) : (<material_1.Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No trend data available
              </material_1.Typography>)}
          </material_1.Paper>
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.default = GovernanceDashboard;
