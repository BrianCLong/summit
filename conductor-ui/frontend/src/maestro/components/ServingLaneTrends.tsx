import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  RefreshOutlined as RefreshIcon,
  InfoOutlined as InfoIcon,
  TrendingUpOutlined as TrendingUpIcon,
  TrendingDownOutlined as TrendingDownIcon,
  RemoveOutlined as SteadyIcon,
  WarningAmberOutlined as WarningIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import { api } from '../api';

interface ServingMetric {
  timestamp: number;
  queueDepth: number;
  batchSize: number;
  kvCacheHitRate: number;
  p95Latency: number;
  throughput: number;
  utilizationCpu: number;
  utilizationGpu: number;
  memoryUsage: number;
  backend: string;
  model: string;
  requestsPerSecond: number;
  errorRate: number;
}

interface BackendDetail {
  name: string;
  type: 'vLLM' | 'Ray' | 'Triton' | 'KServe';
  status: 'healthy' | 'degraded' | 'error';
  instances: number;
  models: string[];
  utilization: number;
  lastUpdate: number;
}

export default function ServingLaneTrends() {
  const { getServingMetrics } = api();
  const [data, setData] = useState<ServingMetric[]>([]);
  const [backends, setBackends] = useState<BackendDetail[]>([]);
  const [selectedBackend, setSelectedBackend] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  const fetchData = async () => {
    try {
      setError(null);
      const r = await getServingMetrics({
        backend: selectedBackend === 'all' ? undefined : selectedBackend,
        timeRange: selectedTimeRange,
      });

      if (r.series) {
        const metrics: ServingMetric[] = r.series.map((p: any) => ({
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch serving metrics',
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up refresh interval
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [selectedBackend, selectedTimeRange]);

  const calculateTrend = (
    data: ServingMetric[],
    key: keyof ServingMetric,
  ): 'up' | 'down' | 'steady' => {
    if (data.length < 2) return 'steady';

    const recent = data.slice(-5);
    const values = recent.map((d) => Number(d[key]) || 0);
    const first = values[0];
    const last = values[values.length - 1];

    if (last > first * 1.1) return 'up';
    if (last < first * 0.9) return 'down';
    return 'steady';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      default:
        return <SteadyIcon color="action" />;
    }
  };

  const getCurrentValue = (
    data: ServingMetric[],
    key: keyof ServingMetric,
  ): number => {
    if (data.length === 0) return 0;
    return Number(data[data.length - 1][key]) || 0;
  };

  const formatValue = (value: number, type: string): string => {
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

  const renderMetricCard = (
    title: string,
    dataKey: keyof ServingMetric,
    type: string,
    color: string,
  ) => {
    const currentValue = getCurrentValue(data, dataKey);
    const trend = calculateTrend(data, dataKey);

    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" color="textSecondary">
              {title}
            </Typography>
            <Tooltip title={`Trend: ${trend}`}>{getTrendIcon(trend)}</Tooltip>
          </Box>

          <Typography variant="h4" component="div" sx={{ mb: 1 }}>
            {formatValue(currentValue, type)}
          </Typography>

          <Box sx={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient
                    id={`gradient-${dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  fill={`url(#gradient-${dataKey})`}
                  strokeWidth={2}
                />
                <RechartsTooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleTimeString()
                  }
                  formatter={(value: number) => [
                    formatValue(value, type),
                    title,
                  ]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('Queue Depth', 'queueDepth', 'number', '#8884d8')}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('Batch Size', 'batchSize', 'number', '#82ca9d')}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderMetricCard(
          'KV Cache Hit Rate',
          'kvCacheHitRate',
          'percentage',
          '#ffc658',
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderMetricCard('P95 Latency', 'p95Latency', 'latency', '#ff7c7c')}
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Trends
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="throughput"
                    fill="#8884d8"
                    name="Throughput (RPS)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="p95Latency"
                    stroke="#ff7c7c"
                    name="P95 Latency (ms)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resource Utilization
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="utilizationCpu"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="CPU %"
                  />
                  <Area
                    type="monotone"
                    dataKey="utilizationGpu"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="GPU %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBackendDetail = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography variant="h6">Backend Overview</Typography>
              <IconButton onClick={() => setDetailDialogOpen(true)}>
                <InfoIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              {backends.map((backend) => (
                <Grid item xs={12} sm={6} md={4} key={backend.name}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1">
                        {backend.name}
                      </Typography>
                      <Chip
                        label={backend.status}
                        color={
                          backend.status === 'healthy' ? 'success' : 'error'
                        }
                        size="small"
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Type: {backend.type}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Instances: {backend.instances}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Models: {backend.models.join(', ')}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Utilization: {backend.utilization.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={backend.utilization}
                        color={backend.utilization > 80 ? 'warning' : 'primary'}
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Backend-Specific Metrics
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="queueDepth"
                    stroke="#8884d8"
                    name="Queue Depth"
                  />
                  <Line
                    type="monotone"
                    dataKey="batchSize"
                    stroke="#82ca9d"
                    name="Batch Size"
                  />
                  <Line
                    type="monotone"
                    dataKey="kvCacheHitRate"
                    stroke="#ffc658"
                    name="KV Cache Hit %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDetailDialog = () => (
    <Dialog
      open={detailDialogOpen}
      onClose={() => setDetailDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Backend Details</DialogTitle>
      <DialogContent>
        <List>
          {backends.map((backend) => (
            <ListItem key={backend.name}>
              <ListItemText
                primary={backend.name}
                secondary={
                  <>
                    <Typography variant="body2">
                      Type: {backend.type} | Status: {backend.status} |
                      Instances: {backend.instances}
                    </Typography>
                    <Typography variant="body2">
                      Models: {backend.models.join(', ')}
                    </Typography>
                    <Typography variant="body2">
                      Last Updated:{' '}
                      {new Date(backend.lastUpdate).toLocaleString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading serving metrics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load serving metrics: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h5">Serving Lane Trends</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Backend</InputLabel>
            <Select
              value={selectedBackend}
              label="Backend"
              onChange={(e) => setSelectedBackend(e.target.value)}
            >
              <MenuItem value="all">All Backends</MenuItem>
              <MenuItem value="vllm">vLLM</MenuItem>
              <MenuItem value="ray">Ray Serve</MenuItem>
              <MenuItem value="triton">Triton</MenuItem>
              <MenuItem value="kserve">KServe</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="6h">Last 6 Hours</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
            </Select>
          </FormControl>

          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Backend Details" />
      </Tabs>

      {tabValue === 0 && renderOverviewTab()}
      {tabValue === 1 && renderBackendDetail()}

      {renderDetailDialog()}
    </Box>
  );
}
