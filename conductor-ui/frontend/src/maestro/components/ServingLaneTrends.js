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
exports.default = ServingLaneTrends;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const recharts_1 = require("recharts");
const api_1 = require("../api");
function ServingLaneTrends() {
    const { getServingMetrics } = (0, api_1.api)();
    const [data, setData] = (0, react_1.useState)([]);
    const [backends, setBackends] = (0, react_1.useState)([]);
    const [selectedBackend, setSelectedBackend] = (0, react_1.useState)('all');
    const [selectedTimeRange, setSelectedTimeRange] = (0, react_1.useState)('1h');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [detailDialogOpen, setDetailDialogOpen] = (0, react_1.useState)(false);
    const [refreshInterval, setRefreshInterval] = (0, react_1.useState)(null);
    const fetchData = async () => {
        try {
            setError(null);
            const r = await getServingMetrics({
                backend: selectedBackend === 'all' ? undefined : selectedBackend,
                timeRange: selectedTimeRange,
            });
            if (r.series) {
                const metrics = r.series.map((p) => ({
                    timestamp: p.ts,
                    time: new Date(p.ts).toLocaleTimeString(),
                    queueDepth: p.qDepth || 0,
                    batchSize: p.batch || 0,
                    kvCacheHitRate: p.kvHit || 0,
                    p95Latency: p.p95Latency || 0,
                    throughput: p.throughput || 0,
                    utilizationCpu: p.utilizationCpu || 0,
                    utilizationGpu: p.utilizationGpu || 0,
                    memoryUsage: p.memoryUsage || 0,
                    backend: p.backend || 'unknown',
                    model: p.model || 'unknown',
                    requestsPerSecond: p.rps || 0,
                    errorRate: p.errorRate || 0,
                    ...p,
                }));
                setData(metrics);
            }
            if (r.backends) {
                setBackends(r.backends);
            }
            setLoading(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch serving metrics');
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchData();
        // Set up refresh interval
        const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        setRefreshInterval(interval);
        return () => {
            if (refreshInterval)
                clearInterval(refreshInterval);
        };
    }, [selectedBackend, selectedTimeRange]);
    const calculateTrend = (data, key) => {
        if (data.length < 2)
            return 'steady';
        const recent = data.slice(-5);
        const values = recent.map((d) => Number(d[key]) || 0);
        const first = values[0];
        const last = values[values.length - 1];
        if (last > first * 1.1)
            return 'up';
        if (last < first * 0.9)
            return 'down';
        return 'steady';
    };
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up':
                return <icons_material_1.TrendingUpOutlined color="success"/>;
            case 'down':
                return <icons_material_1.TrendingDownOutlined color="error"/>;
            default:
                return <icons_material_1.RemoveOutlined color="action"/>;
        }
    };
    const getCurrentValue = (data, key) => {
        if (data.length === 0)
            return 0;
        return Number(data[data.length - 1][key]) || 0;
    };
    const formatValue = (value, type) => {
        switch (type) {
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'latency':
                return `${value.toFixed(0)}ms`;
            case 'throughput':
                return `${value.toFixed(1)} rps`;
            case 'memory':
                return `${(value / 1024 / 1024).toFixed(1)} MB`;
            default:
                return value.toFixed(0);
        }
    };
    const renderMetricCard = (title, dataKey, type, color) => {
        const currentValue = getCurrentValue(data, dataKey);
        const trend = calculateTrend(data, dataKey);
        return (<material_1.Card>
        <material_1.CardContent>
          <material_1.Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
            }}>
            <material_1.Typography variant="subtitle2" color="textSecondary">
              {title}
            </material_1.Typography>
            <material_1.Tooltip title={`Trend: ${trend}`}>{getTrendIcon(trend)}</material_1.Tooltip>
          </material_1.Box>

          <material_1.Typography variant="h4" component="div" sx={{ mb: 1 }}>
            {formatValue(currentValue, type)}
          </material_1.Typography>

          <material_1.Box sx={{ height: 120 }}>
            <recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <recharts_1.Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#gradient-${dataKey})`} strokeWidth={2}/>
                <recharts_1.Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} formatter={(value) => [
                formatValue(value, type),
                title,
            ]}/>
              </recharts_1.AreaChart>
            </recharts_1.ResponsiveContainer>
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>);
    };
    const renderOverviewTab = () => (<material_1.Grid container spacing={3}>
      <material_1.Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('Queue Depth', 'queueDepth', 'number', '#8884d8')}
      </material_1.Grid>
      <material_1.Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('Batch Size', 'batchSize', 'number', '#82ca9d')}
      </material_1.Grid>
      <material_1.Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('KV Cache Hit Rate', 'kvCacheHitRate', 'percentage', '#ffc658')}
      </material_1.Grid>
      <material_1.Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('P95 Latency', 'p95Latency', 'latency', '#ff7c7c')}
      </material_1.Grid>

      <material_1.Grid item xs={12} md={6}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Performance Trends
            </material_1.Typography>
            <material_1.Box sx={{ height: 300 }}>
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.ComposedChart data={data}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time" tick={{ fontSize: 12 }}/>
                  <recharts_1.YAxis yAxisId="left"/>
                  <recharts_1.YAxis yAxisId="right" orientation="right"/>
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                  <recharts_1.Bar yAxisId="left" dataKey="throughput" fill="#8884d8" name="Throughput (RPS)"/>
                  <recharts_1.Line yAxisId="right" type="monotone" dataKey="p95Latency" stroke="#ff7c7c" name="P95 Latency (ms)"/>
                </recharts_1.ComposedChart>
              </recharts_1.ResponsiveContainer>
            </material_1.Box>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Grid>

      <material_1.Grid item xs={12} md={6}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Resource Utilization
            </material_1.Typography>
            <material_1.Box sx={{ height: 300 }}>
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.AreaChart data={data}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time" tick={{ fontSize: 12 }}/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                  <recharts_1.Area type="monotone" dataKey="utilizationCpu" stackId="1" stroke="#8884d8" fill="#8884d8" name="CPU %"/>
                  <recharts_1.Area type="monotone" dataKey="utilizationGpu" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="GPU %"/>
                </recharts_1.AreaChart>
              </recharts_1.ResponsiveContainer>
            </material_1.Box>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Grid>
    </material_1.Grid>);
    const renderBackendDetail = () => (<material_1.Grid container spacing={3}>
      <material_1.Grid item xs={12}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
        }}>
              <material_1.Typography variant="h6">Backend Overview</material_1.Typography>
              <material_1.IconButton onClick={() => setDetailDialogOpen(true)}>
                <icons_material_1.InfoOutlined />
              </material_1.IconButton>
            </material_1.Box>

            <material_1.Grid container spacing={2}>
              {backends.map((backend) => (<material_1.Grid item xs={12} sm={6} md={4} key={backend.name}>
                  <material_1.Paper sx={{ p: 2 }}>
                    <material_1.Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
            }}>
                      <material_1.Typography variant="subtitle1">
                        {backend.name}
                      </material_1.Typography>
                      <material_1.Chip label={backend.status} color={backend.status === 'healthy' ? 'success' : 'error'} size="small"/>
                    </material_1.Box>

                    <material_1.Typography variant="body2" color="textSecondary" gutterBottom>
                      Type: {backend.type}
                    </material_1.Typography>

                    <material_1.Typography variant="body2" color="textSecondary" gutterBottom>
                      Instances: {backend.instances}
                    </material_1.Typography>

                    <material_1.Typography variant="body2" color="textSecondary" gutterBottom>
                      Models: {backend.models.join(', ')}
                    </material_1.Typography>

                    <material_1.Box sx={{ mt: 2 }}>
                      <material_1.Typography variant="body2" gutterBottom>
                        Utilization: {backend.utilization.toFixed(1)}%
                      </material_1.Typography>
                      <material_1.LinearProgress variant="determinate" value={backend.utilization} color={backend.utilization > 80 ? 'warning' : 'primary'}/>
                    </material_1.Box>
                  </material_1.Paper>
                </material_1.Grid>))}
            </material_1.Grid>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Grid>

      <material_1.Grid item xs={12}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Backend-Specific Metrics
            </material_1.Typography>
            <material_1.Box sx={{ height: 400 }}>
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={data}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time" tick={{ fontSize: 12 }}/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                  <recharts_1.Line type="monotone" dataKey="queueDepth" stroke="#8884d8" name="Queue Depth"/>
                  <recharts_1.Line type="monotone" dataKey="batchSize" stroke="#82ca9d" name="Batch Size"/>
                  <recharts_1.Line type="monotone" dataKey="kvCacheHitRate" stroke="#ffc658" name="KV Cache Hit %"/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </material_1.Box>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Grid>
    </material_1.Grid>);
    const renderDetailDialog = () => (<material_1.Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
      <material_1.DialogTitle>Backend Details</material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.List>
          {backends.map((backend) => (<material_1.ListItem key={backend.name}>
              <material_1.ListItemText primary={backend.name} secondary={<>
                    <material_1.Typography variant="body2">
                      Type: {backend.type} | Status: {backend.status} |
                      Instances: {backend.instances}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">
                      Models: {backend.models.join(', ')}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">
                      Last Updated:{' '}
                      {new Date(backend.lastUpdate).toLocaleString()}
                    </material_1.Typography>
                  </>}/>
            </material_1.ListItem>))}
        </material_1.List>
      </material_1.DialogContent>
    </material_1.Dialog>);
    if (loading) {
        return (<material_1.Box sx={{ p: 2 }}>
        <material_1.LinearProgress />
        <material_1.Typography variant="body2" sx={{ mt: 1 }}>
          Loading serving metrics...
        </material_1.Typography>
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Alert severity="error" sx={{ m: 2 }}>
        Failed to load serving metrics: {error}
      </material_1.Alert>);
    }
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
        }}>
        <material_1.Typography variant="h5">Serving Lane Trends</material_1.Typography>

        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Backend</material_1.InputLabel>
            <material_1.Select value={selectedBackend} label="Backend" onChange={(e) => setSelectedBackend(e.target.value)}>
              <material_1.MenuItem value="all">All Backends</material_1.MenuItem>
              <material_1.MenuItem value="vllm">vLLM</material_1.MenuItem>
              <material_1.MenuItem value="ray">Ray Serve</material_1.MenuItem>
              <material_1.MenuItem value="triton">Triton</material_1.MenuItem>
              <material_1.MenuItem value="kserve">KServe</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>

          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Time Range</material_1.InputLabel>
            <material_1.Select value={selectedTimeRange} label="Time Range" onChange={(e) => setSelectedTimeRange(e.target.value)}>
              <material_1.MenuItem value="1h">Last Hour</material_1.MenuItem>
              <material_1.MenuItem value="6h">Last 6 Hours</material_1.MenuItem>
              <material_1.MenuItem value="24h">Last 24 Hours</material_1.MenuItem>
              <material_1.MenuItem value="7d">Last 7 Days</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>

          <material_1.IconButton onClick={fetchData}>
            <icons_material_1.RefreshOutlined />
          </material_1.IconButton>
        </material_1.Box>
      </material_1.Box>

      <material_1.Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <material_1.Tab label="Overview"/>
        <material_1.Tab label="Backend Details"/>
      </material_1.Tabs>

      {tabValue === 0 && renderOverviewTab()}
      {tabValue === 1 && renderBackendDetail()}

      {renderDetailDialog()}
    </material_1.Box>);
}
