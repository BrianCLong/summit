import React from 'react';
import { Card, CardContent, Grid, Typography, Chip } from '@mui/material';

export function CanaryHealthPanel({
  availability = 0.0,
  p95TtfbMs = 0,
  errorRate = 0.0,
  target = 'https://maestro.example/health',
}: {
  availability?: number;
  p95TtfbMs?: number;
  errorRate?: number;
  target?: string;
}) {
  const availColor =
    availability >= 0.99
      ? 'success'
      : availability >= 0.95
        ? 'warning'
        : 'error';
  const p95Color =
    p95TtfbMs < 1500 ? 'success' : p95TtfbMs < 2500 ? 'warning' : 'error';
  const errColor =
    errorRate < 0.01 ? 'success' : errorRate < 0.05 ? 'warning' : 'error';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Canary Health (Blackbox): {target}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Availability (avg 5m)
            </Typography>
            <Chip
              label={`${(availability * 100).toFixed(2)}%`}
              color={availColor}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              p95 TTFB
            </Typography>
            <Chip label={`${Math.round(p95TtfbMs)} ms`} color={p95Color} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              5xx Error Rate
            </Typography>
            <Chip label={`${(errorRate * 100).toFixed(2)}%`} color={errColor} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
