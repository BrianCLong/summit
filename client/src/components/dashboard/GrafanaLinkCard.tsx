import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';

export default function GrafanaLinkCard() {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;
  const grafana = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';
  const jaeger = import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686';
  return (
    <Card elevation={1} sx={{ p: 1, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6">Observability</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Quick links to Grafana and Jaeger for live metrics and traces.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            href={grafana}
            target="_blank"
            rel="noreferrer"
            variant="contained"
          >
            Open Grafana
          </Button>
          <Button
            href={jaeger}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
          >
            Open Jaeger
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
