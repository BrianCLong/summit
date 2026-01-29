import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { getGrafanaUrl, getJaegerUrl } from '../../config/urls';

export default function GrafanaLinkCard() {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;
  const grafana = getGrafanaUrl();
  const jaeger = getJaegerUrl();
  if (!grafana && !jaeger) return null;
  return (
    <Card elevation={1} sx={{ p: 1, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6">Observability</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Quick links to Grafana and Jaeger for live metrics and traces.
        </Typography>
        <Stack direction="row" spacing={2}>
          {grafana && (
            <Button
              href={grafana}
              target="_blank"
              rel="noreferrer"
              variant="contained"
            >
              Open Grafana
            </Button>
          )}
          {jaeger && (
            <Button
              href={jaeger}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
            >
              Open Jaeger
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
