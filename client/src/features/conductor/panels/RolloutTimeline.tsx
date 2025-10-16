import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from '@mui/material';

export type RolloutStep = {
  weight: number;
  status: 'pending' | 'paused' | 'running' | 'completed' | 'aborted';
  analysis?: 'pass' | 'fail' | 'running';
};

export function RolloutTimeline({
  steps,
  name,
}: {
  steps: RolloutStep[];
  name?: string;
}) {
  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Rollout Timeline</Typography>
          <Typography variant="body2" color="text.secondary">
            No rollout data. Connect Argo Rollouts API or select a rollout.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {name || 'Rollout'}
        </Typography>
        {steps.map((s, i) => (
          <Box key={i} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 56 }}>
                {s.weight}%
              </Typography>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant={
                    s.status === 'completed' ? 'determinate' : 'indeterminate'
                  }
                  value={100}
                />
              </Box>
              <Chip
                size="small"
                label={s.status}
                color={
                  s.status === 'completed'
                    ? 'success'
                    : s.status === 'aborted'
                      ? 'error'
                      : 'default'
                }
              />
              {s.analysis && (
                <Chip
                  size="small"
                  label={`analysis: ${s.analysis}`}
                  color={
                    s.analysis === 'pass'
                      ? 'success'
                      : s.analysis === 'fail'
                        ? 'error'
                        : 'info'
                  }
                />
              )}
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
