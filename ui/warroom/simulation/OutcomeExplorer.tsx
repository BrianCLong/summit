/**
 * Summit War Room — Outcome Explorer
 *
 * Compare simulation outcomes across scenario branches.
 * Displays metrics, narratives, and visual comparisons.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { useWarRoomStore } from '../store';
import type { ScenarioNode, SimulationOutcome } from '../types';

const flattenOutcomes = (node: ScenarioNode): { scenario: string; outcome: SimulationOutcome }[] => {
  const results: { scenario: string; outcome: SimulationOutcome }[] = [];
  node.outcomes.forEach((o) => results.push({ scenario: node.title, outcome: o }));
  node.children.forEach((child) => results.push(...flattenOutcomes(child)));
  return results;
};

export const OutcomeExplorer: React.FC = () => {
  const activeSimulation = useWarRoomStore((s) => s.activeSimulation);

  if (!activeSimulation) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No active simulation. Run a simulation to explore outcomes.
        </Typography>
      </Box>
    );
  }

  const allOutcomes = flattenOutcomes(activeSimulation.scenarioTree);

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Outcome Explorer — {activeSimulation.title}
      </Typography>

      {allOutcomes.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No outcomes generated yet. Run the simulation to produce outcomes.
        </Typography>
      )}

      <Grid container spacing={1}>
        {allOutcomes.map(({ scenario, outcome }) => (
          <Grid item xs={12} md={6} key={outcome.id}>
            <Paper sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {outcome.label}
                </Typography>
                <Chip label={scenario} size="small" sx={{ fontSize: 9, height: 18 }} />
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {outcome.narrative}
              </Typography>
              <Divider sx={{ mb: 0.5 }} />
              {Object.entries(outcome.metrics).map(([key, val]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 100 }}>
                    {key}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(val, 100)}
                    sx={{ flex: 1, height: 4, borderRadius: 2 }}
                  />
                  <Typography variant="caption">{val}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
