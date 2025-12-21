import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    adminUsers: number;
    analystUsers: number;
    viewerUsers: number;
    activeToday: number;
    activeThisWeek: number;
    newThisMonth: number;
  };
  audit: {
    totalEvents: number;
    eventsToday: number;
    eventsThisWeek: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
  };
  moderation: {
    totalItems: number;
    pendingItems: number;
    approvedItems: number;
    rejectedItems: number;
    criticalItems: number;
    highPriorityItems: number;
    avgResolutionTimeSeconds: number;
  };
  alerts: {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    highSeverityAlerts: number;
    securityAlerts: number;
    performanceAlerts: number;
  };
}

interface Props {
  data?: DashboardStats;
  loading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardOverview({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={150} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const { users, audit, moderation, alerts } = data;

  // Calculate percentages
  const activeUserPercentage = (users.activeUsers / users.totalUsers) * 100;
  const auditSuccessRate = (audit.successfulEvents / audit.totalEvents) * 100;
  const moderationPendingPercentage = (moderation.pendingItems / moderation.totalItems) * 100;

  // Data for charts
  const userRoleData = [
    { name: 'Admins', value: users.adminUsers },
    { name: 'Analysts', value: users.analystUsers },
    { name: 'Viewers', value: users.viewerUsers },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="textSecondary">
                  Total Users
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {users.totalUsers.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${users.activeUsers} active`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                {users.suspendedUsers > 0 && (
                  <Chip
                    label={`${users.suspendedUsers} suspended`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Active Rate
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={activeUserPercentage}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="textSecondary">
                  Activity
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {users.activeToday.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active today
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block">
                  {users.activeThisWeek} active this week
                </Typography>
                <Typography variant="caption" display="block">
                  {users.newThisMonth} new this month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Moderation */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="textSecondary">
                  Moderation
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {moderation.pendingItems}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending review
              </Typography>
              <Box sx={{ mt: 2 }}>
                {moderation.criticalItems > 0 && (
                  <Chip
                    label={`${moderation.criticalItems} critical`}
                    size="small"
                    color="error"
                  />
                )}
                {moderation.highPriorityItems > 0 && (
                  <Chip
                    label={`${moderation.highPriorityItems} high priority`}
                    size="small"
                    color="warning"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="textSecondary">
                  Alerts
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {alerts.activeAlerts}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active alerts
              </Typography>
              <Box sx={{ mt: 2 }}>
                {alerts.criticalAlerts > 0 && (
                  <Chip
                    label={`${alerts.criticalAlerts} critical`}
                    size="small"
                    color="error"
                  />
                )}
                {alerts.securityAlerts > 0 && (
                  <Chip
                    label={`${alerts.securityAlerts} security`}
                    size="small"
                    color="warning"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Details */}
      <Grid container spacing={3}>
        {/* User Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Distribution by Role
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Audit Actions (Last 7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={audit.topActions.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="action" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Audit Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Audit Summary
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Total Events"
                  secondary={audit.totalEvents.toLocaleString()}
                />
                <CheckCircleIcon color="success" />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Events Today"
                  secondary={audit.eventsToday.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Success Rate"
                  secondary={`${auditSuccessRate.toFixed(1)}%`}
                />
                <LinearProgress
                  variant="determinate"
                  value={auditSuccessRate}
                  sx={{ width: 100, ml: 2 }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Failed Events"
                  secondary={audit.failedEvents.toLocaleString()}
                />
                {audit.failedEvents > 0 && <ErrorIcon color="error" />}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Unique Users"
                  secondary={audit.uniqueUsers.toLocaleString()}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Moderation Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Moderation Summary
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Total Items"
                  secondary={moderation.totalItems.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Pending Review"
                  secondary={moderation.pendingItems.toLocaleString()}
                />
                <Chip
                  label={`${moderationPendingPercentage.toFixed(0)}%`}
                  color={moderationPendingPercentage > 50 ? 'warning' : 'default'}
                  size="small"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Approved"
                  secondary={moderation.approvedItems.toLocaleString()}
                />
                <CheckCircleIcon color="success" />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Rejected"
                  secondary={moderation.rejectedItems.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Avg Resolution Time"
                  secondary={`${Math.round(moderation.avgResolutionTimeSeconds / 60)} minutes`}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
