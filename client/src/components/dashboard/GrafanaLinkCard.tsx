import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function GrafanaLinkCard() {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;
  const grafana = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';
  const jaeger = import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686';
  return (
    <Card
      component="section"
      elevation={1}
      sx={{ p: 1, borderRadius: 3 }}
      aria-labelledby="observability-card-heading"
    >
      <CardContent>
        <Typography id="observability-card-heading" variant="h6" component="h2">
          Observability
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Quick links to Grafana and Jaeger for live metrics and traces. Each link opens in a new tab.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            href={grafana}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            endIcon={<OpenInNewIcon fontSize="small" />}
            aria-label="Open Grafana dashboard in a new browser tab"
          >
            Open Grafana
          </Button>
          <Button
            href={jaeger}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
            endIcon={<OpenInNewIcon fontSize="small" />}
            aria-label="Open Jaeger tracing interface in a new browser tab"
            sx={{
              color: '#0f172a',
              borderColor: 'rgba(15, 23, 42, 0.32)',
              '&:hover': { borderColor: '#0f172a', backgroundColor: 'rgba(15, 23, 42, 0.04)' },
            }}
          >
            Open Jaeger
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
