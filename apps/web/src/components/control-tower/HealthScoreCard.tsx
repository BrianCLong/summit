/**
 * Health Score Card - Displays operational health score with components
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

export interface HealthScoreComponent {
  name: string;
  score: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
}

export interface HealthScoreCardProps {
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number;
  components: HealthScoreComponent[];
  isLoading?: boolean;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  score,
  trend,
  change,
  components,
  isLoading = false,
}) => {
  const theme = useTheme();

  const getScoreColor = (value: number): string => {
    if (value >= 80) return theme.palette.success.main;
    if (value >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

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

  const getTrendIcon = () => {
    switch (trend) {
      case 'UP':
        return <TrendingUpIcon sx={{ color: theme.palette.success.main }} />;
      case 'DOWN':
        return <TrendingDownIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <TrendingFlatIcon sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="rectangular" height={24} sx={{ mt: 2, borderRadius: 1 }} />
        <Box display="flex" gap={2} mt={2}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" width={80} />
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="subtitle2"
        color="textSecondary"
        textTransform="uppercase"
        letterSpacing={1}
        mb={1}
      >
        Operational Health Score
      </Typography>

      {/* Main Score Bar */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Box flex={1}>
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                bgcolor: getScoreColor(score),
                borderRadius: 6,
              },
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h4" fontWeight={700} color={getScoreColor(score)}>
            {score}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            /100
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={0.5}>
          {getTrendIcon()}
          <Typography
            variant="body2"
            color={change >= 0 ? 'success.main' : 'error.main'}
          >
            {change >= 0 ? '+' : ''}
            {change} from yesterday
          </Typography>
        </Box>
      </Box>

      {/* Component Scores */}
      <Box display="flex" gap={2} flexWrap="wrap">
        {components.map((component) => (
          <Box
            key={component.name}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Typography variant="body2" color="textSecondary">
              {component.name}:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={getStatusColor(component.status)}
            >
              {component.score}
            </Typography>
            <Chip
              size="small"
              label={component.status === 'HEALTHY' ? '✓' : '●'}
              sx={{
                height: 20,
                minWidth: 20,
                bgcolor: getStatusColor(component.status),
                color: 'white',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default HealthScoreCard;
