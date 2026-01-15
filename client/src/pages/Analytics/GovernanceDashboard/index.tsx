/**
 * Governance Dashboard
 *
 * Main dashboard for governance analytics and metrics visualization.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module pages/Analytics/GovernanceDashboard
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Block as BlockIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import {
  useGovernanceMetrics,
  useVerdictTrends,
  usePolicyEffectiveness,
  useAnomalies,
  TIME_RANGE_PRESETS,
} from '../../../hooks/useAnalytics';

// ============================================================================
// Helper Components
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  color = 'primary.main',
  icon,
  trend,
  trendValue,
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ color, opacity: 0.8 }}>
            {icon}
          </Box>
        )}
      </Box>
      {trend && trendValue && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          {trend === 'up' ? (
            <TrendingUpIcon fontSize="small" color="success" />
          ) : trend === 'down' ? (
            <TrendingDownIcon fontSize="small" color="error" />
          ) : null}
          <Typography
            variant="caption"
            color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
            sx={{ ml: 0.5 }}
          >
            {trendValue}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const HealthScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={120}
        thickness={8}
        sx={{ color: getColor() }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h4" component="div" fontWeight="bold">
          {score}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Health
        </Typography>
      </Box>
    </Box>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const GovernanceDashboard: React.FC = () => {
  const [timePreset, setTimePreset] = useState('7d');

  const metrics = useGovernanceMetrics(timePreset);
  const trends = useVerdictTrends(timePreset);
  const policies = usePolicyEffectiveness(timePreset, 5);
  const anomalies = useAnomalies(timePreset);

  const handleTimeRangeChange = useCallback((event: SelectChangeEvent) => {
    setTimePreset(event.target.value);
  }, []);

  const handleRefresh = useCallback(() => {
    metrics.refresh();
    trends.refresh();
    policies.refresh();
    anomalies.refresh();
  }, [metrics, trends, policies, anomalies]);

  const isLoading = metrics.loading || trends.loading || policies.loading || anomalies.loading;
  const hasError = metrics.error || trends.error || policies.error || anomalies.error;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Governance Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor policy effectiveness, verdicts, and system health
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timePreset} onChange={handleTimeRangeChange} label="Time Range">
              {TIME_RANGE_PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {metrics.error || trends.error || policies.error || anomalies.error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Health Score */}
        <Grid xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <HealthScoreGauge score={metrics.data?.healthScore || 0} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {metrics.data?.lastUpdated
                ? `Updated ${new Date(metrics.data.lastUpdated).toLocaleTimeString()}`
                : 'Loading...'}
            </Typography>
          </Paper>
        </Grid>

        {/* Verdict Distribution */}
        <Grid xs={12} md={9}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Verdict Distribution
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={6} sm={3}>
                <MetricCard
                  title="Allowed"
                  value={metrics.data?.verdictDistribution.allow || 0}
                  color="success.main"
                  icon={<CheckIcon fontSize="large" />}
                />
              </Grid>
              <Grid xs={6} sm={3}>
                <MetricCard
                  title="Denied"
                  value={metrics.data?.verdictDistribution.deny || 0}
                  color="error.main"
                  icon={<BlockIcon fontSize="large" />}
                />
              </Grid>
              <Grid xs={6} sm={3}>
                <MetricCard
                  title="Escalated"
                  value={metrics.data?.verdictDistribution.escalate || 0}
                  color="warning.main"
                  icon={<WarningIcon fontSize="large" />}
                />
              </Grid>
              <Grid xs={6} sm={3}>
                <MetricCard
                  title="Warned"
                  value={metrics.data?.verdictDistribution.warn || 0}
                  color="info.main"
                  icon={<SecurityIcon fontSize="large" />}
                />
              </Grid>
            </Grid>
            {metrics.data?.verdictDistribution && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total: {metrics.data.verdictDistribution.total.toLocaleString()} verdicts
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top Policies */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Active Policies
            </Typography>
            {policies.data && policies.data.length > 0 ? (
              <List dense>
                {policies.data.map((policy) => (
                  <ListItem key={policy.policyId}>
                    <ListItemIcon>
                      <SpeedIcon color={policy.denyRate > 50 ? 'error' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={policy.policyName}
                      secondary={`${policy.triggerCount} triggers | ${policy.denyRate}% deny rate`}
                    />
                    <Chip
                      size="small"
                      label={`${policy.averageLatencyMs}ms`}
                      color={policy.averageLatencyMs < 100 ? 'success' : 'warning'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No policy data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Anomalies */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Detected Anomalies
            </Typography>
            {anomalies.data && anomalies.data.length > 0 ? (
              <List dense>
                {anomalies.data.map((anomaly) => (
                  <ListItem key={anomaly.id}>
                    <ListItemIcon>
                      <WarningIcon
                        color={
                          anomaly.severity === 'critical' || anomaly.severity === 'high'
                            ? 'error'
                            : anomaly.severity === 'medium'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={anomaly.description}
                      secondary={new Date(anomaly.detectedAt).toLocaleString()}
                    />
                    <Chip
                      size="small"
                      label={anomaly.severity}
                      color={
                        anomaly.severity === 'critical' || anomaly.severity === 'high'
                          ? 'error'
                          : anomaly.severity === 'medium'
                            ? 'warning'
                            : 'default'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success" sx={{ mt: 1 }}>
                No anomalies detected in the selected time range.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Trends Chart Placeholder */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Verdict Trends
            </Typography>
            {trends.data && trends.data.length > 0 ? (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 1, p: 2 }}>
                {trends.data.map((trend, index) => {
                  const total = trend.allow + trend.deny + trend.escalate + trend.warn;
                  const maxTotal = Math.max(...trends.data!.map((t) => t.allow + t.deny + t.escalate + t.warn));
                  const heightPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                  return (
                    <Tooltip
                      key={index}
                      title={`${trend.date}: ${total} total (${trend.allow} allow, ${trend.deny} deny)`}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            minHeight: 4,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                          {trend.date.slice(-5)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No trend data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GovernanceDashboard;
