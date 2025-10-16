import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

export function SLODashboardEmbed({
  grafanaUrl = import.meta.env.VITE_GRAFANA_URL || '',
  dashboard = import.meta.env.VITE_GRAFANA_MAESTRO_DASH_UID || '',
  theme = 'light',
}: {
  grafanaUrl?: string;
  dashboard?: string;
  theme?: 'light' | 'dark';
}) {
  const src =
    dashboard && grafanaUrl
      ? `${grafanaUrl}/d/${dashboard}?kiosk&theme=${theme}`
      : '';
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          SLO Dashboard
        </Typography>
        {src ? (
          <Box sx={{ height: 360 }}>
            <iframe
              title="Grafana SLO"
              src={src}
              width="100%"
              height="100%"
              frameBorder={0}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Set VITE_GRAFANA_URL and VITE_GRAFANA_MAESTRO_DASH_UID to embed the
            SLO dashboard.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
