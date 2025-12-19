import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { api } from '../api';
import { AuditEvent } from '../types';

export const GovernancePage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.audit.getLog();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Governance & Audit</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Audit Log" />
          <Tab label="Policies (OPA)" />
        </Tabs>
      </Box>

      {tab === 0 && (
          <Paper>
              <List>
                  {logs.map((log) => (
                      <ListItem key={log.id} divider>
                          <ListItemText
                              primary={
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography fontWeight="bold">{log.actor}</Typography>
                                    <Typography>performed</Typography>
                                    <Chip label={log.action} size="small" />
                                    <Typography>on</Typography>
                                    <Typography fontWeight="bold">{log.resource}</Typography>
                                </Box>
                              }
                              secondary={
                                  <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                      <Typography variant="caption">{log.details}</Typography>
                                      <Typography variant="caption">{new Date(log.timestamp).toLocaleString()}</Typography>
                                  </Box>
                              }
                          />
                      </ListItem>
                  ))}
                  {logs.length === 0 && (
                      <ListItem><ListItemText primary="No audit events found" /></ListItem>
                  )}
              </List>
          </Paper>
      )}

      {tab === 1 && (
          <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Active Policies</Typography>
              <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2 }}>
{`package maestro.authz

default allow = false

# Allow admins everything
allow {
    input.user.role == "admin"
}

# Allow operators to manage runs
allow {
    input.user.role == "operator"
    input.action == "manage_runs"
}

# Viewers can only read
allow {
    input.user.role == "viewer"
    input.action == "read"
}`}
              </Box>
          </Paper>
      )}
    </Box>
  );
};
