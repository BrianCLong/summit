import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

export interface MaestroConductorDashboardViewProps {
  role: string | null;
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

const mlTasks = [
  'Model drift detection alerts',
  'Shadow deployment readiness checks',
  'Feature parity validation',
];

const deploymentPipelines = [
  { name: 'Aurora Risk Engine', status: 'Deploying', id: 'aurora-risk' },
  { name: 'Realtime Watchtower', status: 'Canary', id: 'watchtower' },
  { name: 'Narrative Synthesizer', status: 'Idle', id: 'narrative' },
];

export const MaestroConductorDashboardView: React.FC<MaestroConductorDashboardViewProps> = ({
  role,
  permissions,
  featureFlags,
}) => {
  const canAccessMlTools = featureFlags['ml-tools'] || permissions.includes('ml:manage') || role === 'admin';
  const canManageDeployments =
    featureFlags['deployment-controls'] || permissions.includes('deploy:manage') || role === 'admin';

  return (
    <Box p={2} data-testid="maestro-dashboard">
      <Typography variant="h4" component="h1" gutterBottom>
        Maestro Conductor Mission Control
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Persona-aware orchestration for Maestro operators. Features are unsealed as RBAC capabilities arrive via GraphQL.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {canAccessMlTools ? (
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }} data-testid="maestro-ml-tools">
              <Typography variant="h6" gutterBottom>
                ML Operations Toolkit
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {mlTasks.map((task) => (
                  <Typography key={task} variant="body2">
                    {task}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Alert severity="warning" data-testid="maestro-ml-locked">
              ML tooling is hidden for the <strong>{role ?? 'unknown'}</strong> role. Request the <code>ml:manage</code> permission to
              unlock experimentation features.
            </Alert>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {canManageDeployments ? (
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }} data-testid="maestro-deploy-controls">
              <Typography variant="h6" gutterBottom>
                Deployment Controls
              </Typography>
              <Stack spacing={2}>
                {deploymentPipelines.map((pipeline) => (
                  <Stack
                    key={pipeline.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
                  >
                    <div>
                      <Typography variant="subtitle1">{pipeline.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        pipeline/{pipeline.id}
                      </Typography>
                    </div>
                    <Chip label={pipeline.status} color={pipeline.status === 'Deploying' ? 'primary' : 'default'} size="small" />
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Alert severity="info" data-testid="maestro-deploy-locked">
              Deployment controls are hidden. Grant the <code>deploy:manage</code> capability to expose Maestro release tooling.
            </Alert>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MaestroConductorDashboardView;
