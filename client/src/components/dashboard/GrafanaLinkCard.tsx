import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';

interface GrafanaLinkCardProps {
  headingId?: string;
}

export default function GrafanaLinkCard({ headingId = 'observability-links-heading' }: GrafanaLinkCardProps) {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;
  const grafana = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';
  const jaeger = import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686';
  return (
    <Card elevation={1} sx={{ p: 1, borderRadius: 3 }} component="section" aria-labelledby={headingId}>
      <CardContent>
        <Typography id={headingId} variant="h6" component="h2">
          Observability
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph id={`${headingId}-description`}>
          Quick links to Grafana and Jaeger for live metrics and traces.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            href={grafana}
            target="_blank"
            rel="noreferrer noopener"
            variant="contained"
            color="primary"
            aria-describedby={`${headingId}-description`}
            aria-label="Open Grafana dashboard in a new tab"
            sx={{ minWidth: 160 }}
          >
            Open Grafana
          </Button>
          <Button
            href={jaeger}
            target="_blank"
            rel="noreferrer noopener"
            variant="contained"
            color="secondary"
            aria-describedby={`${headingId}-description`}
            aria-label="Open Jaeger tracing console in a new tab"
            sx={{ minWidth: 160 }}
          >
            Open Jaeger
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
