/**
 * Key Metrics Grid - Displays configurable KPI widgets
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

export interface KeyMetric {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number;
  changePercent?: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  sparkline?: number[];
}

export interface KeyMetricsGridProps {
  metrics: KeyMetric[];
  isLoading?: boolean;
}

export const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = ({
  metrics,
  isLoading = false,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'HEALTHY':
        return theme.palette.success.main;
      case 'WARNING':
        return theme.palette.warning.main;
      case 'CRITICAL':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    const color = change >= 0 ? theme.palette.success.main : theme.palette.error.main;
    switch (trend) {
      case 'UP':
        return <TrendingUpIcon sx={{ color, fontSize: 16 }} />;
      case 'DOWN':
        return <TrendingDownIcon sx={{ color, fontSize: 16 }} />;
      default:
        return <TrendingFlatIcon sx={{ color: theme.palette.grey[500], fontSize: 16 }} />;
    }
  };

  const renderSparkline = (data: number[] = []) => {
    if (data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const height = 24;
    const width = 60;
    const step = width / (data.length - 1);

    const points = data
      .map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} style={{ marginLeft: 'auto' }}>
        <polyline
          points={points}
          fill="none"
          stroke={theme.palette.primary.main}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Skeleton variant="text" width="30%" height={24} />
        <Grid container spacing={2} mt={1}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          📊 Key Metrics
        </Typography>
        <Typography
          variant="body2"
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          Edit
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid item xs={6} md={4} key={metric.id}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: theme.palette.grey[50],
                borderLeft: `3px solid ${getStatusColor(metric.status)}`,
              }}
            >
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                noWrap
              >
                {metric.name}
              </Typography>

              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700}>
                  {metric.formattedValue}
                </Typography>
                {renderSparkline(metric.sparkline)}
              </Box>

              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                {getTrendIcon(metric.trend, metric.change)}
                <Typography
                  variant="caption"
                  color={metric.change >= 0 ? 'success.main' : 'error.main'}
                >
                  {metric.change >= 0 ? '+' : ''}
                  {metric.changePercent !== undefined
                    ? `${metric.changePercent}%`
                    : metric.change}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default KeyMetricsGrid;
