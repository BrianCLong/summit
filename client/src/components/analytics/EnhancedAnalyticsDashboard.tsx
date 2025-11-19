/**
 * Enhanced Analytics Dashboard
 * Simplified version for IntelGraph with core analytics features
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import {
  TrendingUp,
  TrendingDown,
  Storage as Database,
  People as Users,
  Schedule as Clock,
  Timeline as Activity,
  Warning as AlertTriangle,
  CheckCircle,
  BarChart,
  Security as Shield,
  FlashOn as Zap,
  Download,
  Refresh,
  Settings,
} from '@mui/icons-material';

// Types
interface MetricData {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  format: 'number' | 'percentage' | 'currency' | 'time';
  category: 'performance' | 'usage' | 'security' | 'quality';
  description: string;
}

interface AnalyticsConfig {
  timeRange: '1h' | '24h' | '7d' | '30d';
  refreshInterval: 30 | 60 | 300 | 'manual';
  showRealTime: boolean;
}

interface EnhancedAnalyticsDashboardProps {
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  onConfigChange?: (config: AnalyticsConfig) => void;
  realTimeEnabled?: boolean;
}

// Mock data generator
const generateMetrics = (): MetricData[] => [
  {
    id: 'total-entities',
    name: 'Total Entities',
    value: 15842,
    change: 12.5,
    trend: 'up',
    format: 'number',
    category: 'usage',
    description: 'Total number of entities in the graph database',
  },
  {
    id: 'active-users',
    name: 'Active Users',
    value: 87,
    change: -3.2,
    trend: 'down',
    format: 'number',
    category: 'usage',
    description: 'Number of users active in the last 24 hours',
  },
  {
    id: 'query-performance',
    name: 'Avg Query Time',
    value: 245,
    change: -15.8,
    trend: 'up',
    format: 'time',
    category: 'performance',
    description: 'Average query execution time in milliseconds',
  },
  {
    id: 'data-quality',
    name: 'Data Quality Score',
    value: 94.2,
    change: 2.1,
    trend: 'up',
    format: 'percentage',
    category: 'quality',
    description: 'Overall data quality and completeness score',
  },
  {
    id: 'security-alerts',
    name: 'Security Alerts',
    value: 3,
    change: -50,
    trend: 'up',
    format: 'number',
    category: 'security',
    description: 'Active security alerts requiring attention',
  },
  {
    id: 'api-calls',
    name: 'API Calls/Hour',
    value: 1247,
    change: 8.3,
    trend: 'up',
    format: 'number',
    category: 'usage',
    description: 'API calls processed in the last hour',
  },
];

export const EnhancedAnalyticsDashboard: React.FC<
  EnhancedAnalyticsDashboardProps
> = ({ onExport, onConfigChange, realTimeEnabled = true }) => {
  const [config, setConfig] = useState<AnalyticsConfig>({
    timeRange: '24h',
    refreshInterval: 60,
    showRealTime: true,
  });

  const [activeTab, setActiveTab] = useState(0);
  const [metrics, setMetrics] = useState<MetricData[]>(generateMetrics());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real-time data simulation
  useEffect(() => {
    if (!config.showRealTime || config.refreshInterval === 'manual') return;

    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * metric.value * 0.05,
          change: (Math.random() - 0.5) * 20,
        })),
      );
      setLastUpdated(new Date());
    }, config.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [config.showRealTime, config.refreshInterval]);

  const handleConfigChange = useCallback(
    (newConfig: Partial<AnalyticsConfig>) => {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      onConfigChange?.(updatedConfig);
    },
    [config, onConfigChange],
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMetrics(generateMetrics());
    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  const formatValue = (value: number, format: MetricData['format']): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'time':
        return `${Math.round(value)}ms`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: MetricData['trend'], change: number) => {
    const isPositive = change > 0;
    return isPositive ? (
      <TrendingUp fontSize="small" color="success" />
    ) : (
      <TrendingDown fontSize="small" color="error" />
    );
  };

  const getCategoryIcon = (category: MetricData['category']) => {
    switch (category) {
      case 'performance':
        return <Zap fontSize="small" />;
      case 'usage':
        return <Users fontSize="small" />;
      case 'security':
        return <Shield fontSize="small" />;
      case 'quality':
        return <CheckCircle fontSize="small" />;
      default:
        return <BarChart fontSize="small" />;
    }
  };

  const MetricCard: React.FC<{ metric: MetricData }> = ({ metric }) => {
    return (
      <Card elevation={2} sx={{ height: '120px', cursor: 'pointer' }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getCategoryIcon(metric.category)}
              <Typography variant="body2" color="text.secondary">
                {metric.name}
              </Typography>
            </Box>
            <Chip size="small" label={metric.category} variant="outlined" />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {formatValue(metric.value, metric.format)}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTrendIcon(metric.trend, metric.change)}
            <Typography
              variant="body2"
              color={metric.change > 0 ? 'success.main' : 'error.main'}
            >
              {metric.change > 0 ? '+' : ''}
              {metric.change.toFixed(1)}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

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
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleString()}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={config.timeRange}
              label="Time Range"
              onChange={(e) =>
                handleConfigChange({ timeRange: e.target.value as any })
              }
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
                checked={config.showRealTime}
                onChange={(e) =>
                  handleConfigChange({ showRealTime: e.target.checked })
                }
                size="small"
              />
            }
            label="Real-time"
          />

          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
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
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Real-time Indicator */}
      {config.showRealTime && realTimeEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Real-time monitoring active</Typography>
            <Chip
              label={`Updates every ${config.refreshInterval}s`}
              size="small"
              color="info"
            />
          </Box>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<BarChart />} label="Overview" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Performance" iconPosition="start" />
        <Tab icon={<Users />} label="Usage" iconPosition="start" />
        <Tab icon={<Shield />} label="Security" iconPosition="start" />
      </Tabs>

      {/* Content */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Key Metrics
          </Typography>
          <Grid container spacing={3}>
            {metrics.map((metric) => (
              <Grid xs={12} sm={6} md={4} key={metric.id}>
                <MetricCard metric={metric} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab !== 0 && (
        <Alert severity="info">
          {['Performance', 'Usage', 'Security'][activeTab - 1]} analytics view
          coming soon...
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedAnalyticsDashboard;
