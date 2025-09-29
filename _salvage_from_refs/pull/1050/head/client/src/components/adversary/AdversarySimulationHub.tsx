import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Psychology,
  Security,
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore,
  Visibility,
  Download,
  Share,
  Warning,
  CheckCircle,
  Error,
  Timeline,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';

// GraphQL Operations
const GET_ADVERSARY_SIMULATIONS = gql`
  query GetAdversarySimulations {
    adversarySimulations {
      id
      name
      adversaryType
      status
      createdAt
      lastExecution
      config {
        temperature
        persistence
        obfuscation
      }
      results {
        ttps
        intent
        confidence
        mitreTactics
      }
    }
  }
`;

const CREATE_ADVERSARY_SIMULATION = gql`
  mutation CreateAdversarySimulation($input: AdversarySimulationInput!) {
    createAdversarySimulation(input: $input) {
      id
      name
      status
      message
    }
  }
`;

const EXECUTE_SIMULATION = gql`
  mutation ExecuteSimulation($id: ID!, $config: SimulationConfig) {
    executeAdversarySimulation(id: $id, config: $config) {
      id
      status
      results {
        ttps
        intent
        confidence
        mitreTactics
        temporalModel
        obfuscationTechniques
      }
    }
  }
`;

const MITRE_TACTICS = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact'
];

const ADVERSARY_TYPES = [
  { value: 'APT', label: 'Advanced Persistent Threat' },
  { value: 'Ransomware', label: 'Ransomware Group' },
  { value: 'Nation-State', label: 'Nation-State Actor' },
  { value: 'Hacktivist', label: 'Hacktivist Group' },
  { value: 'Insider', label: 'Insider Threat' },
  { value: 'Cybercriminal', label: 'Cybercriminal Organization' }
];

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
      id={`adversary-tabpanel-${index}`}
      aria-labelledby={`adversary-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdversarySimulationHub: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState<string | null>(null);
  const [simulationConfig, setSimulationConfig] = useState({
    name: '',
    adversaryType: 'APT',
    temperature: 0.7,
    persistence: 'medium',
    obfuscation: true,
    targetIndustry: 'technology',
    complexity: 'medium'
  });

  const { loading, error, data, refetch } = useQuery(GET_ADVERSARY_SIMULATIONS, {
    pollInterval: 10000 // Update every 10 seconds
  });

  const [createSimulation] = useMutation(CREATE_ADVERSARY_SIMULATION);
  const [executeSimulation] = useMutation(EXECUTE_SIMULATION);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateSimulation = async () => {
    try {
      await createSimulation({
        variables: {
          input: {
            name: simulationConfig.name,
            adversaryType: simulationConfig.adversaryType,
            config: {
              temperature: simulationConfig.temperature,
              persistence: simulationConfig.persistence,
              obfuscation: simulationConfig.obfuscation,
              targetIndustry: simulationConfig.targetIndustry,
              complexity: simulationConfig.complexity
            }
          }
        }
      });
      setCreateDialog(false);
      refetch();
      // Reset form
      setSimulationConfig({
        name: '',
        adversaryType: 'APT',
        temperature: 0.7,
        persistence: 'medium',
        obfuscation: true,
        targetIndustry: 'technology',
        complexity: 'medium'
      });
    } catch (err) {
      console.error('Failed to create simulation:', err);
    }
  };

  const handleExecuteSimulation = async (simulationId: string) => {
    try {
      await executeSimulation({
        variables: {
          id: simulationId,
          config: {
            temperature: 0.7,
            maxTTPs: 10
          }
        }
      });
      refetch();
    } catch (err) {
      console.error('Failed to execute simulation:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'running': return <PlayArrow color="warning" />;
      case 'failed': return <Error color="error" />;
      default: return <Stop />;
    }
  };

  const simulations = data?.adversarySimulations || [];

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Psychology color="primary" />
        Adversary Simulation Hub
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>DEFENSIVE TRAINING TOOL:</strong> This hub generates hypothetical adversary behavior models 
        for defensive training, red team exercises, and security research purposes only. All simulations 
        comply with ethical AI guidelines and are designed to improve defensive capabilities.
      </Alert>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {simulations.length}
              </Typography>
              <Typography variant="body2">Total Simulations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {simulations.filter(s => s.status === 'completed').length}
              </Typography>
              <Typography variant="body2">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {simulations.filter(s => s.status === 'running').length}
              </Typography>
              <Typography variant="body2">Running</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {simulations.reduce((acc, s) => acc + (s.results?.ttps?.length || 0), 0)}
              </Typography>
              <Typography variant="body2">TTPs Generated</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Active Simulations" icon={<PlayArrow />} />
            <Tab label="MITRE ATT&CK Mapping" icon={<Security />} />
            <Tab label="Threat Intelligence" icon={<Visibility />} />
            <Tab label="Analysis & Reports" icon={<Timeline />} />
          </Tabs>
        </Box>

        {/* Active Simulations Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Simulation Management</Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={() => setCreateDialog(true)}
                sx={{ mr: 1 }}
              >
                Create Simulation
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => refetch()}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {loading ? (
            <LinearProgress />
          ) : simulations.length === 0 ? (
            <Alert severity="info">
              No simulations created yet. Click "Create Simulation" to generate your first adversary model.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {simulations.map((simulation) => (
                <Grid item xs={12} md={6} key={simulation.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">{simulation.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {simulation.adversaryType}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(simulation.status)}
                          <Chip
                            label={simulation.status}
                            color={getStatusColor(simulation.status)}
                            size="small"
                          />
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Created: {new Date(simulation.createdAt).toLocaleString()}
                      </Typography>

                      {simulation.results && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Results Summary</Typography>
                          <Typography variant="body2">
                            TTPs Generated: {simulation.results.ttps?.length || 0}
                          </Typography>
                          <Typography variant="body2">
                            Confidence: {((simulation.results.confidence || 0) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayArrow />}
                          onClick={() => handleExecuteSimulation(simulation.id)}
                          disabled={simulation.status === 'running'}
                        >
                          {simulation.status === 'running' ? 'Running...' : 'Execute'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => setSelectedSimulation(simulation.id)}
                        >
                          View Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* MITRE ATT&CK Mapping Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>MITRE ATT&CK Framework Integration</Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Our adversary simulations automatically map generated TTPs to the MITRE ATT&CK framework 
            for standardized threat modeling and defensive planning.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Tactic Coverage</Typography>
                  <List dense>
                    {MITRE_TACTICS.slice(0, 6).map((tactic, index) => (
                      <ListItem key={tactic}>
                        <ListItemText primary={tactic} />
                        <LinearProgress
                          variant="determinate"
                          value={Math.random() * 100}
                          sx={{ width: 100, mr: 1 }}
                        />
                        <Typography variant="caption">
                          {(Math.random() * 15 + 5).toFixed(0)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Advanced Tactics</Typography>
                  <List dense>
                    {MITRE_TACTICS.slice(6).map((tactic, index) => (
                      <ListItem key={tactic}>
                        <ListItemText primary={tactic} />
                        <LinearProgress
                          variant="determinate"
                          value={Math.random() * 100}
                          sx={{ width: 100, mr: 1 }}
                        />
                        <Typography variant="caption">
                          {(Math.random() * 15 + 5).toFixed(0)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Threat Intelligence Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Threat Intelligence Integration</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Threat Actor Profiles</Typography>
                  <List dense>
                    {ADVERSARY_TYPES.map((type) => (
                      <ListItem key={type.value}>
                        <ListItemText
                          primary={type.label}
                          secondary={`${Math.floor(Math.random() * 20 + 5)} simulations`}
                        />
                        <Chip
                          label={Math.floor(Math.random() * 100 + 50)}
                          size="small"
                          color="primary"
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Intelligence Feeds Integration</Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Adversary simulations can be enhanced with real-world threat intelligence feeds 
                    to create more realistic and current threat models.
                  </Alert>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="MITRE CTI Repository"
                        secondary="Real-world adversary group behaviors and techniques"
                      />
                      <Chip label="Connected" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="STIX/TAXII Feeds"
                        secondary="Structured threat information exchange"
                      />
                      <Chip label="Available" color="info" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Custom IOC Feeds"
                        secondary="Organization-specific threat indicators"
                      />
                      <Chip label="Configurable" color="warning" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Analysis & Reports Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Simulation Analysis & Reporting</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Analysis Results</Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    All analysis data represents simulated scenarios for training and research purposes.
                  </Alert>
                  
                  {simulations.filter(s => s.results).map((simulation) => (
                    <Accordion key={simulation.id}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle1">
                          {simulation.name} - Analysis Report
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Generated TTPs</Typography>
                            <List dense>
                              {(simulation.results?.ttps || []).slice(0, 5).map((ttp, index) => (
                                <ListItem key={index}>
                                  <ListItemText
                                    primary={`TTP ${index + 1}`}
                                    secondary={typeof ttp === 'string' ? ttp : 'Simulated technique'}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Threat Assessment</Typography>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2">Confidence Level</Typography>
                              <LinearProgress
                                variant="determinate"
                                value={(simulation.results?.confidence || 0) * 100}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                            </Box>
                            <Typography variant="body2">
                              Intent: {simulation.results?.intent || 'Reconnaissance and data collection'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Create Simulation Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Adversary Simulation</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This will create a hypothetical adversary simulation for defensive training and research purposes only.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Simulation Name"
                value={simulationConfig.name}
                onChange={(e) => setSimulationConfig({ ...simulationConfig, name: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Adversary Type</InputLabel>
                <Select
                  value={simulationConfig.adversaryType}
                  onChange={(e) => setSimulationConfig({ ...simulationConfig, adversaryType: e.target.value })}
                >
                  {ADVERSARY_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Target Industry"
                value={simulationConfig.targetIndustry}
                onChange={(e) => setSimulationConfig({ ...simulationConfig, targetIndustry: e.target.value })}
              >
                <MenuItem value="technology">Technology</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="healthcare">Healthcare</MenuItem>
                <MenuItem value="government">Government</MenuItem>
                <MenuItem value="energy">Energy</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <Typography gutterBottom>AI Temperature (Creativity): {simulationConfig.temperature}</Typography>
              <Slider
                value={simulationConfig.temperature}
                onChange={(e, value) => setSimulationConfig({ ...simulationConfig, temperature: value as number })}
                min={0.1}
                max={1.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Persistence Level"
                value={simulationConfig.persistence}
                onChange={(e) => setSimulationConfig({ ...simulationConfig, persistence: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Complexity"
                value={simulationConfig.complexity}
                onChange={(e) => setSimulationConfig({ ...simulationConfig, complexity: e.target.value })}
              >
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={simulationConfig.obfuscation}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, obfuscation: e.target.checked })}
                  />
                }
                label="Enable Obfuscation Techniques"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSimulation}
            variant="contained"
            disabled={!simulationConfig.name.trim()}
          >
            Create Simulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdversarySimulationHub;