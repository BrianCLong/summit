import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
  Card,
  CardContent,
  Alert,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Gavel as GavelIcon,
  Flag as FlagIcon,
  Description as AuditIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

import DashboardOverview from '../components/admin/DashboardOverview';
import UserManagement from '../components/admin/UserManagement';
import ModerationQueue from '../components/admin/ModerationQueue';
import FeatureFlagsPanel from '../components/admin/FeatureFlagsPanel';
import AuditLogViewer from '../components/admin/AuditLogViewer';
import DataExportTools from '../components/admin/DataExportTools';
import SystemConfigPanel from '../components/admin/SystemConfigPanel';
import AlertsPanel from '../components/admin/AlertsPanel';

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_DASHBOARD_STATS = gql`
  query GetAdminDashboard {
    adminDashboard {
      users {
        totalUsers
        activeUsers
        suspendedUsers
        adminUsers
        analystUsers
        viewerUsers
        activeToday
        activeThisWeek
        newThisMonth
      }
      audit {
        totalEvents
        eventsToday
        eventsThisWeek
        successfulEvents
        failedEvents
        uniqueUsers
        topActions {
          action
          count
        }
      }
      moderation {
        totalItems
        pendingItems
        approvedItems
        rejectedItems
        criticalItems
        highPriorityItems
        avgResolutionTimeSeconds
      }
      alerts {
        totalAlerts
        activeAlerts
        criticalAlerts
        highSeverityAlerts
        securityAlerts
        performanceAlerts
      }
    }
  }
`;

const GET_ACTIVE_ALERTS = gql`
  query GetActiveAlerts {
    adminAlerts(status: ACTIVE, limit: 5) {
      id
      alertType
      severity
      title
      message
      createdAt
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminDashboard() {
  const [currentTab, setCurrentTab] = useState(0);

  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useQuery(
    GET_DASHBOARD_STATS,
    {
      pollInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: alertsData } = useQuery(GET_ACTIVE_ALERTS, {
    pollInterval: 15000, // Refresh every 15 seconds
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const activeAlertCount = alertsData?.adminAlerts?.filter(
    (alert: any) => alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
  ).length || 0;

  if (dashboardError) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            Failed to load admin dashboard: {dashboardError.message}
            <br />
            Please ensure you have admin privileges.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        <IconButton color="inherit" size="large">
          <Badge badgeContent={activeAlertCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>

      {/* Critical Alerts Banner */}
      {alertsData?.adminAlerts?.some(
        (alert: any) => alert.severity === 'CRITICAL'
      ) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Critical Alerts Require Attention
          </Typography>
          {alertsData.adminAlerts
            .filter((alert: any) => alert.severity === 'CRITICAL')
            .map((alert: any) => (
              <Typography key={alert.id} variant="body2">
                • {alert.title}
              </Typography>
            ))}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="admin panel tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" {...a11yProps(0)} />
          <Tab icon={<PeopleIcon />} label="Users" {...a11yProps(1)} />
          <Tab
            icon={
              <Badge
                badgeContent={dashboardData?.adminDashboard?.moderation?.pendingItems || 0}
                color="warning"
              >
                <GavelIcon />
              </Badge>
            }
            label="Moderation"
            {...a11yProps(2)}
          />
          <Tab icon={<FlagIcon />} label="Feature Flags" {...a11yProps(3)} />
          <Tab icon={<AuditIcon />} label="Audit Logs" {...a11yProps(4)} />
          <Tab icon={<ExportIcon />} label="Data Exports" {...a11yProps(5)} />
          <Tab icon={<SettingsIcon />} label="System Config" {...a11yProps(6)} />
          <Tab
            icon={
              <Badge badgeContent={activeAlertCount} color="error">
                <NotificationsIcon />
              </Badge>
            }
            label="Alerts"
            {...a11yProps(7)}
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <DashboardOverview
          data={dashboardData?.adminDashboard}
          loading={dashboardLoading}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <UserManagement />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <ModerationQueue stats={dashboardData?.adminDashboard?.moderation} />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <FeatureFlagsPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <AuditLogViewer />
      </TabPanel>

      <TabPanel value={currentTab} index={5}>
        <DataExportTools />
      </TabPanel>

      <TabPanel value={currentTab} index={6}>
        <SystemConfigPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={7}>
        <AlertsPanel alerts={alertsData?.adminAlerts} />
      </TabPanel>
    </Container>
  );
}
