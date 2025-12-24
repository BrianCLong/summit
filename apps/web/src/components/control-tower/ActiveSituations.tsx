/**
 * Active Situations - Displays grouped operational issues requiring attention
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export interface Situation {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INFO';
  eventCount: number;
  startedAt: Date;
  owner?: { id: string; name: string };
}

export interface ActiveSituationsProps {
  situations: Situation[];
  onSituationClick: (id: string) => void;
  isLoading?: boolean;
}

export const ActiveSituations: React.FC<ActiveSituationsProps> = ({
  situations,
  onSituationClick,
  isLoading = false,
}) => {
  const theme = useTheme();

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return theme.palette.error.main;
      case 'WARNING':
        return theme.palette.warning.main;
      case 'INFO':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getSeverityIcon = (severity: string) => {
    const color = getSeverityColor(severity);
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon sx={{ color }} />;
      case 'WARNING':
        return <WarningIcon sx={{ color }} />;
      default:
        return <InfoIcon sx={{ color }} />;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'P1':
        return theme.palette.error.main;
      case 'P2':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
        <Skeleton variant="text" width="50%" height={32} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 1 }} />
        ))}
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
        height: '100%',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          🔴 Active Situations ({situations.length})
        </Typography>
      </Box>

      <Box
        sx={{
          maxHeight: 400,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {situations.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No active situations - all clear! 🎉
            </Typography>
          </Box>
        ) : (
          situations.map((situation) => (
            <Card
              key={situation.id}
              variant="outlined"
              sx={{
                borderLeft: `4px solid ${getSeverityColor(situation.severity)}`,
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                  cursor: 'pointer',
                },
              }}
              onClick={() => onSituationClick(situation.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                  {getSeverityIcon(situation.severity)}
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={situation.priority}
                        sx={{
                          bgcolor: getPriorityColor(situation.priority),
                          color: 'white',
                          fontWeight: 600,
                          height: 20,
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={600}>
                        {situation.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" mt={0.5}>
                      {situation.eventCount} related events • Started{' '}
                      {formatTimeAgo(situation.startedAt)}
                    </Typography>
                    {situation.owner && (
                      <Typography variant="body2" color="textSecondary">
                        Assigned: @{situation.owner.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>

              <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                <Button size="small" onClick={(e) => { e.stopPropagation(); onSituationClick(situation.id); }}>
                  View
                </Button>
                <Button size="small" color="warning" onClick={(e) => e.stopPropagation()}>
                  Escalate
                </Button>
              </CardActions>
            </Card>
          ))
        )}
      </Box>

      <Box mt={2}>
        <Button size="small" fullWidth variant="outlined">
          + Create Situation
        </Button>
      </Box>
    </Paper>
  );
};

export default ActiveSituations;
