/**
 * Summit War Room — Simulation Runner
 *
 * Executes a simulation and shows real-time progress,
 * scenario branching, and outcome generation.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import { useWarRoomStore } from '../store';

export const SimulationRunner: React.FC = () => {
  const activeSimulation = useWarRoomStore((s) => s.activeSimulation);
  const updateSimulation = useWarRoomStore((s) => s.updateSimulation);

  if (!activeSimulation) return null;

  const isRunning = activeSimulation.status === 'running';

  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Simulation Runner
        </Typography>
        <Chip label={activeSimulation.status} size="small" color={isRunning ? 'info' : 'default'} />
      </Box>

      {isRunning && <LinearProgress sx={{ mb: 1, height: 4, borderRadius: 2 }} />}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {isRunning && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PauseIcon />}
              onClick={() => updateSimulation(activeSimulation.id, { status: 'paused' })}
            >
              Pause
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={() => updateSimulation(activeSimulation.id, { status: 'completed' })}
            >
              Stop
            </Button>
          </>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {isRunning
          ? 'Simulation is running. Scenarios are being evaluated...'
          : activeSimulation.status === 'completed'
            ? 'Simulation completed. Review outcomes in the Outcome Explorer.'
            : 'Configure scenarios and click Run to start the simulation.'}
      </Typography>
    </Box>
  );
};
