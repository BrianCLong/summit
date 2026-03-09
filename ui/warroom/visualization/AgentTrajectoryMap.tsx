/**
 * Summit War Room — Agent Trajectory Map
 *
 * Visualization of agent decision paths showing the
 * branching reasoning trajectories across tasks.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useWarRoomStore } from '../store';

export const AgentTrajectoryMap: React.FC = () => {
  const agentTasks = useWarRoomStore((s) => s.agentTasks);

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Agent Trajectory Map
      </Typography>

      {agentTasks.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No agent tasks to visualize. Launch agents from the Agent Console.
        </Typography>
      )}

      {agentTasks.map((task) => (
        <Box key={task.id} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {task.agentName}
            </Typography>
            <Chip label={task.status} size="small" sx={{ fontSize: 9, height: 18 }} />
          </Box>

          {/* Trajectory visualization as horizontal step chain */}
          <Box sx={{ display: 'flex', gap: 0.25, overflow: 'auto', pb: 0.5 }}>
            {task.reasoning.map((step, idx) => (
              <Box key={step.id} sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'primary.contrastText',
                    flexShrink: 0,
                  }}
                >
                  {step.step}
                </Box>
                {idx < task.reasoning.length - 1 && (
                  <Box sx={{ width: 16, height: 2, bgcolor: 'divider', flexShrink: 0 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
