/**
 * Summit War Room — Agent Telemetry
 *
 * Real-time telemetry dashboard for active agent tasks:
 * token usage, latency, step counts, and error rates.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { useWarRoomStore } from '../store';

const MetricCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <Paper sx={{ p: 1, textAlign: 'center' }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ color: color ?? 'text.primary' }}>
      {value}
    </Typography>
  </Paper>
);

export const AgentTelemetry: React.FC = () => {
  const agentTasks = useWarRoomStore((s) => s.agentTasks);
  const running = agentTasks.filter((t) => t.status === 'running');
  const completed = agentTasks.filter((t) => t.status === 'completed');
  const failed = agentTasks.filter((t) => t.status === 'failed');
  const totalSteps = agentTasks.reduce((sum, t) => sum + t.reasoning.length, 0);

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Agent Telemetry
      </Typography>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={3}>
          <MetricCard label="Running" value={running.length} color="#60A5FA" />
        </Grid>
        <Grid item xs={3}>
          <MetricCard label="Completed" value={completed.length} color="#34D399" />
        </Grid>
        <Grid item xs={3}>
          <MetricCard label="Failed" value={failed.length} color="#F87171" />
        </Grid>
        <Grid item xs={3}>
          <MetricCard label="Total Steps" value={totalSteps} />
        </Grid>
      </Grid>

      {running.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Active Tasks
          </Typography>
          {running.map((task) => (
            <Box key={task.id} sx={{ mb: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {task.agentName}
                </Typography>
                <Chip label={`${task.progress}%`} size="small" color="info" sx={{ fontSize: 10 }} />
              </Box>
              <LinearProgress variant="determinate" value={task.progress} sx={{ height: 4, borderRadius: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                {task.reasoning.length} reasoning steps
              </Typography>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};
