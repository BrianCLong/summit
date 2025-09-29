/**
 * Policy Management Dashboard
 *
 * Main dashboard for policy management including privacy settings,
 * license monitoring, governance compliance, and real-time violations.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Button,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Policy as PolicyIcon,
  Security as SecurityIcon,
  Gavel as LicenseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PolicyConfigurationPanel } from './PolicyConfigurationPanel';
import { PrivacyPolicyPanel } from './PrivacyPolicyPanel';
import { LicenseUsagePanel } from './LicenseUsagePanel';
import { GovernanceCompliancePanel } from './GovernanceCompliancePanel';
import { PolicyViolationsPanel } from './PolicyViolationsPanel';
import { useTenant } from '../../hooks/useTenant';
import { logger } from '../../utils/logger';

// GraphQL queries and mutations
const POLICY_HEALTH_CHECK = gql`
  query PolicyHealthCheck {
    policyHealthCheck
  }
`;

const POLICY_CONFIGURATIONS = gql`
  query PolicyConfigurations($tenantId: String!, $type: PolicyType, $enabled: Boolean) {
    policyConfigurations(tenantId: $tenantId, type: $type, enabled: $enabled) {
      id
      tenantId
      type
      name
      description
      enabled
      rules
      metadata
      createdAt
      updatedAt
      createdBy
    }
  }
`;

const LICENSE_USAGE = gql`
  query LicenseUsage($tenantId: String!) {
    licenseUsage(tenantId: $tenantId) {
      apiCalls {
        current
        limit
        period
        resetAt
        percentage
      }
      dataProcessing {
        current
        limit
        period
        resetAt
        percentage
      }
      storage {
        current
        limit
        period
        resetAt
        percentage
      }
      users {
        current
        limit
        period
        resetAt
        percentage
      }
      exports {
        current
        limit
        period
        resetAt
        percentage
      }
    }
  }
`;

const POLICY_EVALUATION_HISTORY = gql`
  query PolicyEvaluationHistory(
    $tenantId: String!
    $resource: String
    $action: String
    $limit: Int
    $offset: Int
  ) {
    policyEvaluationHistory(
      tenantId: $tenantId
      resource: $resource
      action: $action
      limit: $limit
      offset: $offset
    ) {
      allowed
      violations {
        type
        severity
        message
        resource
        action
      }
      reason
      metadata
      evaluatedAt
      cacheHit
    }
  }
`;

const CLEAR_POLICY_CACHE = gql`
  mutation ClearPolicyCache($tenantId: String, $resource: String, $action: String) {
    clearPolicyCache(tenantId: $tenantId, resource: $resource, action: $action)
  }
`;

// Subscription for real-time updates
const POLICY_VIOLATIONS_SUBSCRIPTION = gql`
  subscription PolicyViolations($tenantId: String!) {
    policyViolations(tenantId: $tenantId) {
      type
      severity
      message
      resource
      action
    }
  }
`;

const LICENSE_USAGE_SUBSCRIPTION = gql`
  subscription LicenseUsageUpdates($tenantId: String!) {
    licenseUsageUpdates(tenantId: $tenantId) {
      apiCalls {
        current
        percentage
      }
      dataProcessing {
        current
        percentage
      }
      storage {
        current
        percentage
      }
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`policy-tabpanel-${index}`}
      aria-labelledby={`policy-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const PolicyDashboard: React.FC = () => {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [violations, setViolations] = useState<any[]>([]);

  // GraphQL hooks
  const { data: healthData, loading: healthLoading, refetch: refetchHealth } = useQuery(
    POLICY_HEALTH_CHECK,
    {
      pollInterval: autoRefresh ? 30000 : 0,
      errorPolicy: 'all'
    }
  );

  const { data: configurationsData, loading: configurationsLoading, refetch: refetchConfigurations } = useQuery(
    POLICY_CONFIGURATIONS,
    {
      variables: { tenantId: tenant?.id },
      skip: !tenant?.id,
      pollInterval: autoRefresh ? 60000 : 0
    }
  );

  const { data: licenseData, loading: licenseLoading, refetch: refetchLicense } = useQuery(
    LICENSE_USAGE,
    {
      variables: { tenantId: tenant?.id },
      skip: !tenant?.id,
      pollInterval: autoRefresh ? 10000 : 0
    }
  );

  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useQuery(
    POLICY_EVALUATION_HISTORY,
    {
      variables: {
        tenantId: tenant?.id,
        limit: 50,
        offset: 0
      },
      skip: !tenant?.id,
      pollInterval: autoRefresh ? 30000 : 0
    }
  );

  const [clearPolicyCache] = useMutation(CLEAR_POLICY_CACHE);

  // Subscriptions for real-time updates
  useSubscription(POLICY_VIOLATIONS_SUBSCRIPTION, {
    variables: { tenantId: tenant?.id },
    skip: !tenant?.id,
    onData: ({ data }) => {
      if (data.data?.policyViolations) {
        setViolations(prev => [
          data.data.policyViolations,
          ...prev.slice(0, 19) // Keep last 20 violations
        ]);
      }
    }
  });

  useSubscription(LICENSE_USAGE_SUBSCRIPTION, {
    variables: { tenantId: tenant?.id },
    skip: !tenant?.id,
    onData: () => {
      // Trigger license data refresh
      refetchLicense();
    }
  });

  // Handle cache clearing
  const handleClearCache = async () => {
    try {
      await clearPolicyCache({
        variables: { tenantId: tenant?.id }
      });

      logger.info('Policy cache cleared');

      // Refresh all data
      await Promise.all([
        refetchHealth(),
        refetchConfigurations(),
        refetchLicense(),
        refetchHistory()
      ]);
    } catch (error) {
      logger.error('Failed to clear policy cache', error);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Get system health status
  const getHealthStatus = () => {
    if (!healthData?.policyHealthCheck) return 'unknown';

    const health = healthData.policyHealthCheck;

    if (health.opa?.healthy && health.privacy?.healthy && health.licensing?.healthy) {
      return 'healthy';
    } else if (health.opa?.healthy || health.privacy?.healthy || health.licensing?.healthy) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  };

  // Get health status color
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  // Get recent violations summary
  const getViolationsSummary = () => {
    const recent = violations.slice(0, 5);
    const critical = recent.filter(v => v.severity === 'CRITICAL').length;
    const high = recent.filter(v => v.severity === 'HIGH').length;

    return { total: recent.length, critical, high };
  };

  // Get license usage alerts
  const getLicenseAlerts = () => {
    if (!licenseData?.licenseUsage) return [];

    const alerts = [];
    const usage = licenseData.licenseUsage;

    Object.entries(usage).forEach(([key, value]: [string, any]) => {
      if (value.percentage >= 90) {
        alerts.push({
          type: 'error',
          message: `${key} usage at ${value.percentage.toFixed(1)}%`
        });
      } else if (value.percentage >= 80) {
        alerts.push({
          type: 'warning',
          message: `${key} usage at ${value.percentage.toFixed(1)}%`
        });
      }
    });

    return alerts;
  };

  const healthStatus = getHealthStatus();
  const violationsSummary = getViolationsSummary();
  const licenseAlerts = getLicenseAlerts();

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon fontSize="large" />
          Policy Management
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />

          <Tooltip title="Clear Policy Cache">
            <IconButton onClick={handleClearCache} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Chip
            icon={
              healthStatus === 'healthy' ? <CheckIcon /> :
              healthStatus === 'degraded' ? <WarningIcon /> : <ErrorIcon />
            }
            label={`System ${healthStatus}`}
            color={getHealthColor(healthStatus) as any}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Policy Health */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PolicyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Policy Health</Typography>
                  <Typography variant="body2" color="text.secondary">
                    System Status
                  </Typography>
                </Box>
              </Box>

              {healthLoading ? (
                <LinearProgress />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">OPA Engine</Typography>
                    <Chip
                      size="small"
                      label={healthData?.policyHealthCheck?.opa?.healthy ? 'Online' : 'Offline'}
                      color={healthData?.policyHealthCheck?.opa?.healthy ? 'success' : 'error'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Privacy</Typography>
                    <Chip
                      size="small"
                      label={healthData?.policyHealthCheck?.privacy?.healthy ? 'Online' : 'Offline'}
                      color={healthData?.policyHealthCheck?.privacy?.healthy ? 'success' : 'error'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Licensing</Typography>
                    <Chip
                      size="small"
                      label={healthData?.policyHealthCheck?.licensing?.healthy ? 'Online' : 'Offline'}
                      color={healthData?.policyHealthCheck?.licensing?.healthy ? 'success' : 'error'}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Violations */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <WarningIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Recent Violations</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 5 minutes
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Total</Typography>
                  <Typography variant="h6">{violationsSummary.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Critical</Typography>
                  <Typography variant="h6" color="error.main">
                    {violationsSummary.critical}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">High</Typography>
                  <Typography variant="h6" color="warning.main">
                    {violationsSummary.high}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* License Usage */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <LicenseIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">License Usage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current Period
                  </Typography>
                </Box>
              </Box>

              {licenseLoading ? (
                <LinearProgress />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      API Calls
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={licenseData?.licenseUsage?.apiCalls?.percentage || 0}
                      color={
                        (licenseData?.licenseUsage?.apiCalls?.percentage || 0) >= 90 ? 'error' :
                        (licenseData?.licenseUsage?.apiCalls?.percentage || 0) >= 80 ? 'warning' : 'primary'
                      }
                    />
                    <Typography variant="caption">
                      {licenseData?.licenseUsage?.apiCalls?.current || 0} / {licenseData?.licenseUsage?.apiCalls?.limit || 0}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Storage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={licenseData?.licenseUsage?.storage?.percentage || 0}
                      color={
                        (licenseData?.licenseUsage?.storage?.percentage || 0) >= 90 ? 'error' :
                        (licenseData?.licenseUsage?.storage?.percentage || 0) >= 80 ? 'warning' : 'primary'
                      }
                    />
                    <Typography variant="caption">
                      {licenseData?.licenseUsage?.storage?.current || 0} / {licenseData?.licenseUsage?.storage?.limit || 0} GB
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Configurations */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <SettingsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Configurations</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Policies
                  </Typography>
                </Box>
              </Box>

              {configurationsLoading ? (
                <LinearProgress />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {['PRIVACY', 'LICENSING', 'GOVERNANCE', 'SECURITY'].map((type) => {
                    const count = configurationsData?.policyConfigurations?.filter(
                      (config: any) => config.type === type && config.enabled
                    ).length || 0;

                    return (
                      <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{type}</Typography>
                        <Typography variant="h6">{count}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* License Alerts */}
      {licenseAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {licenseAlerts.map((alert, index) => (
            <Alert key={index} severity={alert.type as any} sx={{ mb: 1 }}>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="policy management tabs">
            <Tab label="Overview" icon={<TimelineIcon />} />
            <Tab label="Privacy" icon={<SecurityIcon />} />
            <Tab label="Licensing" icon={<LicenseIcon />} />
            <Tab label="Governance" icon={<PolicyIcon />} />
            <Tab label="Violations" icon={<Badge badgeContent={violationsSummary.total} color="error"><WarningIcon /></Badge>} />
            <Tab label="Configuration" icon={<SettingsIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Overview content will be added here */}
          <Typography variant="h6" gutterBottom>
            Policy Evaluation History
          </Typography>

          {historyLoading ? (
            <LinearProgress />
          ) : (
            <List>
              {historyData?.policyEvaluationHistory?.slice(0, 10).map((evaluation: any, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {evaluation.allowed ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={evaluation.reason || (evaluation.allowed ? 'Policy passed' : 'Policy failed')}
                    secondary={`${format(new Date(evaluation.evaluatedAt), 'PPpp')} ${evaluation.cacheHit ? '(cached)' : ''}`}
                  />
                  {!evaluation.allowed && evaluation.violations?.length > 0 && (
                    <Chip
                      size="small"
                      label={`${evaluation.violations.length} violations`}
                      color="error"
                    />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PrivacyPolicyPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <LicenseUsagePanel />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <GovernanceCompliancePanel />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <PolicyViolationsPanel violations={violations} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <PolicyConfigurationPanel />
        </TabPanel>
      </Card>
    </Box>
  );
};