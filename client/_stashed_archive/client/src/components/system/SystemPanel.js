import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { SystemAPI } from '../../services/api';

const Dot = ({ ok }) => (
  <span
    style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: ok ? '#2e7d32' : '#ed6c02',
      marginRight: 6,
    }}
  />
);

export default function SystemPanel() {
  const [ready, setReady] = useState({ ready: false, services: {} });
  const [version, setVersion] = useState(null);
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      setReady(await SystemAPI.ready());
    } catch {
      setReady({ ready: false, services: {} });
    }
    try {
      setVersion(await SystemAPI.version());
    } catch {
      setVersion(null);
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${SystemAPI.base || ''}/api/system/stats`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const entries = Object.entries(ready.services || {});

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Backend Readiness"
              subheader={ready.ready ? 'All systems go' : 'Degraded'}
            />
            <CardContent>
              <List dense>
                {entries.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No data
                  </Typography>
                )}
                {entries.map(([name, status]) => (
                  <ListItem key={name} disableGutters>
                    <ListItemText
                      primary={
                        <span>
                          <Dot ok={status === 'ok'} />
                          {name}
                        </span>
                      }
                      secondary={`status: ${status}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Version & Process"
              subheader={version ? `${version.name} v${version.version}` : ''}
            />
            <CardContent>
              {stats ? (
                <Box>
                  <Typography variant="body2">
                    PID: {stats.process?.pid} • Uptime:{' '}
                    {stats.process?.uptimeSec}s
                  </Typography>
                  <Typography variant="body2">
                    Heap:{' '}
                    {Math.round((stats.process?.memory?.heapUsed || 0) / 1e6)}MB
                    /{' '}
                    {Math.round((stats.process?.memory?.heapTotal || 0) / 1e6)}
                    MB
                  </Typography>
                  <Typography variant="body2">
                    Connections: {stats.connections?.totalConnections || 0} •
                    Users: {stats.connections?.uniqueUsers || 0} • Rooms:{' '}
                    {stats.connections?.activeInvestigations || 0}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No process data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
