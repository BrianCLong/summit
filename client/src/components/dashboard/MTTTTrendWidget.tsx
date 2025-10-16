import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  FileDownload,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
} from 'recharts';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const MTTT_METRICS_QUERY = gql`
  query GetMTTTMetrics($timeRange: String!, $cohortFilter: CohortFilter) {
    mtttMetrics(timeRange: $timeRange, cohortFilter: $cohortFilter) {
      summary {
        currentMTTT {
          p50
          p90
          p95
          mean
        }
        previousMTTT {
          p50
          p90
          p95
          mean
        }
        trend
        improvement
        targetMTTT
        slaCompliance
      }
      timeSeries {
        timestamp
        p50
        p90
        p95
        mean
        alertCount
        resolvedAlerts
        escalatedAlerts
      }
      cohortBreakdown {
        cohort
        mttt
        alertCount
        improvement
        slaCompliance
      }
      topPerformers {
        analyst
        avgMTTT
        alertsTriaged
        slaCompliance
      }
    }
  }
`;

interface MTTTData {
  timestamp: string;
  p50: number;
  p90: number;
  p95: number;
  mean: number;
  alertCount: number;
  resolvedAlerts: number;
  escalatedAlerts: number;
}

interface MTTTTrendWidgetProps {
  timeRange?: string;
  height?: number;
  cohortFilter?: any;
}

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

const COHORT_OPTIONS = [
  { value: 'all', label: 'All Analysts' },
  { value: 'tier1', label: 'Tier 1' },
  { value: 'tier2', label: 'Tier 2' },
  { value: 'senior', label: 'Senior' },
  { value: 'new_hire', label: 'New Hire' },
];

export default function MTTTTrendWidget({
  timeRange = '24h',
  height = 400,
  cohortFilter,
}: MTTTTrendWidgetProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedCohort, setSelectedCohort] = useState(cohortFilter || 'all');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  const { data, loading, error, refetch } = useQuery(MTTT_METRICS_QUERY, {
    variables: {
      timeRange: selectedTimeRange,
      cohortFilter: { cohort: selectedCohort },
    },
    pollInterval: 300000, // Refresh every 5 minutes
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    if (!data?.mtttMetrics) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange: selectedTimeRange,
      cohort: selectedCohort,
      metrics: data.mtttMetrics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mttt-metrics-${selectedTimeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    handleMenuClose();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown color="success" />;
      case 'degrading':
        return <TrendingUp color="error" />;
      default:
        return <TrendingFlat color="action" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'success.main';
      case 'degrading':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const renderChart = () => {
    if (!data?.mtttMetrics?.timeSeries) return null;

    const timeSeriesData = data.mtttMetrics.timeSeries.map(
      (point: MTTTData) => ({
        ...point,
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
      }),
    );

    const targetMTTT = data.mtttMetrics.summary.targetMTTT || 15; // Default 15 minutes

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis
                fontSize={12}
                tick={{ fill: '#666' }}
                tickFormatter={(value) => formatTime(value)}
              />
              <ReferenceLine
                y={targetMTTT}
                stroke="#f44336"
                strokeDasharray="5 5"
                label="Target MTTT"
              />
              <Area
                type="monotone"
                dataKey="p50"
                stackId="1"
                stroke="#2196f3"
                fill="#2196f3"
                fillOpacity={0.6}
                name="P50"
              />
              <Area
                type="monotone"
                dataKey="p90"
                stackId="2"
                stroke="#ff9800"
                fill="#ff9800"
                fillOpacity={0.4}
                name="P90"
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis
                fontSize={12}
                tick={{ fill: '#666' }}
                tickFormatter={(value) => formatTime(value)}
              />
              <ReferenceLine
                y={targetMTTT}
                stroke="#f44336"
                strokeDasharray="5 5"
                label="Target"
              />
              <Bar dataKey="p50" fill="#2196f3" name="P50 MTTT" />
              <Bar dataKey="p90" fill="#ff9800" name="P90 MTTT" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                fontSize={12}
                tick={{ fill: '#666' }}
              />
              <YAxis
                fontSize={12}
                tick={{ fill: '#666' }}
                tickFormatter={(value) => formatTime(value)}
              />
              <ReferenceLine
                y={targetMTTT}
                stroke="#f44336"
                strokeDasharray="5 5"
                label="Target MTTT"
              />
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#2196f3"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="P50"
              />
              <Line
                type="monotone"
                dataKey="p90"
                stroke="#ff9800"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="P90"
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="#f44336"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="P95"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Mean Time to Triage (MTTT)
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '70%',
            }}
          >
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error Loading MTTT Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { summary, cohortBreakdown, topPerformers } = data?.mtttMetrics || {};

  return (
    <Card sx={{ height }}>
      <CardContent>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6">Mean Time to Triage (MTTT)</Typography>
            <Typography variant="body2" color="text.secondary">
              Current P50: {formatTime(summary?.currentMTTT?.p50 || 0)} • SLA
              Compliance: {((summary?.slaCompliance || 0) * 100).toFixed(1)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
              >
                {TIME_RANGES.map((range) => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
              >
                {COHORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={() => refetch()}>
              <Refresh />
            </IconButton>
            <IconButton onClick={handleMenuClick}>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        {/* Summary Metrics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {formatTime(summary?.currentMTTT?.p50 || 0)}
              </Typography>
              <Typography variant="caption">P50 MTTT</Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mt: 0.5,
                }}
              >
                {getTrendIcon(summary?.trend)}
                <Typography
                  variant="caption"
                  sx={{ color: getTrendColor(summary?.trend), ml: 0.5 }}
                >
                  {summary?.improvement
                    ? `${(summary.improvement * 100).toFixed(1)}%`
                    : '--'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {formatTime(summary?.currentMTTT?.p90 || 0)}
              </Typography>
              <Typography variant="caption">P90 MTTT</Typography>
            </Box>
          </Grid>
          <Grid size={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {formatTime(summary?.currentMTTT?.p95 || 0)}
              </Typography>
              <Typography variant="caption">P95 MTTT</Typography>
            </Box>
          </Grid>
          <Grid size={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                color={
                  summary?.slaCompliance >= 0.8 ? 'success.main' : 'error.main'
                }
              >
                {((summary?.slaCompliance || 0) * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption">SLA Compliance</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Chart */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">Trend Analysis</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {['line', 'area', 'bar'].map((type) => (
                <Chip
                  key={type}
                  size="small"
                  label={type}
                  variant={chartType === type ? 'filled' : 'outlined'}
                  onClick={() => setChartType(type as any)}
                />
              ))}
            </Box>
          </Box>
          {renderChart()}
        </Box>

        {/* Cohort Breakdown */}
        {cohortBreakdown && cohortBreakdown.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Cohort Performance
            </Typography>
            <Grid container spacing={1}>
              {cohortBreakdown.map((cohort: any, index: number) => (
                <Grid size={6} key={index}>
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {cohort.cohort}
                    </Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">
                        {formatTime(cohort.mttt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cohort.alertCount} alerts
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleExport}>
            <FileDownload sx={{ mr: 1 }} />
            Export Data
          </MenuItem>
          <MenuItem
            onClick={() => {
              setChartType('line');
              handleMenuClose();
            }}
          >
            Line Chart
          </MenuItem>
          <MenuItem
            onClick={() => {
              setChartType('area');
              handleMenuClose();
            }}
          >
            Area Chart
          </MenuItem>
          <MenuItem
            onClick={() => {
              setChartType('bar');
              handleMenuClose();
            }}
          >
            Bar Chart
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}
