/**
 * Summit War Room — Agent Trajectory Viewer
 *
 * Visualizes the reasoning trace of an agent: thought → action → observation
 * for each step, showing the agent's decision-making process.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import type { AgentTask } from '../types';

interface AgentTrajectoryViewerProps {
  task: AgentTask;
}

export const AgentTrajectoryViewer: React.FC<AgentTrajectoryViewerProps> = ({ task }) => (
  <Box sx={{ p: 1.5 }}>
    {/* Header */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Typography variant="h4" sx={{ flex: 1 }}>
        {task.agentName} — Trajectory
      </Typography>
      <Chip
        label={task.status}
        size="small"
        color={task.status === 'running' ? 'info' : task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'default'}
      />
    </Box>

    {task.status === 'running' && (
      <LinearProgress variant="determinate" value={task.progress} sx={{ mb: 1.5, height: 4, borderRadius: 2 }} />
    )}

    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
      Started: {new Date(task.startedAt).toLocaleString()} | {task.reasoning.length} steps
    </Typography>

    <Divider sx={{ mb: 1.5 }} />

    {task.reasoning.length === 0 && (
      <Typography variant="body2" color="text.secondary">
        No reasoning steps recorded yet.
      </Typography>
    )}

    {/* Reasoning trace */}
    <Stepper orientation="vertical" activeStep={task.reasoning.length - 1}>
      {task.reasoning.map((step) => (
        <Step key={step.id} completed>
          <StepLabel>
            <Typography variant="body2" fontWeight={600}>
              Step {step.step}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(step.timestamp).toLocaleTimeString()}
            </Typography>
          </StepLabel>
          <StepContent>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={600} color="primary.main">
                THOUGHT
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                {step.thought}
              </Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={600} color="warning.main">
                ACTION
              </Typography>
              <Box
                component="code"
                sx={{
                  display: 'block',
                  ml: 1,
                  p: 0.5,
                  bgcolor: 'background.default',
                  borderRadius: 0.5,
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
                {step.action}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} color="success.main">
                OBSERVATION
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                {step.observation}
              </Typography>
            </Box>
          </StepContent>
        </Step>
      ))}
    </Stepper>

    {/* Output */}
    {task.output && (
      <>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Final Output
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
