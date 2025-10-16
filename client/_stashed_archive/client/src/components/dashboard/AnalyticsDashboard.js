import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountTree,
  Psychology,
  Security,
  Group,
  LocationOn,
  Schedule,
  Warning,
  CheckCircle,
  Analytics,
  Speed,
  Visibility,
  MoreVert,
  Refresh,
  FilterList,
  GetApp,
  ExpandMore,
  Timeline,
  PieChart,
  BarChart,
  ShowChart,
  Map,
  BugReport,
  Star,
  Flag,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';

// Mock data for demonstration
const mockMetrics = {
  network: {
    totalNodes: 1247,
    totalEdges: 2891,
    density: 0.37,
    avgDegree: 4.6,
    components: 3,
    clusters: 8,
  },
  investigations: {
    total: 24,
    active: 8,
    completed: 14,
    pending: 2,
    recentActivity: 15,
  },
  alerts: {
    high: 3,
    medium: 7,
    low: 12,
    total: 22,
  },
  activity: {
    dailyQueries: 127,
    weeklyAnalyses: 45,
    collaborators: 12,
    avgSessionTime: '2.3h',
  },
};

const mockRecentActivity = [
  {
    id: 1,
    type: 'analysis',
    title: 'Centrality Analysis Completed',
    description: 'Network centrality analysis identified 5 key hub entities',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'John Analyst',
    status: 'completed',
    priority: 'medium',
  },
  {
    id: 2,
    type: 'anomaly',
    title: 'Anomaly Detected',
    description:
      'Unusual connection pattern found between Organization A and Location B',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    user: 'AI System',
    status: 'alert',
    priority: 'high',
  },
  {
    id: 3,
    type: 'investigation',
    title: 'Investigation INV-001 Updated',
    description: 'New evidence added to financial fraud investigation',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    user: 'Jane Investigator',
    status: 'in-progress',
    priority: 'medium',
  },
  {
    id: 4,
    type: 'collaboration',
    title: 'Team Comment Added',
    description: 'Mike Operative commented on suspicious location cluster',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    user: 'Mike Operative',
    status: 'info',
    priority: 'low',
  },
];

const mockInsights = [
  {
    id: 1,
    title: 'Network Growth Trend',
    description: 'Entity connections have increased by 23% this month',
    confidence: 0.89,
    trend: 'up',
    category: 'network',
    actionable: true,
  },
  {
    id: 2,
    title: 'Geographic Clustering',
    description: '3 new geographic clusters identified in surveillance data',
    confidence: 0.76,
    trend: 'neutral',
    category: 'geospatial',
    actionable: true,
  },
  {
    id: 3,
    title: 'Relationship Pattern Change',
    description: 'Communication patterns show shift towards encrypted channels',
    confidence: 0.92,
    trend: 'down',
    category: 'communication',
    actionable: true,
  },
  {
    id: 4,
    title: 'Entity Importance Shift',
    description: 'New high-importance entities emerged in financial network',
    confidence: 0.84,
    trend: 'up',
    category: 'financial',
    actionable: false,
  },
];

function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [detailDialog, setDetailDialog] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    color = 'primary',
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          {trend && (
            <Chip
              icon={trend === 'up' ? <TrendingUp /> : <TrendingDown />}
              label={trend === 'up' ? '+12%' : '-5%'}
              color={trend === 'up' ? 'success' : 'warning'}
              size="small"
            />
          )}
        </Box>
        <Typography
          variant="h4"
          component="div"
          sx={{ fontWeight: 'bold', mb: 1 }}
        >
          {value}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const ActivityItem = ({ activity }) => (
    <ListItem
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        mb: 1,
        bgcolor: 'background.paper',
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            bgcolor:
              activity.status === 'alert'
                ? 'error.main'
                : activity.status === 'completed'
                  ? 'success.main'
                  : activity.status === 'in-progress'
                    ? 'warning.main'
                    : 'info.main',
            width: 32,
            height: 32,
          }}
        >
          {activity.type === 'analysis' ? (
            <Analytics />
          ) : activity.type === 'anomaly' ? (
            <BugReport />
          ) : activity.type === 'investigation' ? (
            <Search />
          ) : (
            <Group />
          )}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {activity.title}
            </Typography>
            <Chip
              label={activity.priority}
              size="small"
              color={
                activity.priority === 'high'
                  ? 'error'
                  : activity.priority === 'medium'
                    ? 'warning'
                    : 'default'
              }
              variant="outlined"
            />
          </Box>
        }
        secondary={
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {activity.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activity.user} •{' '}
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </Typography>
          </>
        }
      />
    </ListItem>
  );

  const InsightCard = ({ insight }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {insight.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${(insight.confidence * 100).toFixed(0)}%`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {insight.trend !== 'neutral' && (
              <IconButton
                size="small"
                color={insight.trend === 'up' ? 'success' : 'warning'}
              >
                {insight.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
              </IconButton>
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {insight.description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Chip label={insight.category} size="small" variant="outlined" />
          {insight.actionable && (
            <Button size="small" variant="outlined">
              Take Action
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="1d">Last 24h</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={
              refreshing ? <CircularProgress size={16} /> : <Refresh />
            }
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<GetApp />}>
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total Entities"
            value={mockMetrics.network.totalNodes.toLocaleString()}
            subtitle="Network nodes"
            icon={<AccountTree />}
            trend="up"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Active Investigations"
            value={mockMetrics.investigations.active}
            subtitle={`${mockMetrics.investigations.total} total`}
            icon={<Security />}
            trend="up"
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="High Priority Alerts"
            value={mockMetrics.alerts.high}
            subtitle={`${mockMetrics.alerts.total} total alerts`}
            icon={<Warning />}
            trend="down"
            color="error"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Daily Queries"
            value={mockMetrics.activity.dailyQueries}
            subtitle="AI-powered searches"
            icon={<Psychology />}
            trend="up"
            color="info"
          />
        </Grid>

        {/* Network Overview */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Network Overview
                </Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>

              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label="Structure" icon={<AccountTree />} />
                <Tab label="Growth" icon={<TrendingUp />} />
                <Tab label="Clusters" icon={<Group />} />
              </Tabs>

              <Box sx={{ mt: 2, height: 300 }}>
                {activeTab === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography
                          variant="h3"
                          color="primary.main"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {mockMetrics.network.totalEdges.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Connections
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography
                          variant="h3"
                          color="secondary.main"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {mockMetrics.network.density.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Network Density
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography
                          variant="h3"
                          color="success.main"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {mockMetrics.network.avgDegree.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Degree
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography
                          variant="h3"
                          color="warning.main"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {mockMetrics.network.clusters}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Clusters Found
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Network growth visualization would be rendered here using
                      Chart.js or D3.js
                    </Alert>
                    <Typography variant="body1" color="text.secondary">
                      Interactive time-series chart showing network growth
                      patterns, entity additions, and relationship formations
                      over time.
                    </Typography>
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Cluster analysis visualization would be rendered here
                    </Alert>
                    <Typography variant="body1" color="text.secondary">
                      Interactive cluster visualization showing community
                      detection results, cluster sizes, and inter-cluster
                      relationships.
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Quick Statistics
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <Speed color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Avg. Session Time"
                    secondary={mockMetrics.activity.avgSessionTime}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Group color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Collaborators"
                    secondary={`${mockMetrics.activity.collaborators} users`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Analytics color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Weekly Analyses"
                    secondary={`${mockMetrics.activity.weeklyAnalyses} completed`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="System Health"
                    secondary="All systems operational"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Investigation Status
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption">Active</Typography>
                  <Typography variant="caption">
                    {mockMetrics.investigations.active}/
                    {mockMetrics.investigations.total}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    (mockMetrics.investigations.active /
                      mockMetrics.investigations.total) *
                    100
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Activity
                </Typography>
                <Badge badgeContent={mockRecentActivity.length} color="primary">
                  <Timeline />
                </Badge>
              </Box>

              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {mockRecentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Insights */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  AI Insights
                </Typography>
                <Chip label="Live" color="success" size="small" />
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {mockInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Summary */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Flag color="error" />
                <Typography variant="h6">Alert Summary</Typography>
                <Badge badgeContent={mockMetrics.alerts.high} color="error">
                  <Chip label="High Priority" color="error" size="small" />
                </Badge>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: 'error.main',
                      color: 'error.contrastText',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                      {mockMetrics.alerts.high}
                    </Typography>
                    <Typography variant="body2">High Priority</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: 'warning.main',
                      color: 'warning.contrastText',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                      {mockMetrics.alerts.medium}
                    </Typography>
                    <Typography variant="body2">Medium Priority</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: 'info.main',
                      color: 'info.contrastText',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                      {mockMetrics.alerts.low}
                    </Typography>
                    <Typography variant="body2">Low Priority</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AnalyticsDashboard;
