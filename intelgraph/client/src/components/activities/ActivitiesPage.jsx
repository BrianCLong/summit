import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { TrendingUp, Insights, Sync } from '@mui/icons-material';
import { useMutation } from '@apollo/client';
import { DEPLOY_COLLABORATIVE } from '../../graphql/mutations';

const DEFAULT_CONFIG = {
  collaborationIntensity: 1.0,
  engagementAmplification: 80.0,
  globalDataSync: true,
  hybridCoordination: true,
  integrityThreshold: 0.0000000001,
  complianceStandard: true,
  opportunityPrecision: 0.0000000001,
  stabilizationNexus: 1.0,
  engagementIntensity: 1.0,
  coherenceScale: 10000000000000,
};

function ActivitiesPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [idsInput, setIdsInput] = useState('ops-001, ops-014, ops-237');
  const [deployCollaborative, { data, loading, error }] =
    useMutation(DEPLOY_COLLABORATIVE);

  const handleSliderChange = (field) => (_, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
  };

  const handleSwitchChange = (field) => (_, checked) => {
    setConfig((current) => ({ ...current, [field]: checked }));
  };

  const handlePrecisionChange = (event) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setConfig((current) => ({ ...current, opportunityPrecision: value }));
    }
  };

  const handleGeneratePlan = () => {
    const ids = idsInput
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    deployCollaborative({
      variables: {
        ids,
        config: {
          ...config,
          opportunityPrecision: Number(config.opportunityPrecision),
          integrityThreshold: Number(config.integrityThreshold),
        },
      },
    });
  };

  const plan = data?.deployCollaborative;
  const metrics = useMemo(() => plan?.metrics ?? [], [plan]);
  const highlights = plan?.highlights ?? [];
  const recommendedActions = plan?.recommendedActions ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Engagement Studio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure collaborative missions and synthesize cross-domain
            engagement plans in real time.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Insights />
            )
          }
          onClick={handleGeneratePlan}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate Engagement Plan'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Mission Scope
                </Typography>
                <TextField
                  label="Mission IDs"
                  fullWidth
                  helperText="Comma separated identifiers"
                  value={idsInput}
                  onChange={(event) => setIdsInput(event.target.value)}
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Collaboration Intensity
                </Typography>
                <Slider
                  value={config.collaborationIntensity}
                  onChange={handleSliderChange('collaborationIntensity')}
                  min={0}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Engagement Amplification
                </Typography>
                <Slider
                  value={config.engagementAmplification}
                  onChange={handleSliderChange('engagementAmplification')}
                  min={10}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Engagement Intensity
                </Typography>
                <Slider
                  value={config.engagementIntensity}
                  onChange={handleSliderChange('engagementIntensity')}
                  min={0}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Stabilization Nexus
                </Typography>
                <Slider
                  value={config.stabilizationNexus}
                  onChange={handleSliderChange('stabilizationNexus')}
                  min={0}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Opportunity Precision
                </Typography>
                <TextField
                  type="number"
                  fullWidth
                  inputProps={{ step: '0.0000000001', min: 0, max: 1 }}
                  value={config.opportunityPrecision}
                  onChange={handlePrecisionChange}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={config.globalDataSync}
                    onChange={handleSwitchChange('globalDataSync')}
                  />
                }
                label="Global Data Synchronization"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.hybridCoordination}
                    onChange={handleSwitchChange('hybridCoordination')}
                  />
                }
                label="Hybrid Coordination"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.complianceStandard}
                    onChange={handleSwitchChange('complianceStandard')}
                  />
                }
                label="Compliance Guardrails"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Plan Highlights
                    </Typography>
                    {plan && (
                      <Chip
                        color="primary"
                        icon={<Sync />}
                        label={`Generated ${new Date(plan.generatedAt).toLocaleTimeString()}`}
                      />
                    )}
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error.message}
                    </Alert>
                  )}

                  {!plan && !loading && (
                    <Alert severity="info">
                      Configure parameters and run the generator to synthesize a
                      plan.
                    </Alert>
                  )}

                  {plan && (
                    <List>
                      {highlights.map((highlight) => (
                        <ListItem key={highlight} disablePadding sx={{ mb: 1 }}>
                          <ListItemText primary={highlight} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Engagement Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    {metrics.map((metric) => (
                      <Grid item xs={12} sm={6} key={metric.name}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography variant="subtitle1" fontWeight="bold">
                                {metric.label}
                              </Typography>
                              <Chip
                                icon={<TrendingUp />}
                                color={
                                  metric.trend >= 0 ? 'success' : 'warning'
                                }
                                label={`${metric.score.toFixed(2)} • ${metric.trend >= 0 ? '+' : ''}${metric.trend.toFixed(2)}%`}
                                size="small"
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              {metric.summary}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {recommendedActions.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Recommended Actions
                    </Typography>
                    <List>
                      {recommendedActions.map((action, index) => (
                        <React.Fragment key={action}>
                          <ListItem alignItems="flex-start">
                            <ListItemText
                              primary={action}
                              secondary={`Priority ${index + 1}`}
                            />
                          </ListItem>
                          {index < recommendedActions.length - 1 && (
                            <Divider component="li" />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ActivitiesPage;
