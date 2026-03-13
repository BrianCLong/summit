/**
 * Summit War Room — Agent Task Panel
 *
 * Summary view of an individual agent task with I/O and status.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import type { AgentTask } from '../types';

interface AgentTaskPanelProps {
  task: AgentTask;
}

export const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({ task }) => (
  <Box sx={{ p: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Typography variant="h4" sx={{ flex: 1 }}>
        {task.agentName}
      </Typography>
      <Chip label={task.status} size="small" color={task.status === 'running' ? 'info' : task.status === 'completed' ? 'success' : 'default'} />
    </Box>

    {task.status === 'running' && (
      <LinearProgress variant="determinate" value={task.progress} sx={{ mb: 1, height: 4, borderRadius: 2 }} />
    )}

    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
      Started: {new Date(task.startedAt).toLocaleString()}
      {task.completedAt && ` | Completed: ${new Date(task.completedAt).toLocaleString()}`}
    </Typography>

    <Divider sx={{ mb: 1 }} />

    <Typography variant="h6" sx={{ mb: 0.5 }}>
      Input
    </Typography>
    <Box
      component="pre"
      sx={{
        p: 1,
        bgcolor: 'background.default',
        borderRadius: 1,
        fontSize: 11,
        fontFamily: 'monospace',
        overflow: 'auto',
        maxHeight: 120,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {JSON.stringify(task.input, null, 2)}
    </Box>

    {task.output && (
      <>
        <Typography variant="h6" sx={{ mt: 1, mb: 0.5 }}>
          Output
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 1,
            bgcolor: 'background.default',
            borderRadius: 1,
            fontSize: 11,
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: 200,
            border: 1,
            borderColor: 'divider',
          }}
        >
          {JSON.stringify(task.output, null, 2)}
        </Box>
      </>
    )}
  </Box>
);
