import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import StatsOverview from '../../../components/dashboard/StatsOverview';
import LatencyPanels from '../../../components/dashboard/LatencyPanels';
import ErrorPanels from '../../../components/dashboard/ErrorPanels';
import LiveActivityFeed from '../../../components/dashboard/LiveActivityFeed';

const mlTools = [
  { label: 'AutoML Model Registry', status: 'Healthy' },
  { label: 'Feature Store', status: 'Syncing' },
  { label: 'Inference Pipelines', status: 'Draining' },
];

const deploymentControls = [
  'Blue/Green Deployment orchestration',
  'Instant rollback with policy guardrails',
  'Freeze windows for critical tenants',
];

export interface AdminDashboardViewProps {
  showMlTools?: boolean;
  showDeploymentControls?: boolean;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  showMlTools = true,
  showDeploymentControls = true,
}) => {
  return (
    <Box p={2} data-testid="admin-dashboard">
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Control Center
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              Platform Telemetry
            </Typography>
            <StatsOverview />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <LiveActivityFeed />
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <LatencyPanels />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ErrorPanels />
          </Paper>
        </Grid>
        {showMlTools && (
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }} data-testid="ml-tools-panel">
              <Typography variant="h6" gutterBottom>
                ML Tooling
              </Typography>
              <List>
                {mlTools.map((tool) => (
                  <ListItem key={tool.label} disableGutters>
                    <ListItemText primary={tool.label} secondary="Managed by Maestro" />
                    <Chip label={tool.status} size="small" color={tool.status === 'Healthy' ? 'success' : 'warning'} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
        {showDeploymentControls && (
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }} data-testid="deployment-controls-panel">
              <Typography variant="h6" gutterBottom>
                Deployment Controls
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {deploymentControls.map((control) => (
                  <Typography key={control} variant="body2">
                    {control}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminDashboardView;
