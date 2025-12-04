/**
 * AI Governance Metrics Dashboard
 * Real-time dashboard for AI governance metrics with ODNI compliance tracking
 * Implements p95 < 2s latency requirement
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  AlertTitle,
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning as WarningIcon,
  CheckCircle,
  Error as ErrorIcon,
  Security as Shield,
  Assessment,
  Timeline,
  BugReport,
  Gavel,
  Refresh,
  Download,
  Settings,
  Notifications,
  Speed,
} from '@mui/icons-material';
import { gql, useQuery, useSubscription } from '@apollo/client';

// GraphQL Queries
const GET_GOVERNANCE_METRICS = gql`
  query GetGovernanceMetrics($input: GovernanceMetricsInput!) {
    governanceMetrics(input: $input) {
      validationRate {
        totalDecisions
        validatedDecisions
        validationRate
        targetRate
        trend
        breakdown {
          category
          validated
          total
          rate
          compliant
        }
        lastUpdated
        meetsODNIRequirement
      }
      incidentTrends {
        current {
          totalIncidents
          resolvedIncidents
          mttr
          startDate
          endDate
        }
        previous {
          totalIncidents
        }
        trend
        byCategory {
          name
          count
          percentOfTotal
          trend
        }
        bySeverity {
          severity
          count
          percentOfTotal
          avgResolutionTime
        }
        timeline {
          timestamp
          incidents
          resolved
          validationRate
        }
      }
      complianceGaps {
        id
        framework
        requirement
        category
        severity
        description
        currentState
        requiredState
        remediationPlan
        dueDate
        owner
        status
        daysUntilDue
      }
      riskScore {
        overall
        components {
          name
          score
          status
        }
        trend
        riskLevel
      }
      auditTrail {
        id
        timestamp
        eventType
        actor
        resource
        action
        outcome
        riskLevel
      }
      modelGovernance {
        totalModels
        approvedModels
        pendingReview
        rejectedModels
        deploymentMetrics {
          totalDeployments
          successfulDeployments
          failedDeployments
          successRate
        }
        biasMetrics {
          modelsAudited
          biasDetected
          biasRemediations
          detectionRate
        }
        approvalRate
      }
      overallCompliance {
        isCompliant
        validationMeetsODNI
        criticalGapsCount
        highGapsCount
        riskLevel
      }
      timestamp
    }
  }
`;

const GOVERNANCE_METRICS_SUBSCRIPTION = gql`
  subscription OnGovernanceMetricsUpdated($tenantId: String!) {
    governanceMetricsUpdated(tenantId: $tenantId) {
      validationRate {
        validationRate
        meetsODNIRequirement
      }
      riskScore {
        overall
        riskLevel
      }
      timestamp
    }
  }
`;

// Types
interface TimeRange {
  start: number;
  end: number;
  label: string;
}

interface GovernanceMetricsDashboardProps {
  tenantId: string;
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  realTimeEnabled?: boolean;
}

type TabValue = 0 | 1 | 2 | 3 | 4;

// Helper Components
const TrendIndicator: React.FC<{ trend: string; value?: number }> = ({
  trend,
  value,
}) => {
  const Icon =
    trend === 'UP'
      ? TrendingUp
      : trend === 'DOWN'
        ? TrendingDown
        : TrendingFlat;
  const color =
    trend === 'UP' ? 'success.main' : trend === 'DOWN' ? 'error.main' : 'grey.500';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Icon fontSize="small" sx={{ color }} />
      {value !== undefined && (
        <Typography variant="body2" sx={{ color }}>
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}%
        </Typography>
      )}
    </Box>
  );
};

const SeverityChip: React.FC<{ severity: string }> = ({ severity }) => {
  const colorMap: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
    CRITICAL: 'error',
    HIGH: 'warning',
    MEDIUM: 'info',
    LOW: 'success',
  };

  return (
    <Chip
      label={severity}
      color={colorMap[severity] || 'default'}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
    OPEN: 'error',
    IN_PROGRESS: 'warning',
    MITIGATED: 'success',
    ACCEPTED: 'default',
  };

  return (
    <Chip
      label={status.replace('_', ' ')}
      color={colorMap[status] || 'default'}
      size="small"
      variant="outlined"
    />
  );
};

// Main Dashboard Component
export const GovernanceMetricsDashboard: React.FC<
  GovernanceMetricsDashboardProps
> = ({ tenantId, onExport, realTimeEnabled = true }) => {
  const [activeTab, setActiveTab] = useState<TabValue>(0);
  const [timeRangeLabel, setTimeRangeLabel] = useState<string>('24h');
  const [autoRefresh, setAutoRefresh] = useState(realTimeEnabled);

  const timeRange: TimeRange = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return {
      start: now - ranges[timeRangeLabel],
      end: now,
      label: timeRangeLabel,
    };
  }, [timeRangeLabel]);

  const { data, loading, error, refetch } = useQuery(GET_GOVERNANCE_METRICS, {
    variables: {
      input: {
        tenantId,
        timeRange,
        includeHistorical: true,
      },
    },
    pollInterval: autoRefresh ? 30000 : 0, // Poll every 30s if auto-refresh enabled
  });

  // Real-time subscription
  useSubscription(GOVERNANCE_METRICS_SUBSCRIPTION, {
    variables: { tenantId },
    skip: !realTimeEnabled,
    onData: () => {
      // Metrics will update via subscription
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const metrics = data?.governanceMetrics;

  if (loading && !metrics) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error Loading Governance Metrics</AlertTitle>
        {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            AI Governance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated:{' '}
            {metrics?.timestamp
              ? new Date(metrics.timestamp).toLocaleString()
              : 'N/A'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRangeLabel}
              label="Time Range"
              onChange={(e) => setTimeRangeLabel(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh"
          />

          <Tooltip title="Refresh Now">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export Data">
            <IconButton onClick={() => onExport?.('csv')}>
              <Download />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton>
              <Settings />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Loading Progress */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Compliance Alert Banner */}
      {metrics?.overallCompliance && !metrics.overallCompliance.isCompliant && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
          action={
            <Button color="inherit" size="small">
              View Details
            </Button>
          }
        >
          <AlertTitle>Compliance Issues Detected</AlertTitle>
          {!metrics.overallCompliance.validationMeetsODNI && (
            <Typography variant="body2">
              ODNI Validation Rate below 85% target (current:{' '}
              {metrics.validationRate?.validationRate?.toFixed(1)}%)
            </Typography>
          )}
          {metrics.overallCompliance.criticalGapsCount > 0 && (
            <Typography variant="body2">
              {metrics.overallCompliance.criticalGapsCount} critical compliance
              gap(s) require immediate attention
            </Typography>
          )}
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* ODNI Validation Rate Card */}
        <Grid xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderLeft: 4,
              borderColor: metrics?.validationRate?.meetsODNIRequirement
                ? 'success.main'
                : 'error.main',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  ODNI Validation Rate
                </Typography>
                <Chip
                  label="85% Target"
                  size="small"
                  color={
                    metrics?.validationRate?.meetsODNIRequirement
                      ? 'success'
                      : 'error'
                  }
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.validationRate?.validationRate?.toFixed(1) || 0}%
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator trend={metrics?.validationRate?.trend || 'STABLE'} />
                <Typography variant="body2" color="text.secondary">
                  {metrics?.validationRate?.validatedDecisions || 0} /{' '}
                  {metrics?.validationRate?.totalDecisions || 0} decisions
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Score Card */}
        <Grid xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderLeft: 4,
              borderColor:
                metrics?.riskScore?.riskLevel === 'LOW'
                  ? 'success.main'
                  : metrics?.riskScore?.riskLevel === 'MEDIUM'
                    ? 'warning.main'
                    : 'error.main',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Risk Score
                </Typography>
                <SeverityChip severity={metrics?.riskScore?.riskLevel || 'LOW'} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.riskScore?.overall?.toFixed(0) || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator trend={metrics?.riskScore?.trend || 'STABLE'} />
                <Typography variant="body2" color="text.secondary">
                  {metrics?.riskScore?.components?.length || 0} components tracked
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Incidents Card */}
        <Grid xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Active Incidents
                </Typography>
                <BugReport color="warning" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {(metrics?.incidentTrends?.current?.totalIncidents || 0) -
                  (metrics?.incidentTrends?.current?.resolvedIncidents || 0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIndicator
                  trend={metrics?.incidentTrends?.trend || 'STABLE'}
                />
                <Typography variant="body2" color="text.secondary">
                  MTTR: {Math.round((metrics?.incidentTrends?.current?.mttr || 0) / 60)}m
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Gaps Card */}
        <Grid xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderLeft: 4,
              borderColor:
                (metrics?.overallCompliance?.criticalGapsCount || 0) > 0
                  ? 'error.main'
                  : 'success.main',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Compliance Gaps
                </Typography>
                <Gavel
                  color={
                    (metrics?.overallCompliance?.criticalGapsCount || 0) > 0
                      ? 'error'
                      : 'success'
                  }
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {metrics?.complianceGaps?.length || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="error.main">
                  {metrics?.overallCompliance?.criticalGapsCount || 0} critical
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {metrics?.overallCompliance?.highGapsCount || 0} high
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue as TabValue)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<Assessment />} label="Overview" iconPosition="start" />
        <Tab icon={<Shield />} label="Validation" iconPosition="start" />
        <Tab icon={<Timeline />} label="Incidents" iconPosition="start" />
        <Tab icon={<Gavel />} label="Compliance Gaps" iconPosition="start" />
        <Tab icon={<Speed />} label="Model Governance" iconPosition="start" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 0 && (
        <OverviewTab
          metrics={metrics}
        />
      )}

      {activeTab === 1 && (
        <ValidationTab
          validationMetrics={metrics?.validationRate}
        />
      )}

      {activeTab === 2 && (
        <IncidentsTab
          incidentTrends={metrics?.incidentTrends}
        />
      )}

      {activeTab === 3 && (
        <ComplianceGapsTab
          gaps={metrics?.complianceGaps || []}
        />
      )}

      {activeTab === 4 && (
        <ModelGovernanceTab
          modelGovernance={metrics?.modelGovernance}
        />
      )}
    </Box>
  );
};

// Sub-components for each tab
const OverviewTab: React.FC<{ metrics: any }> = ({ metrics }) => (
  <Grid container spacing={3}>
    {/* Validation Breakdown */}
    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Validation by Category
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics?.validationRate?.breakdown?.map((item: any) => (
                <TableRow key={item.category}>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">{item.rate?.toFixed(1)}%</TableCell>
                  <TableCell align="center">
                    {item.compliant ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Grid>

    {/* Risk Components */}
    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Risk Components
        </Typography>
        <Stack spacing={2}>
          {metrics?.riskScore?.components?.map((component: any) => (
            <Box key={component.name}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="body2">{component.name}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {component.score?.toFixed(0)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={component.score}
                color={
                  component.status === 'HEALTHY'
                    ? 'success'
                    : component.status === 'WARNING'
                      ? 'warning'
                      : 'error'
                }
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Grid>

    {/* Recent Audit Events */}
    <Grid xs={12}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Audit Events
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Risk</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics?.auditTrail?.slice(0, 10).map((event: any) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>{event.eventType.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{event.actor}</TableCell>
                  <TableCell>{event.resource}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>
                    <Chip
                      label={event.outcome}
                      size="small"
                      color={
                        event.outcome === 'SUCCESS'
                          ? 'success'
                          : event.outcome === 'FAILURE'
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <SeverityChip severity={event.riskLevel} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Grid>
  </Grid>
);

const ValidationTab: React.FC<{ validationMetrics: any }> = ({
  validationMetrics,
}) => (
  <Grid container spacing={3}>
    <Grid xs={12}>
      <Alert
        severity={validationMetrics?.meetsODNIRequirement ? 'success' : 'error'}
        icon={
          validationMetrics?.meetsODNIRequirement ? (
            <CheckCircle />
          ) : (
            <WarningIcon />
          )
        }
      >
        <AlertTitle>
          ODNI 85% Validation Requirement:{' '}
          {validationMetrics?.meetsODNIRequirement ? 'Met' : 'Not Met'}
        </AlertTitle>
        Current validation rate: {validationMetrics?.validationRate?.toFixed(2)}%
        (Target: {validationMetrics?.targetRate}%)
      </Alert>
    </Grid>

    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Validation Summary
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Total Decisions</Typography>
            <Typography fontWeight={600}>
              {validationMetrics?.totalDecisions?.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Validated Decisions</Typography>
            <Typography fontWeight={600}>
              {validationMetrics?.validatedDecisions?.toLocaleString()}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Validation Rate</Typography>
            <Typography
              fontWeight={600}
              color={
                validationMetrics?.meetsODNIRequirement
                  ? 'success.main'
                  : 'error.main'
              }
            >
              {validationMetrics?.validationRate?.toFixed(2)}%
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Grid>

    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Category Breakdown
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Validated</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="center">Compliant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validationMetrics?.breakdown?.map((item: any) => (
                <TableRow key={item.category}>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">{item.validated}</TableCell>
                  <TableCell align="right">{item.total}</TableCell>
                  <TableCell align="right">{item.rate?.toFixed(1)}%</TableCell>
                  <TableCell align="center">
                    {item.compliant ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Grid>
  </Grid>
);

const IncidentsTab: React.FC<{ incidentTrends: any }> = ({ incidentTrends }) => (
  <Grid container spacing={3}>
    <Grid xs={12} md={4}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Current Period
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Total Incidents</Typography>
            <Typography fontWeight={600}>
              {incidentTrends?.current?.totalIncidents || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Resolved</Typography>
            <Typography fontWeight={600} color="success.main">
              {incidentTrends?.current?.resolvedIncidents || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>MTTR</Typography>
            <Typography fontWeight={600}>
              {Math.round((incidentTrends?.current?.mttr || 0) / 60)} min
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Grid>

    <Grid xs={12} md={4}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          By Severity
        </Typography>
        <Stack spacing={2}>
          {incidentTrends?.bySeverity?.map((item: any) => (
            <Box
              key={item.severity}
              sx={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <SeverityChip severity={item.severity} />
              <Typography fontWeight={600}>
                {item.count} ({item.percentOfTotal?.toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Grid>

    <Grid xs={12} md={4}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          By Category
        </Typography>
        <Stack spacing={2}>
          {incidentTrends?.byCategory?.map((item: any) => (
            <Box
              key={item.name}
              sx={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <Typography>{item.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight={600}>{item.count}</Typography>
                <TrendIndicator trend={item.trend} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Grid>
  </Grid>
);

const ComplianceGapsTab: React.FC<{ gaps: any[] }> = ({ gaps }) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      Open Compliance Gaps ({gaps.length})
    </Typography>
    {gaps.length === 0 ? (
      <Alert severity="success">
        No open compliance gaps. All requirements are met.
      </Alert>
    ) : (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Framework</TableCell>
              <TableCell>Requirement</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Owner</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gaps.map((gap) => (
              <TableRow
                key={gap.id}
                sx={{
                  bgcolor:
                    gap.severity === 'CRITICAL'
                      ? 'error.light'
                      : gap.severity === 'HIGH'
                        ? 'warning.light'
                        : 'inherit',
                }}
              >
                <TableCell>{gap.framework}</TableCell>
                <TableCell>
                  <Tooltip title={gap.description}>
                    <Typography variant="body2">{gap.requirement}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{gap.category}</TableCell>
                <TableCell>
                  <SeverityChip severity={gap.severity} />
                </TableCell>
                <TableCell>
                  <StatusChip status={gap.status} />
                </TableCell>
                <TableCell>
                  {gap.daysUntilDue !== null && (
                    <Typography
                      variant="body2"
                      color={gap.daysUntilDue < 0 ? 'error.main' : 'text.secondary'}
                    >
                      {gap.daysUntilDue < 0
                        ? `${Math.abs(gap.daysUntilDue)} days overdue`
                        : `${gap.daysUntilDue} days`}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{gap.owner || 'Unassigned'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Paper>
);

const ModelGovernanceTab: React.FC<{ modelGovernance: any }> = ({
  modelGovernance,
}) => (
  <Grid container spacing={3}>
    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Model Status
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Total Models</Typography>
            <Typography fontWeight={600}>
              {modelGovernance?.totalModels || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Approved</Typography>
            <Typography fontWeight={600} color="success.main">
              {modelGovernance?.approvedModels || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Pending Review</Typography>
            <Typography fontWeight={600} color="warning.main">
              {modelGovernance?.pendingReview || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Rejected</Typography>
            <Typography fontWeight={600} color="error.main">
              {modelGovernance?.rejectedModels || 0}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Approval Rate</Typography>
            <Typography fontWeight={600}>
              {modelGovernance?.approvalRate?.toFixed(1) || 0}%
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Grid>

    <Grid xs={12} md={6}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Deployment Metrics
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Total Deployments</Typography>
            <Typography fontWeight={600}>
              {modelGovernance?.deploymentMetrics?.totalDeployments || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Successful</Typography>
            <Typography fontWeight={600} color="success.main">
              {modelGovernance?.deploymentMetrics?.successfulDeployments || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Failed</Typography>
            <Typography fontWeight={600} color="error.main">
              {modelGovernance?.deploymentMetrics?.failedDeployments || 0}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Success Rate</Typography>
            <Typography fontWeight={600}>
              {modelGovernance?.deploymentMetrics?.successRate?.toFixed(1) || 0}%
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Grid>

    <Grid xs={12}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Bias Detection & Remediation
        </Typography>
        <Grid container spacing={3}>
          <Grid xs={3}>
            <Typography variant="body2" color="text.secondary">
              Models Audited
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {modelGovernance?.biasMetrics?.modelsAudited || 0}
            </Typography>
          </Grid>
          <Grid xs={3}>
            <Typography variant="body2" color="text.secondary">
              Bias Detected
            </Typography>
            <Typography variant="h5" fontWeight={600} color="warning.main">
              {modelGovernance?.biasMetrics?.biasDetected || 0}
            </Typography>
          </Grid>
          <Grid xs={3}>
            <Typography variant="body2" color="text.secondary">
              Remediations
            </Typography>
            <Typography variant="h5" fontWeight={600} color="success.main">
              {modelGovernance?.biasMetrics?.biasRemediations || 0}
            </Typography>
          </Grid>
          <Grid xs={3}>
            <Typography variant="body2" color="text.secondary">
              Detection Rate
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {modelGovernance?.biasMetrics?.detectionRate?.toFixed(1) || 0}%
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Grid>
  </Grid>
);

export default GovernanceMetricsDashboard;
