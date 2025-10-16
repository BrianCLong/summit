import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { apiFetch } from '../../services/api';

export default function SimulationPanel() {
  const [investigationId, setInvestigationId] = useState('');
  const [seeds, setSeeds] = useState('');
  const [steps, setSteps] = useState(5);
  const [probability, setProbability] = useState(0.2);
  const [busy, setBusy] = useState(false);
  const [timeline, setTimeline] = useState([]);

  const run = async () => {
    setBusy(true);
    try {
      const body = {
        investigationId,
        seeds: seeds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        steps: Number(steps),
        probability: Number(probability),
      };
      const res = await apiFetch('/api/simulate/spread', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setTimeline(res.timeline || []);
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Simulation
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Investigation ID"
                fullWidth
                value={investigationId}
                onChange={(e) => setInvestigationId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Seed Node IDs (comma-separated)"
                fullWidth
                value={seeds}
                onChange={(e) => setSeeds(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="Steps"
                type="number"
                fullWidth
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="Probability"
                type="number"
                fullWidth
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={run}
                disabled={busy || !investigationId}
              >
                {busy ? 'Running…' : 'Simulate'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {timeline.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            {timeline.map((step) => (
              <Box key={step.step} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  Step {step.step} — newly infected ({step.newlyInfected.length}
                  )
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {step.newlyInfected.map((id) => (
                    <Chip key={id} label={id} size="small" />
                  ))}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
