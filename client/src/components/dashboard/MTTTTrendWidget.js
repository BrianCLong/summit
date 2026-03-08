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
exports.default = MTTTTrendWidget;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Select_1 = __importDefault(require("@mui/material/Select"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const recharts_1 = require("recharts");
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const MTTT_METRICS_QUERY = (0, client_2.gql) `
  query GetMTTTMetrics($timeRange: String!, $cohortFilter: CohortFilter) {
    mtttMetrics(timeRange: $timeRange, cohortFilter: $cohortFilter) {
      summary {
        currentMTTT {
          p50
          p90
          p95
          mean
        }
        previousMTTT {
          p50
          p90
          p95
          mean
        }
        trend
        improvement
        targetMTTT
        slaCompliance
      }
      timeSeries {
        timestamp
        p50
        p90
        p95
        mean
        alertCount
        resolvedAlerts
        escalatedAlerts
      }
      cohortBreakdown {
        cohort
        mttt
        alertCount
        improvement
        slaCompliance
      }
      topPerformers {
        analyst
        avgMTTT
        alertsTriaged
        slaCompliance
      }
    }
  }
`;
const TIME_RANGES = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
];
const COHORT_OPTIONS = [
    { value: 'all', label: 'All Analysts' },
    { value: 'tier1', label: 'Tier 1' },
    { value: 'tier2', label: 'Tier 2' },
    { value: 'senior', label: 'Senior' },
    { value: 'new_hire', label: 'New Hire' },
];
function MTTTTrendWidget({ timeRange = '24h', height = 400, cohortFilter, }) {
    const [anchorEl, setAnchorEl] = (0, react_1.useState)(null);
    const [selectedTimeRange, setSelectedTimeRange] = (0, react_1.useState)(timeRange);
    const [selectedCohort, setSelectedCohort] = (0, react_1.useState)(cohortFilter ?? 'all');
    const [chartType, setChartType] = (0, react_1.useState)('line');
    const { data, loading, error, refetch } = (0, client_1.useQuery)(MTTT_METRICS_QUERY, {
        variables: {
            timeRange: selectedTimeRange,
            cohortFilter: { cohort: selectedCohort },
        },
        pollInterval: 300000, // Refresh every 5 minutes
    });
    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleTimeRangeChange = (event) => {
        setSelectedTimeRange(event.target.value);
    };
    const handleCohortChange = (event) => {
        setSelectedCohort(event.target.value);
    };
    const handleExport = () => {
        if (!data?.mtttMetrics)
            return;
        const exportData = {
            timestamp: new Date().toISOString(),
            timeRange: selectedTimeRange,
            cohort: selectedCohort,
            metrics: data.mtttMetrics,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mttt-metrics-${selectedTimeRange}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        handleMenuClose();
    };
    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'improving':
                return <icons_material_1.TrendingDown color="success"/>;
            case 'degrading':
                return <icons_material_1.TrendingUp color="error"/>;
            default:
                return <icons_material_1.TrendingFlat color="action"/>;
        }
    };
    const getTrendColor = (trend) => {
        switch (trend) {
            case 'improving':
                return 'success.main';
            case 'degrading':
                return 'error.main';
            default:
                return 'text.secondary';
        }
    };
    const renderChart = () => {
        const metrics = data?.mtttMetrics;
        if (!metrics)
            return null;
        const timeSeriesData = (metrics.timeSeries ?? []).map((point) => ({
            ...point,
            timestamp: new Date(point.timestamp).toLocaleTimeString(),
        }));
        if (timeSeriesData.length === 0)
            return null;
        const targetMTTT = metrics.summary?.targetMTTT ?? 15; // Default 15 minutes
        switch (chartType) {
            case 'area':
                return (<recharts_1.ResponsiveContainer width="100%" height={250}>
            <recharts_1.AreaChart data={timeSeriesData}>
              <recharts_1.CartesianGrid strokeDasharray="3 3"/>
              <recharts_1.XAxis dataKey="timestamp" fontSize={12} tick={{ fill: '#666' }}/>
              <recharts_1.YAxis fontSize={12} tick={{ fill: '#666' }} tickFormatter={(value) => formatTime(value)}/>
              <recharts_1.ReferenceLine y={targetMTTT} stroke="#f44336" strokeDasharray="5 5" label="Target MTTT"/>
              <recharts_1.Area type="monotone" dataKey="p50" stackId="1" stroke="#2196f3" fill="#2196f3" fillOpacity={0.6} name="P50"/>
              <recharts_1.Area type="monotone" dataKey="p90" stackId="2" stroke="#ff9800" fill="#ff9800" fillOpacity={0.4} name="P90"/>
              <recharts_1.Legend />
            </recharts_1.AreaChart>
          </recharts_1.ResponsiveContainer>);
            case 'bar':
                return (<recharts_1.ResponsiveContainer width="100%" height={250}>
            <recharts_1.BarChart data={timeSeriesData}>
              <recharts_1.CartesianGrid strokeDasharray="3 3"/>
              <recharts_1.XAxis dataKey="timestamp" fontSize={12} tick={{ fill: '#666' }}/>
              <recharts_1.YAxis fontSize={12} tick={{ fill: '#666' }} tickFormatter={(value) => formatTime(value)}/>
              <recharts_1.ReferenceLine y={targetMTTT} stroke="#f44336" strokeDasharray="5 5" label="Target"/>
              <recharts_1.Bar dataKey="p50" fill="#2196f3" name="P50 MTTT"/>
              <recharts_1.Bar dataKey="p90" fill="#ff9800" name="P90 MTTT"/>
              <recharts_1.Legend />
            </recharts_1.BarChart>
          </recharts_1.ResponsiveContainer>);
            default:
                return (<recharts_1.ResponsiveContainer width="100%" height={250}>
            <recharts_1.LineChart data={timeSeriesData}>
              <recharts_1.CartesianGrid strokeDasharray="3 3"/>
              <recharts_1.XAxis dataKey="timestamp" fontSize={12} tick={{ fill: '#666' }}/>
              <recharts_1.YAxis fontSize={12} tick={{ fill: '#666' }} tickFormatter={(value) => formatTime(value)}/>
              <recharts_1.ReferenceLine y={targetMTTT} stroke="#f44336" strokeDasharray="5 5" label="Target MTTT"/>
              <recharts_1.Line type="monotone" dataKey="p50" stroke="#2196f3" strokeWidth={2} dot={{ r: 4 }} name="P50"/>
              <recharts_1.Line type="monotone" dataKey="p90" stroke="#ff9800" strokeWidth={2} dot={{ r: 4 }} name="P90"/>
              <recharts_1.Line type="monotone" dataKey="p95" stroke="#f44336" strokeWidth={2} dot={{ r: 4 }} name="P95"/>
              <recharts_1.Legend />
            </recharts_1.LineChart>
          </recharts_1.ResponsiveContainer>);
        }
    };
    if (loading) {
        return (<material_1.Card sx={{ height }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Mean Time to Triage (MTTT)
          </material_1.Typography>
          <material_1.Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '70%',
            }}>
            <material_1.LinearProgress sx={{ width: '50%' }}/>
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>);
    }
    if (error) {
        return (<material_1.Card sx={{ height }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" color="error">
            Error Loading MTTT Data
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            {error.message}
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>);
    }
    const summary = data?.mtttMetrics?.summary;
    const cohortBreakdown = data?.mtttMetrics?.cohortBreakdown ?? [];
    const slaCompliance = summary?.slaCompliance ?? 0;
    return (<material_1.Card sx={{ height }}>
      <material_1.CardContent>
        {/* Header */}
        <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
        }}>
          <material_1.Box>
            <material_1.Typography variant="h6">Mean Time to Triage (MTTT)</material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Current P50: {formatTime(summary?.currentMTTT?.p50 || 0)} • SLA
              Compliance:{' '}
              {((summary?.slaCompliance || 0) * 100).toFixed(1)}%
            </material_1.Typography>
          </material_1.Box>
          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <material_1.FormControl size="small" sx={{ minWidth: 100 }}>
              <Select_1.default value={selectedTimeRange} onChange={handleTimeRangeChange}>
                {TIME_RANGES.map((range) => (<material_1.MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </material_1.MenuItem>))}
              </Select_1.default>
            </material_1.FormControl>
            <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
              <Select_1.default value={selectedCohort} onChange={handleCohortChange}>
                {COHORT_OPTIONS.map((option) => (<material_1.MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </material_1.MenuItem>))}
              </Select_1.default>
            </material_1.FormControl>
            <material_1.IconButton onClick={() => refetch()}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
            <material_1.IconButton onClick={handleMenuClick}>
              <icons_material_1.MoreVert />
            </material_1.IconButton>
          </material_1.Box>
        </material_1.Box>

        {/* Summary Metrics */}
        <Grid_1.default container spacing={2} sx={{ mb: 3 }}>
          <Grid_1.default xs={3}>
            <material_1.Box sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="primary">
                {formatTime(summary?.currentMTTT?.p50 || 0)}
              </material_1.Typography>
              <material_1.Typography variant="caption">P50 MTTT</material_1.Typography>
              <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 0.5,
        }}>
                {getTrendIcon(summary?.trend ?? 'stable')}
                <material_1.Typography variant="caption" sx={{
            color: getTrendColor(summary?.trend ?? 'stable'),
            ml: 0.5,
        }}>
                  {summary?.improvement
            ? `${(summary.improvement * 100).toFixed(1)}%`
            : '--'}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Box>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Box sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="warning.main">
                {formatTime(summary?.currentMTTT?.p90 || 0)}
              </material_1.Typography>
              <material_1.Typography variant="caption">P90 MTTT</material_1.Typography>
            </material_1.Box>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Box sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="error.main">
                {formatTime(summary?.currentMTTT?.p95 || 0)}
              </material_1.Typography>
              <material_1.Typography variant="caption">P95 MTTT</material_1.Typography>
            </material_1.Box>
          </Grid_1.default>
          <Grid_1.default xs={3}>
            <material_1.Box sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color={slaCompliance >= 0.8 ? 'success.main' : 'error.main'}>
                {(slaCompliance * 100).toFixed(0)}%
              </material_1.Typography>
              <material_1.Typography variant="caption">SLA Compliance</material_1.Typography>
            </material_1.Box>
          </Grid_1.default>
        </Grid_1.default>

        {/* Chart */}
        <material_1.Box sx={{ mb: 2 }}>
          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <material_1.Typography variant="subtitle2">Trend Analysis</material_1.Typography>
            <material_1.Box sx={{ display: 'flex', gap: 0.5 }}>
              {['line', 'area', 'bar'].map((type) => (<material_1.Chip key={type} size="small" label={type} variant={chartType === type ? 'filled' : 'outlined'} onClick={() => setChartType(type)}/>))}
            </material_1.Box>
          </material_1.Box>
          {renderChart()}
        </material_1.Box>

        {/* Cohort Breakdown */}
        {cohortBreakdown.length > 0 && (<material_1.Box>
            <material_1.Typography variant="subtitle2" gutterBottom>
              Cohort Performance
            </material_1.Typography>
            <Grid_1.default container spacing={1}>
              {cohortBreakdown.map((cohort, index) => (<Grid_1.default xs={6} key={index}>
                  <material_1.Box sx={{
                    p: 1,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    <material_1.Typography variant="body2" fontWeight="medium">
                      {cohort.cohort}
                    </material_1.Typography>
                    <material_1.Box sx={{ textAlign: 'right' }}>
                      <material_1.Typography variant="body2">
                        {formatTime(cohort.mttt)}
                      </material_1.Typography>
                      <material_1.Typography variant="caption" color="text.secondary">
                        {cohort.alertCount} alerts
                      </material_1.Typography>
                    </material_1.Box>
                  </material_1.Box>
                </Grid_1.default>))}
            </Grid_1.default>
          </material_1.Box>)}

        <material_1.Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <material_1.MenuItem onClick={handleExport}>
            <icons_material_1.FileDownload sx={{ mr: 1 }}/>
            Export Data
          </material_1.MenuItem>
          <material_1.MenuItem onClick={() => {
            setChartType('line');
            handleMenuClose();
        }}>
            Line Chart
          </material_1.MenuItem>
          <material_1.MenuItem onClick={() => {
            setChartType('area');
            handleMenuClose();
        }}>
            Area Chart
          </material_1.MenuItem>
          <material_1.MenuItem onClick={() => {
            setChartType('bar');
            handleMenuClose();
        }}>
            Bar Chart
          </material_1.MenuItem>
        </material_1.Menu>
      </material_1.CardContent>
    </material_1.Card>);
}
