import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Speed,
  Memory,
  Storage,
  CloudQueue,
  NetworkCheck,
  Timeline,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  TrendingDown,
  Refresh,
  Tune,
  BugReport,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_PERFORMANCE_REPORT = gql`
  query GetPerformanceReport {
    getPerformanceReport {
      timestamp
      metrics {
        totalRequests
        avgResponseTime
        errorRate
        cacheHitRate
        concurrentUsers
      }
      cacheStrategies {
        id
        name
        pattern
        ttl
        priority
        compressionEnabled
        prefetchEnabled
      }
      connectionPools {
        id
        type
        maxConnections
        activeConnections
        avgResponseTime
        errorRate
      }
      slowQueries {
        id
        queryType
        executionTime
        improvement
        indexRecommendations
      }
      systemHealth {
        memoryUsage {
          heapUsed
          heapTotal
          external
        }
        uptime
      }
    }
  }
`;

const GET_PERFORMANCE_METRICS = gql`
  query GetPerformanceMetrics($timeRange: String) {
    getPerformanceMetrics(timeRange: $timeRange) {
      id
      timestamp
      endpoint
      responseTime
      memoryUsage
      cacheHitRate
      concurrentUsers
      status
    }
  }
`;

const OPTIMIZE_QUERY = gql`
  mutation OptimizeQuery($queryType: QueryType!, $query: String!) {
    optimizeQuery(queryType: $queryType, query: $query) {
      id
      queryType
      originalQuery
      optimizedQuery
      executionTime
      improvement
      indexRecommendations
    }
  }
`;

const IMPLEMENT_CACHE_WARMING = gql`
  mutation ImplementCacheWarming {
    implementCacheWarming
  }
`;

const PerformanceMonitoringPanel = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [metricsData, setMetricsData] = useState([]);

  const {
    data: reportData,
    loading: reportLoading,
    refetch: refetchReport,
  } = useQuery(GET_PERFORMANCE_REPORT, {
    pollInterval: autoRefresh ? 30000 : 0,
  });

  const {
    data: metricsQueryData,
    loading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery(GET_PERFORMANCE_METRICS, {
    variables: { timeRange },
    pollInterval: autoRefresh ? 15000 : 0,
  });

  const [optimizeQuery] = useMutation(OPTIMIZE_QUERY);
  const [implementCacheWarming] = useMutation(IMPLEMENT_CACHE_WARMING);

  useEffect(() => {
    if (reportData) {
      setPerformanceData(reportData.getPerformanceReport);
    }
  }, [reportData]);

  useEffect(() => {
    if (metricsQueryData) {
      setMetricsData(metricsQueryData.getPerformanceMetrics);
    }
  }, [metricsQueryData]);

  const handleCacheWarming = async () => {
    try {
      await implementCacheWarming();
      refetchReport();
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  };

  const getHealthStatus = () => {
    if (!performanceData)
      return { status: 'unknown', color: 'default', message: 'Loading...' };

    const { metrics } = performanceData;
    const issues = [];

    if (metrics.avgResponseTime > 1000) issues.push('High response time');
    if (metrics.errorRate > 5) issues.push('High error rate');
    if (metrics.cacheHitRate < 85) issues.push('Low cache hit rate');

    if (issues.length === 0) {
      return {
        status: 'healthy',
        color: 'success',
        message: 'All systems operational',
      };
    } else if (issues.length === 1) {
      return { status: 'warning', color: 'warning', message: issues[0] };
    } else {
      return {
        status: 'critical',
        color: 'error',
        message: `${issues.length} issues detected`,
      };
    }
  };

  const renderOverviewTab = () => {
    if (!performanceData) return <LinearProgress />;

    const health = getHealthStatus();
    const { metrics, systemHealth } = performanceData;

    return (
      <Grid container spacing={3}>
        {/* System Health Alert */}
        <Grid item xs={12}>
          <Alert
            severity={
              health.status === 'healthy'
                ? 'success'
                : health.status === 'warning'
                  ? 'warning'
                  : 'error'
            }
            icon={
              health.status === 'healthy' ? (
                <CheckCircle />
              ) : health.status === 'warning' ? (
                <Warning />
              ) : (
                <Error />
              )
            }
          >
            <strong>System Status: {health.message}</strong>
            <br />
            Last updated: {new Date(performanceData.timestamp).toLocaleString()}
          </Alert>
        </Grid>

        {/* Key Performance Indicators */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Response Time</Typography>
              </Box>
              <Typography
                variant="h3"
                color={metrics.avgResponseTime > 1000 ? 'error' : 'primary'}
              >
                {Math.round(metrics.avgResponseTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                milliseconds avg
              </Typography>
              <Box mt={1}>
                <Chip
                  label={
                    metrics.avgResponseTime > 1000
                      ? 'Slow'
                      : metrics.avgResponseTime > 500
                        ? 'Fair'
                        : 'Good'
                  }
                  color={
                    metrics.avgResponseTime > 1000
                      ? 'error'
                      : metrics.avgResponseTime > 500
                        ? 'warning'
                        : 'success'
                  }
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Memory color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Memory Usage</Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {Math.round(
                  (systemHealth.memoryUsage.heapUsed /
                    systemHealth.memoryUsage.heapTotal) *
                    100,
                )}
                %
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of{' '}
                {Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024)}{' '}
                MB
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  (systemHealth.memoryUsage.heapUsed /
                    systemHealth.memoryUsage.heapTotal) *
                  100
                }
                sx={{ mt: 1 }}
                color="info"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Storage color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Cache Hit Rate</Typography>
              </Box>
              <Typography
                variant="h3"
                color={metrics.cacheHitRate < 85 ? 'warning' : 'success'}
              >
                {Math.round(metrics.cacheHitRate)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                cache efficiency
              </Typography>
              <Box mt={1}>
                <Chip
                  label={
                    metrics.cacheHitRate < 85
                      ? 'Low'
                      : metrics.cacheHitRate < 95
                        ? 'Good'
                        : 'Excellent'
                  }
                  color={metrics.cacheHitRate < 85 ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <NetworkCheck color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Users</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                {metrics.concurrentUsers}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                concurrent sessions
              </Typography>
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  {metrics.totalRequests.toLocaleString()} requests served
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Metrics Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Real-time Performance Metrics"
              subheader={`Last ${timeRange} of system performance`}
              action={
                <Box>
                  <Button
                    size="small"
                    onClick={() => setTimeRange('1h')}
                    variant={timeRange === '1h' ? 'contained' : 'outlined'}
                    sx={{ mr: 1 }}
                  >
                    1h
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setTimeRange('24h')}
                    variant={timeRange === '24h' ? 'contained' : 'outlined'}
                    sx={{ mr: 1 }}
                  >
                    24h
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setTimeRange('7d')}
                    variant={timeRange === '7d' ? 'contained' : 'outlined'}
                  >
                    7d
                  </Button>
                </Box>
              }
            />
            <CardContent>
              {metricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString()
                      }
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString()
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#8884d8"
                      name="Response Time (ms)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="memoryUsage"
                      stroke="#82ca9d"
                      name="Memory Usage (%)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cacheHitRate"
                      stroke="#ffc658"
                      name="Cache Hit Rate (%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height={400}
                >
                  <Typography color="text.secondary">
                    Loading metrics data...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Information" />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Timeline />
                  </ListItemIcon>
                  <ListItemText
                    primary="Uptime"
                    secondary={`${Math.round(systemHealth.uptime / 3600)} hours`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CloudQueue />
                  </ListItemIcon>
                  <ListItemText
                    primary="Heap Memory"
                    secondary={`${Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024)} MB / ${Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024)} MB`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Storage />
                  </ListItemIcon>
                  <ListItemText
                    primary="External Memory"
                    secondary={`${Math.round(systemHealth.memoryUsage.external / 1024 / 1024)} MB`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Error />
                  </ListItemIcon>
                  <ListItemText
                    primary="Error Rate"
                    secondary={`${metrics.errorRate.toFixed(2)}%`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Performance Actions" />
            <CardContent>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Storage />}
                  onClick={handleCacheWarming}
                  color="primary"
                >
                  Warm Cache
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    refetchReport();
                    refetchMetrics();
                  }}
                >
                  Refresh Data
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Tune />}
                  color="info"
                  disabled
                >
                  Optimize Settings
                </Button>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderConnectionsTab = () => {
    if (!performanceData) return <LinearProgress />;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Database Connection Pools" />
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Database</TableCell>
                    <TableCell align="right">Active</TableCell>
                    <TableCell align="right">Max</TableCell>
                    <TableCell align="right">Utilization</TableCell>
                    <TableCell align="right">Avg Response (ms)</TableCell>
                    <TableCell align="right">Error Rate</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceData.connectionPools.map((pool) => {
                    const utilization =
                      (pool.activeConnections / pool.maxConnections) * 100;
                    const isHealthy = pool.errorRate < 1 && utilization < 80;

                    return (
                      <TableRow key={pool.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Storage
                              sx={{
                                mr: 1,
                                color: isHealthy
                                  ? 'success.main'
                                  : 'warning.main',
                              }}
                            />
                            {pool.type.toUpperCase()}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {pool.activeConnections}
                        </TableCell>
                        <TableCell align="right">
                          {pool.maxConnections}
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            display="flex"
                            alignItems="center"
                            flexDirection="column"
                          >
                            {Math.round(utilization)}%
                            <LinearProgress
                              variant="determinate"
                              value={utilization}
                              sx={{ width: 60, mt: 0.5 }}
                              color={
                                utilization > 80
                                  ? 'error'
                                  : utilization > 60
                                    ? 'warning'
                                    : 'success'
                              }
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(pool.avgResponseTime)}
                        </TableCell>
                        <TableCell align="right">
                          {pool.errorRate.toFixed(2)}%
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={isHealthy ? 'Healthy' : 'Warning'}
                            color={isHealthy ? 'success' : 'warning'}
                            size="small"
                            icon={isHealthy ? <CheckCircle /> : <Warning />}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderCacheTab = () => {
    if (!performanceData) return <LinearProgress />;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Cache Strategies"
              subheader="Current caching configuration and performance"
            />
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Strategy</TableCell>
                    <TableCell>Pattern</TableCell>
                    <TableCell align="right">TTL</TableCell>
                    <TableCell align="center">Priority</TableCell>
                    <TableCell align="center">Compression</TableCell>
                    <TableCell align="center">Prefetch</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceData.cacheStrategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {strategy.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          color="text.secondary"
                        >
                          {strategy.pattern}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {strategy.ttl < 60
                          ? `${strategy.ttl}s`
                          : strategy.ttl < 3600
                            ? `${Math.round(strategy.ttl / 60)}m`
                            : `${Math.round(strategy.ttl / 3600)}h`}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={strategy.priority.toUpperCase()}
                          color={
                            strategy.priority === 'high'
                              ? 'error'
                              : strategy.priority === 'medium'
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={strategy.compressionEnabled ? 'On' : 'Off'}
                          color={
                            strategy.compressionEnabled ? 'success' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={strategy.prefetchEnabled ? 'On' : 'Off'}
                          color={strategy.prefetchEnabled ? 'info' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label="Active" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const tabs = [
    { label: 'Overview', content: renderOverviewTab() },
    { label: 'Connections', content: renderConnectionsTab() },
    { label: 'Cache', content: renderCacheTab() },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      <Box>{tabs[selectedTab]?.content}</Box>
    </Box>
  );
};

export default PerformanceMonitoringPanel;
