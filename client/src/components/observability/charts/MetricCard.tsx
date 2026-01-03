// client/src/components/observability/charts/MetricCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status: 'ok' | 'warning' | 'critical';
  threshold?: number;
  previousValue?: number | string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  status,
  threshold,
  previousValue
}) => {
  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return '#4caf50'; // Green
      case 'warning':
        return '#ff9800'; // Orange
      case 'critical':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  };

  // Determine trend icon
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend) {
      case 'up':
        return <TrendingUpIcon style={{ color: '#f44336', fontSize: '1rem' }} />;
      case 'down':
        return <TrendingDownIcon style={{ color: '#4caf50', fontSize: '1rem' }} />;
      case 'stable':
        return <RemoveIcon style={{ color: '#9e9e9e', fontSize: '1rem' }} />;
      default:
        return null;
    }
  };

  // Format value with unit
  const formattedValue = unit && typeof value === 'number'
    ? `${value.toLocaleString()}${unit}`
    : `${value}${unit ? unit : ''}`;

  // Calculate percentage change if previous value exists
  const percentageChange = previousValue !== undefined && typeof value === 'number' && typeof previousValue === 'number'
    ? ((value - previousValue) / previousValue) * 100
    : null;

  return (
    <Card
      style={{
        height: '100%',
        borderColor: getStatusColor(),
        borderWidth: '2px',
        borderStyle: 'solid',
        backgroundColor: status === 'critical' ? 'rgba(244, 67, 54, 0.05)' :
                         status === 'warning' ? 'rgba(255, 152, 0, 0.05)' :
                         'transparent'
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          {trend && getTrendIcon()}
        </Box>

        <Box mt={1}>
          <Typography variant="h5" component="div">
            {formattedValue}
          </Typography>
        </Box>

        {percentageChange !== null && (
          <Box mt={1}>
            <Typography
              variant="body2"
              color={percentageChange >= 0 ? 'error' : 'success'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {percentageChange >= 0 ? '+' : ''}
              {percentageChange.toFixed(2)}% from previous
              {percentageChange >= 0 ? (
                <TrendingUpIcon style={{ fontSize: '0.8rem', color: '#f44336' }} />
              ) : (
                <TrendingDownIcon style={{ fontSize: '0.8rem', color: '#4caf50' }} />
              )}
            </Typography>
          </Box>
        )}

        {threshold !== undefined && (
          <Box mt={1}>
            <Chip
              label={`Threshold: ${threshold}${unit || ''}`}
              size="small"
              color={status === 'critical' ? 'error' : status === 'warning' ? 'warning' : 'success'}
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;