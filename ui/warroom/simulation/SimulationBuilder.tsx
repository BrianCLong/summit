/**
 * Summit War Room — Simulation Builder
 *
 * Create and configure geopolitical or technical simulations
 * with branching scenarios and outcome comparison.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import { useWarRoomStore } from '../store';
import { SimulationRunner } from './SimulationRunner';
import { ScenarioTree } from './ScenarioTree';
import type { Simulation, ScenarioNode } from '../types';

export const SimulationBuilder: React.FC = () => {
  const simulations = useWarRoomStore((s) => s.simulations);
  const activeSimulation = useWarRoomStore((s) => s.activeSimulation);
  const addSimulation = useWarRoomStore((s) => s.addSimulation);
  const setActiveSimulation = useWarRoomStore((s) => s.setActiveSimulation);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const createSimulation = () => {
    if (!title.trim()) return;
    const rootScenario: ScenarioNode = {
      id: `scenario-root-${Date.now()}`,
      title: 'Base Scenario',
      description: 'Initial conditions',
      probability: 1,
      impact: 0,
      children: [],
      outcomes: [],
    };
    const sim: Simulation = {
      id: `sim-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status: 'draft',
      scenarioTree: rootScenario,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSimulation(sim);
    setActiveSimulation(sim);
    setTitle('');
    setDescription('');
  };

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Simulation list */}
      <Box sx={{ width: 260, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Simulations</Typography>
        </Box>
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Simulation title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 12 } }}
          />
          <TextField
            size="small"
            fullWidth
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 12 } }}
          />
          <Button size="small" variant="contained" fullWidth startIcon={<AddIcon />} onClick={createSimulation} disabled={!title.trim()}>
            New Simulation
          </Button>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense disablePadding>
            {simulations.map((sim) => (
              <ListItemButton
                key={sim.id}
                selected={sim.id === activeSimulation?.id}
                onClick={() => setActiveSimulation(sim)}
                sx={{ py: 0.5 }}
              >
                <ListItemText
                  primary={sim.title}
                  secondary={sim.status}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Chip label={sim.status} size="small" sx={{ fontSize: 9, height: 18 }} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Active simulation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!activeSimulation && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Create or select a simulation to begin.
            </Typography>
          </Box>
        )}
        {activeSimulation && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h4" sx={{ flex: 1 }}>
                {activeSimulation.title}
              </Typography>
              <Chip label={activeSimulation.status} size="small" />
              <Button size="small" variant="contained" startIcon={<PlayArrowIcon />}>
                Run
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {activeSimulation.description}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <ScenarioTree root={activeSimulation.scenarioTree} />
          </Box>
        )}
      </Box>
    </Box>
  );
};
