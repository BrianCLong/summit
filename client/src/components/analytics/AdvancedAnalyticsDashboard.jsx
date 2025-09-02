import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  Speed,
  Storage,
  Security,
  Timeline,
  Map,
  Assessment,
  Settings,
  Refresh,
  Download,
  Fullscreen,
  Close,
  Add,
  Edit,
  Delete,
  FilterList,
  ViewModule,
  BarChart,
  PieChart,
  ShowChart,
  ScatterPlot,
  BubbleChart,
  DonutLarge,
  NetworkCheck,
  Memory,
  CloudQueue,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_DASHBOARD_CONFIG = gql`
  query GetDashboardConfig {
    getDashboardConfig {
      widgets {
        id
        title
        type
        config
        position {
          x
          y
          width
          height
        }
        refreshInterval
        dataSource
      }
      charts {
        id
        type
        title
        data
        metadata {
          lastUpdated
          dataPoints
          refreshRate
        }
      }
      metadata {
        lastUpdated
        totalWidgets
        totalCharts
      }
    }
  }
`;

const GET_THREAT_METRICS = gql`
  query GetThreatMetrics {
    getThreatMetrics {
      totalIOCs
      activeThreats
      resolvedThreats
      threatSeverityDistribution
      topThreatTypes {
        type
        count
      }
      geographicDistribution {
        country
        threatCount
      }
      timeSeriesData {
        timestamp
        value
      }
    }
  }
`;

const GET_INVESTIGATION_METRICS = gql`
  query GetInvestigationMetrics {
    getInvestigationMetrics {
      totalInvestigations
      activeInvestigations
      completedInvestigations
      avgCompletionTime
      investigationsByStatus
      evidenceMetrics {
        totalEvidence
        evidenceByType
      }
      findingsMetrics {
        totalFindings
        findingsBySeverity
      }
    }
  }
`;

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
      systemHealth {
        memoryUsage {
          heapUsed
          heapTotal
        }
        uptime
      }
    }
  }
`;

const CREATE_WIDGET = gql`
  mutation CreateWidget($widget: DashboardWidgetInput!) {
    createWidget(widget: $widget) {
      id
      title
      type
      config
    }
  }
`;

const EXPORT_DASHBOARD = gql`
  mutation ExportDashboard($format: ExportFormat!) {
    exportDashboard(format: $format) {
      filename
      url
      size
    }
  }
`;

const AdvancedAnalyticsDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [threatMetrics, setThreatMetrics] = useState(null);
  const [investigationMetrics, setInvestigationMetrics] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshInterval = useRef(null);

  // GraphQL queries
  const {
    data: dashboardData,
    refetch: refetchDashboard,
    loading: dashboardLoading,
  } = useQuery(GET_DASHBOARD_CONFIG, {
    pollInterval: autoRefresh ? 60000 : 0,
  });

  const {
    data: threatData,
    refetch: refetchThreat,
    loading: threatLoading,
  } = useQuery(GET_THREAT_METRICS, {
    pollInterval: autoRefresh ? 30000 : 0,
  });

  const {
    data: investigationData,
    refetch: refetchInvestigation,
    loading: investigationLoading,
  } = useQuery(GET_INVESTIGATION_METRICS, {
    pollInterval: autoRefresh ? 45000 : 0,
  });

  const {
    data: performanceReportData,
    refetch: refetchPerformance,
    loading: performanceLoading,
  } = useQuery(GET_PERFORMANCE_REPORT, {
    pollInterval: autoRefresh ? 15000 : 0,
  });

  const [createWidget] = useMutation(CREATE_WIDGET);
  const [exportDashboard] = useMutation(EXPORT_DASHBOARD);

  useEffect(() => {
    if (dashboardData) {
      setDashboardConfig(dashboardData.getDashboardConfig);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (threatData) {
      setThreatMetrics(threatData.getThreatMetrics);
    }
  }, [threatData]);

  useEffect(() => {
    if (investigationData) {
      setInvestigationMetrics(investigationData.getInvestigationMetrics);
    }
  }, [investigationData]);

  useEffect(() => {
    if (performanceReportData) {
      setPerformanceData(performanceReportData.getPerformanceReport);
    }
  }, [performanceReportData]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        refetchThreat(),
        refetchInvestigation(),
        refetchPerformance(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportDashboard = async (format) => {
    try {
      const result = await exportDashboard({ variables: { format } });
      const exportData = result.data.exportDashboard;

      // Create download link
      const link = document.createElement('a');
      link.href = exportData.url;
      link.download = exportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderThreatIntelWidget = () => {
    if (!threatMetrics) return <LinearProgress />;

    const severityData = Object.entries(threatMetrics.threatSeverityDistribution || {}).map(
      ([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count,
        fill: getSeverityColor(severity),
      }),
    );

    return (
      <Grid container spacing={2}>
        {/* Key Metrics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Security color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {threatMetrics.totalIOCs.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total IOCs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {threatMetrics.activeThreats.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Threats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {threatMetrics.resolvedThreats.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Resolved Threats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {Math.round(
                      (threatMetrics.resolvedThreats /
                        (threatMetrics.activeThreats + threatMetrics.resolvedThreats)) *
                        100,
                    )}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Resolution Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Threat Severity Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Threat Severity Distribution"
              subheader="Distribution of threats by severity level"
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Threat Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Top Threat Types" subheader="Most common threat categories" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={threatMetrics.topThreatTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Geographic Distribution */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Geographic Threat Distribution"
              subheader="Threat activity by country"
            />
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Country</TableCell>
                    <TableCell align="right">Threat Count</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {threatMetrics.geographicDistribution.map((geo) => (
                    <TableRow key={geo.country}>
                      <TableCell>{geo.country}</TableCell>
                      <TableCell align="right">{geo.threatCount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {Math.round((geo.threatCount / threatMetrics.activeThreats) * 100)}%
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

  const renderInvestigationWidget = () => {
    if (!investigationMetrics) return <LinearProgress />;

    const statusData = Object.entries(investigationMetrics.investigationsByStatus || {}).map(
      ([status, count]) => ({
        name: status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1),
        value: count,
      }),
    );

    return (
      <Grid container spacing={2}>
        {/* Key Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                {investigationMetrics.totalInvestigations.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1">Total Investigations</Typography>
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Chip
                  label={`Active: ${investigationMetrics.activeInvestigations}`}
                  color="warning"
                  size="small"
                />
                <Chip
                  label={`Completed: ${investigationMetrics.completedInvestigations}`}
                  color="success"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main" gutterBottom>
                {Math.round(investigationMetrics.avgCompletionTime)}h
              </Typography>
              <Typography variant="subtitle1">Avg Completion Time</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(((72 - investigationMetrics.avgCompletionTime) / 72) * 100, 100)}
                sx={{ mt: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                Target: &lt; 72 hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main" gutterBottom>
                {investigationMetrics.evidenceMetrics.totalEvidence.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1">Total Evidence Items</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {investigationMetrics.findingsMetrics.totalFindings.toLocaleString()} findings
                generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Investigation Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Investigation Status Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  />
                  <RechartsTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Evidence Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Evidence by Type" />
            <CardContent>
              <List>
                {Object.entries(investigationMetrics.evidenceMetrics.evidenceByType || {}).map(
                  ([type, count]) => (
                    <ListItem key={type}>
                      <ListItemText
                        primary={type.charAt(0).toUpperCase() + type.slice(1)}
                        secondary={`${count} items`}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(
                          (count / investigationMetrics.evidenceMetrics.totalEvidence) * 100,
                        )}
                        %
                      </Typography>
                    </ListItem>
                  ),
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPerformanceWidget = () => {
    if (!performanceData) return <LinearProgress />;

    return (
      <Grid container spacing={2}>
        {/* System Health Metrics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Speed color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {Math.round(performanceData.metrics.avgResponseTime)}ms
                  </Typography>
                  <Typography variant="caption">Avg Response Time</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Memory color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {Math.round(
                      (performanceData.systemHealth.memoryUsage.heapUsed /
                        performanceData.systemHealth.memoryUsage.heapTotal) *
                        100,
                    )}
                    %
                  </Typography>
                  <Typography variant="caption">Memory Usage</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Storage color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {Math.round(performanceData.metrics.cacheHitRate)}%
                  </Typography>
                  <Typography variant="caption">Cache Hit Rate</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <NetworkCheck color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {performanceData.metrics.concurrentUsers}
                  </Typography>
                  <Typography variant="caption">Active Users</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Pool Status */}
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
                    <TableCell align="right">Avg Response (ms)</TableCell>
                    <TableCell align="right">Error Rate</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceData.connectionPools.map((pool) => (
                    <TableRow key={pool.id}>
                      <TableCell>{pool.type.toUpperCase()}</TableCell>
                      <TableCell align="right">{pool.activeConnections}</TableCell>
                      <TableCell align="right">{pool.maxConnections}</TableCell>
                      <TableCell align="right">{Math.round(pool.avgResponseTime)}</TableCell>
                      <TableCell align="right">{pool.errorRate.toFixed(2)}%</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={pool.errorRate < 1 ? 'Healthy' : 'Warning'}
                          color={pool.errorRate < 1 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Cache Strategies */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Cache Strategies" />
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Strategy</TableCell>
                    <TableCell>Pattern</TableCell>
                    <TableCell align="right">TTL (s)</TableCell>
                    <TableCell align="center">Priority</TableCell>
                    <TableCell align="center">Compression</TableCell>
                    <TableCell align="center">Prefetch</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceData.cacheStrategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell>{strategy.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {strategy.pattern}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{strategy.ttl}</TableCell>
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
                          label={strategy.compressionEnabled ? 'Yes' : 'No'}
                          color={strategy.compressionEnabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={strategy.prefetchEnabled ? 'Yes' : 'No'}
                          color={strategy.prefetchEnabled ? 'info' : 'default'}
                          size="small"
                        />
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

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d',
    };
    return colors[severity] || '#6b7280';
  };

  const tabPanels = [
    { label: 'Threat Intelligence', content: renderThreatIntelWidget(), icon: <Security /> },
    { label: 'Investigations', content: renderInvestigationWidget(), icon: <Assessment /> },
    { label: 'Performance', content: renderPerformanceWidget(), icon: <Speed /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Advanced Analytics Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <FormControlLabel
            control={
              <Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            }
            label="Auto Refresh"
          />
          <Tooltip title="Refresh All Data">
            <IconButton onClick={handleRefreshAll} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Dashboard">
            <IconButton onClick={() => handleExportDashboard('PDF')}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Status Summary */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Dashboard last updated: {dashboardConfig?.metadata?.lastUpdated || 'Loading...'}
        {' • '}
        {dashboardConfig?.metadata?.totalWidgets || 0} widgets active
        {' • '}
        Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
      </Alert>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          {tabPanels.map((panel, index) => (
            <Tab key={index} label={panel.label} icon={panel.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>{tabPanels[selectedTab]?.content}</Box>
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;
