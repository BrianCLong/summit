import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Security,
  Psychology,
  Report,
  Visibility,
  Warning,
  TrendingUp,
  Shield,
  Speed,
  Analytics,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';

interface CounterPsyOpsEngineStatus {
  status: string;
  activeScenarios: number;
  detectedThreats: number;
  deployedCountermeasures: number;
  lastUpdate: string;
}

interface DisinformationDetectionStatus {
  status: string;
  processedContent: number;
  detectedCampaigns: number;
  confidenceScore: number;
  lastScan: string;
}

interface AdversarySimulationStatus {
  status: string;
  activeSimulations: number;
  generatedTTPs: number;
  lastExecution: string;
}

interface PsyOpsStatusResponse {
  counterPsyOpsEngine?: CounterPsyOpsEngineStatus | null;
  disinformationDetection?: DisinformationDetectionStatus | null;
  adversarySimulation?: AdversarySimulationStatus | null;
}

interface ToggleEngineResponse {
  toggleCounterPsyOpsEngine: {
    status: string;
    message: string;
  };
}

interface ToggleEngineVariables {
  enabled: boolean;
}

interface AdversarySimulationInput {
  adversaryType: string;
  temperature: number;
  persistence: string;
}

interface GenerateSimulationResponse {
  generateAdversarySimulation: {
    id: string;
    ttps: string[];
    intent: string;
    obfuscation: string;
    temporalModel: string;
  };
}

interface GenerateSimulationVariables {
  config: AdversarySimulationInput;
}

// GraphQL Queries and Mutations
const GET_PSYOPS_STATUS = gql`
  query GetPsyOpsStatus {
    counterPsyOpsEngine {
      status
      activeScenarios
      detectedThreats
      deployedCountermeasures
      lastUpdate
    }
    disinformationDetection {
      status
      processedContent
      detectedCampaigns
      confidenceScore
      lastScan
    }
    adversarySimulation {
      status
      activeSimulations
      generatedTTPs
      lastExecution
    }
  }
`;

const TOGGLE_PSYOPS_ENGINE = gql`
  mutation TogglePsyOpsEngine($enabled: Boolean!) {
    toggleCounterPsyOpsEngine(enabled: $enabled) {
      status
      message
    }
  }
`;

const GENERATE_ADVERSARY_SIMULATION = gql`
  mutation GenerateAdversarySimulation($config: AdversarySimulationInput!) {
    generateAdversarySimulation(config: $config) {
      id
      ttps
      intent
      obfuscation
      temporalModel
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`psyops-tabpanel-${index}`}
      aria-labelledby={`psyops-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PsyOpsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [simulationDialog, setSimulationDialog] = useState(false);
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [simulationConfig, setSimulationConfig] =
    useState<AdversarySimulationInput>({
      adversaryType: 'APT',
      temperature: 0.7,
      persistence: 'high',
    });

  const { loading, error, data, refetch } = useQuery<PsyOpsStatusResponse>(
    GET_PSYOPS_STATUS,
    {
      pollInterval: 5000,
    },
  );

  const [toggleEngine] = useMutation<
    ToggleEngineResponse,
    ToggleEngineVariables
  >(TOGGLE_PSYOPS_ENGINE);
  const [generateSimulation] = useMutation<
    GenerateSimulationResponse,
    GenerateSimulationVariables
  >(GENERATE_ADVERSARY_SIMULATION);

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: number,
  ) => {
    setTabValue(newValue);
  };

  const handleEngineToggle = async (enabled: boolean) => {
    try {
      await toggleEngine({ variables: { enabled } });
      setEngineEnabled(enabled);
      refetch();
    } catch (err) {
      console.error('Failed to toggle psyops engine:', err);
    }
  };

  const handleGenerateSimulation = async () => {
    try {
      await generateSimulation({ variables: { config: simulationConfig } });
      setSimulationDialog(false);
      refetch();
    } catch (err) {
      console.error('Failed to generate simulation:', err);
    }
  };

  if (loading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">
        Error loading PsyOps dashboard: {error.message}
      </Alert>
    );

  const { counterPsyOpsEngine, disinformationDetection, adversarySimulation } =
    data || {};

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Shield color="primary" />
        PsyOps & Counter-Intelligence Dashboard
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>DEFENSIVE SECURITY TOOL:</strong> This dashboard is designed for
        defensive security operations, threat analysis, and simulation-based
        training only. All features comply with ethical AI guidelines.
      </Alert>

      {/* Status Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <Security />
                <Typography variant="h6">Counter-PsyOps Engine</Typography>
              </Box>
              <Typography variant="h4">
                {counterPsyOpsEngine?.detectedThreats || 0}
              </Typography>
              <Typography variant="body2">Threats Detected</Typography>
              <LinearProgress
                variant="determinate"
                value={75}
                sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <Report />
                <Typography variant="h6">Disinformation Detection</Typography>
              </Box>
              <Typography variant="h4">
                {disinformationDetection?.detectedCampaigns || 0}
              </Typography>
              <Typography variant="body2">Campaigns Identified</Typography>
              <LinearProgress
                variant="determinate"
                value={85}
                sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <Psychology />
                <Typography variant="h6">Adversary Simulation</Typography>
              </Box>
              <Typography variant="h4">
                {adversarySimulation?.generatedTTPs || 0}
              </Typography>
              <Typography variant="body2">TTPs Generated</Typography>
              <LinearProgress
                variant="determinate"
                value={60}
                sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="psyops dashboard tabs"
          >
            <Tab label="Counter-PsyOps Engine" icon={<Security />} />
            <Tab label="Disinformation Detection" icon={<Report />} />
            <Tab label="Adversary Simulation" icon={<Psychology />} />
            <Tab label="Real-Time Monitoring" icon={<Visibility />} />
          </Tabs>
        </Box>

        {/* Counter-PsyOps Engine Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Engine Control
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={engineEnabled}
                        onChange={(e) => handleEngineToggle(e.target.checked)}
                      />
                    }
                    label={`Counter-PsyOps Engine ${engineEnabled ? 'Active' : 'Inactive'}`}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Status: {counterPsyOpsEngine?.status || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last Update:{' '}
                    {counterPsyOpsEngine?.lastUpdate
                      ? new Date(
                          counterPsyOpsEngine.lastUpdate,
                        ).toLocaleString()
                      : 'Never'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Countermeasures
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Narrative Detection"
                        secondary="Monitoring keyword patterns and sentiment analysis"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Credibility Injection"
                        secondary="Source verification and amplification"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Obfuscation Detection"
                        secondary="Multi-layer deception analysis"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Threat Analysis
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    All threat data shown is simulated for training purposes and
                    does not represent real threats.
                  </Alert>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Coordinated Inauthentic Behavior Detected"
                        secondary="Pattern analysis identified potential bot network activity - confidence: 85%"
                      />
                      <Chip label="High Priority" color="error" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Narrative Amplification Campaign"
                        secondary="Detected synchronized messaging across multiple platforms"
                      />
                      <Chip
                        label="Medium Priority"
                        color="warning"
                        size="small"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Sentiment Manipulation Attempt"
                        secondary="Unusual sentiment patterns detected in target demographics"
                      />
                      <Chip label="Low Priority" color="info" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Disinformation Detection Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detection Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Content Processed</Typography>
                    <Typography variant="h4" color="primary">
                      {disinformationDetection?.processedContent?.toLocaleString() ||
                        '0'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Confidence Score</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (disinformationDetection?.confidenceScore || 0) * 100
                      }
                      sx={{ height: 10, borderRadius: 5, mt: 1 }}
                    />
                    <Typography variant="caption">
                      {(
                        (disinformationDetection?.confidenceScore || 0) * 100
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detection Capabilities
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="SBERT Semantic Analysis" />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Coordinated Campaign Detection" />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Counter-Narrative Generation" />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Threat Actor Attribution" />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detected Campaigns
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Campaign data is anonymized and used for defensive analysis
                    only.
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">
                            Campaign Alpha
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cross-platform narrative coordination
                          </Typography>
                          <Chip
                            label="Ongoing"
                            color="error"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">
                            Campaign Beta
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sentiment manipulation targeting
                          </Typography>
                          <Chip
                            label="Monitored"
                            color="warning"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">
                            Campaign Gamma
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Bot network amplification
                          </Typography>
                          <Chip
                            label="Contained"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Adversary Simulation Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Simulation Control
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setSimulationDialog(true)}
                    startIcon={<Psychology />}
                    sx={{ mb: 2 }}
                  >
                    Generate New Simulation
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Status: {adversarySimulation?.status || 'Idle'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Simulations:{' '}
                    {adversarySimulation?.activeSimulations || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    MITRE ATT&CK Integration
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="TTP Chain Generation" />
                      <Chip label="Available" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Intent Obfuscation" />
                      <Chip label="Available" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Temporal Modeling" />
                      <Chip label="Available" color="success" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Simulations
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    All simulations are hypothetical and for training/research
                    purposes only.
                  </Alert>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="APT Simulation - Persistence Focus"
                        secondary="Generated 12 TTPs with high persistence configuration"
                      />
                      <Chip label="Completed" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Ransomware Group Behavior Model"
                        secondary="Modeled encryption and exfiltration patterns"
                      />
                      <Chip label="Completed" color="success" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Real-Time Monitoring Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Live Monitoring Dashboard
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Real-time monitoring provides continuous threat assessment
                    and response capabilities.
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <TrendingUp color="primary" sx={{ fontSize: 40 }} />
                        <Typography variant="h6">Signal Strength</Typography>
                        <Typography variant="h4" color="primary">
                          87%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Speed color="warning" sx={{ fontSize: 40 }} />
                        <Typography variant="h6">Processing Rate</Typography>
                        <Typography variant="h4" color="warning.main">
                          1.2k/min
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Analytics color="success" sx={{ fontSize: 40 }} />
                        <Typography variant="h6">Detection Rate</Typography>
                        <Typography variant="h4" color="success.main">
                          94%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Warning color="error" sx={{ fontSize: 40 }} />
                        <Typography variant="h6">Active Alerts</Typography>
                        <Typography variant="h4" color="error.main">
                          3
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Adversary Simulation Dialog */}
      <Dialog
        open={simulationDialog}
        onClose={() => setSimulationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Adversary Simulation</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will generate a hypothetical adversary simulation for defensive
            training purposes only.
          </Alert>
          <TextField
            select
            fullWidth
            label="Adversary Type"
            value={simulationConfig.adversaryType}
            onChange={(e) =>
              setSimulationConfig({
                ...simulationConfig,
                adversaryType: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          >
            <MenuItem value="APT">Advanced Persistent Threat</MenuItem>
            <MenuItem value="Ransomware">Ransomware Group</MenuItem>
            <MenuItem value="Nation-State">Nation-State Actor</MenuItem>
            <MenuItem value="Hacktivist">Hacktivist Group</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Temperature (Creativity)"
            type="number"
            value={simulationConfig.temperature}
            onChange={(e) =>
              setSimulationConfig({
                ...simulationConfig,
                temperature: parseFloat(e.target.value),
              })
            }
            inputProps={{ min: 0, max: 1, step: 0.1 }}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Persistence Level"
            value={simulationConfig.persistence}
            onChange={(e) =>
              setSimulationConfig({
                ...simulationConfig,
                persistence: e.target.value,
              })
            }
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationDialog(false)}>Cancel</Button>
          <Button onClick={handleGenerateSimulation} variant="contained">
            Generate Simulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PsyOpsDashboard;
