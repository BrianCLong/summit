"use strict";
/**
 * Enhanced Analytics Dashboard
 * Simplified version for IntelGraph with core analytics features
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
exports.EnhancedAnalyticsDashboard = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
// Mock data generator
const generateMetrics = () => [
    {
        id: 'total-entities',
        name: 'Total Entities',
        value: 15842,
        change: 12.5,
        trend: 'up',
        format: 'number',
        category: 'usage',
        description: 'Total number of entities in the graph database',
    },
    {
        id: 'active-users',
        name: 'Active Users',
        value: 87,
        change: -3.2,
        trend: 'down',
        format: 'number',
        category: 'usage',
        description: 'Number of users active in the last 24 hours',
    },
    {
        id: 'query-performance',
        name: 'Avg Query Time',
        value: 245,
        change: -15.8,
        trend: 'up',
        format: 'time',
        category: 'performance',
        description: 'Average query execution time in milliseconds',
    },
    {
        id: 'data-quality',
        name: 'Data Quality Score',
        value: 94.2,
        change: 2.1,
        trend: 'up',
        format: 'percentage',
        category: 'quality',
        description: 'Overall data quality and completeness score',
    },
    {
        id: 'security-alerts',
        name: 'Security Alerts',
        value: 3,
        change: -50,
        trend: 'up',
        format: 'number',
        category: 'security',
        description: 'Active security alerts requiring attention',
    },
    {
        id: 'api-calls',
        name: 'API Calls/Hour',
        value: 1247,
        change: 8.3,
        trend: 'up',
        format: 'number',
        category: 'usage',
        description: 'API calls processed in the last hour',
    },
];
const EnhancedAnalyticsDashboard = ({ onExport, onConfigChange, realTimeEnabled = true }) => {
    const [config, setConfig] = (0, react_1.useState)({
        timeRange: '24h',
        refreshInterval: 60,
        showRealTime: true,
    });
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [metrics, setMetrics] = (0, react_1.useState)(generateMetrics());
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(new Date());
    // Real-time data simulation
    (0, react_1.useEffect)(() => {
        if (!config.showRealTime || config.refreshInterval === 'manual')
            return;
        const interval = setInterval(() => {
            setMetrics((prev) => prev.map((metric) => ({
                ...metric,
                value: metric.value + (Math.random() - 0.5) * metric.value * 0.05,
                change: (Math.random() - 0.5) * 20,
            })));
            setLastUpdated(new Date());
        }, config.refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [config.showRealTime, config.refreshInterval]);
    const handleConfigChange = (0, react_1.useCallback)((newConfig) => {
        const updatedConfig = { ...config, ...newConfig };
        setConfig(updatedConfig);
        onConfigChange?.(updatedConfig);
    }, [config, onConfigChange]);
    const handleRefresh = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setMetrics(generateMetrics());
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);
    const formatValue = (value, format) => {
        switch (format) {
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'currency':
                return `$${value.toLocaleString()}`;
            case 'time':
                return `${Math.round(value)}ms`;
            default:
                return value.toLocaleString();
        }
    };
    const getTrendIcon = (trend, change) => {
        const isPositive = change > 0;
        return isPositive ? (<icons_material_1.TrendingUp fontSize="small" color="success"/>) : (<icons_material_1.TrendingDown fontSize="small" color="error"/>);
    };
    const getCategoryIcon = (category) => {
        switch (category) {
            case 'performance':
                return <icons_material_1.FlashOn fontSize="small"/>;
            case 'usage':
                return <icons_material_1.People fontSize="small"/>;
            case 'security':
                return <icons_material_1.Security fontSize="small"/>;
            case 'quality':
                return <icons_material_1.CheckCircle fontSize="small"/>;
            default:
                return <icons_material_1.BarChart fontSize="small"/>;
        }
    };
    const MetricCard = ({ metric }) => {
        return (<material_1.Card elevation={2} sx={{ height: '120px', cursor: 'pointer' }}>
        <material_1.CardContent>
          <material_1.Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
            }}>
            <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getCategoryIcon(metric.category)}
              <material_1.Typography variant="body2" color="text.secondary">
                {metric.name}
              </material_1.Typography>
            </material_1.Box>
            <material_1.Chip size="small" label={metric.category} variant="outlined"/>
          </material_1.Box>

          <material_1.Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {formatValue(metric.value, metric.format)}
          </material_1.Typography>

          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTrendIcon(metric.trend, metric.change)}
            <material_1.Typography variant="body2" color={metric.change > 0 ? 'success.main' : 'error.main'}>
              {metric.change > 0 ? '+' : ''}
              {metric.change.toFixed(1)}%
            </material_1.Typography>
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>);
    };
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
            Analytics Dashboard
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleString()}
          </material_1.Typography>
        </material_1.Box>

        <material_1.Stack direction="row" spacing={1}>
          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Time Range</material_1.InputLabel>
            <material_1.Select value={config.timeRange} label="Time Range" onChange={(e) => handleConfigChange({ timeRange: e.target.value })}>
              <material_1.MenuItem value="1h">Last Hour</material_1.MenuItem>
              <material_1.MenuItem value="24h">Last 24 Hours</material_1.MenuItem>
              <material_1.MenuItem value="7d">Last 7 Days</material_1.MenuItem>
              <material_1.MenuItem value="30d">Last 30 Days</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>

          <material_1.FormControlLabel control={<material_1.Switch checked={config.showRealTime} onChange={(e) => handleConfigChange({ showRealTime: e.target.checked })} size="small"/>} label="Real-time"/>

          <material_1.Tooltip title="Refresh Data">
            <material_1.IconButton onClick={handleRefresh} disabled={isLoading}>
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
      {isLoading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {/* Real-time Indicator */}
      {config.showRealTime && realTimeEnabled && (<material_1.Alert severity="info" sx={{ mb: 2 }}>
          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <material_1.Typography variant="body2">Real-time monitoring active</material_1.Typography>
            <material_1.Chip label={`Updates every ${config.refreshInterval}s`} size="small" color="info"/>
          </material_1.Box>
        </material_1.Alert>)}

      {/* Tabs */}
      <material_1.Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <material_1.Tab icon={<icons_material_1.BarChart />} label="Overview" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.TrendingUp />} label="Performance" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.People />} label="Usage" iconPosition="start"/>
        <material_1.Tab icon={<icons_material_1.Security />} label="Security" iconPosition="start"/>
      </material_1.Tabs>

      {/* Content */}
      {activeTab === 0 && (<material_1.Box>
          <material_1.Typography variant="h6" sx={{ mb: 2 }}>
            Key Metrics
          </material_1.Typography>
          <Grid_1.default container spacing={3}>
            {metrics.map((metric) => (<Grid_1.default xs={12} sm={6} md={4} key={metric.id}>
                <MetricCard metric={metric}/>
              </Grid_1.default>))}
          </Grid_1.default>
        </material_1.Box>)}

      {activeTab !== 0 && (<material_1.Alert severity="info">
          {['Performance', 'Usage', 'Security'][activeTab - 1]} analytics view
          coming soon...
        </material_1.Alert>)}
    </material_1.Box>);
};
exports.EnhancedAnalyticsDashboard = EnhancedAnalyticsDashboard;
exports.default = exports.EnhancedAnalyticsDashboard;
