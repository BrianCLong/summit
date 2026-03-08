"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
// GraphQL Queries and Mutations
const GET_PSYOPS_STATUS = (0, client_1.gql) `
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
const TOGGLE_PSYOPS_ENGINE = (0, client_1.gql) `
  mutation TogglePsyOpsEngine($enabled: Boolean!) {
    toggleCounterPsyOpsEngine(enabled: $enabled) {
      status
      message
    }
  }
`;
const GENERATE_ADVERSARY_SIMULATION = (0, client_1.gql) `
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
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`psyops-tabpanel-${index}`} aria-labelledby={`psyops-tab-${index}`} {...other}>
      {value === index && <material_1.Box sx={{ p: 3 }}>{children}</material_1.Box>}
    </div>);
}
const PsyOpsDashboard = () => {
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [simulationDialog, setSimulationDialog] = (0, react_1.useState)(false);
    const [engineEnabled, setEngineEnabled] = (0, react_1.useState)(true);
    const [simulationConfig, setSimulationConfig] = (0, react_1.useState)({
        adversaryType: 'APT',
        temperature: 0.7,
        persistence: 'high',
    });
    const { loading, error, data, refetch } = (0, client_1.useQuery)(GET_PSYOPS_STATUS, {
        pollInterval: 5000,
    });
    const [toggleEngine] = (0, client_1.useMutation)(TOGGLE_PSYOPS_ENGINE);
    const [generateSimulation] = (0, client_1.useMutation)(GENERATE_ADVERSARY_SIMULATION);
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
    };
    const handleEngineToggle = async (enabled) => {
        try {
            await toggleEngine({ variables: { enabled } });
            setEngineEnabled(enabled);
            refetch();
        }
        catch (err) {
            console.error('Failed to toggle psyops engine:', err);
        }
    };
    const handleGenerateSimulation = async () => {
        try {
            await generateSimulation({ variables: { config: simulationConfig } });
            setSimulationDialog(false);
            refetch();
        }
        catch (err) {
            console.error('Failed to generate simulation:', err);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">
        Error loading PsyOps dashboard: {error.message}
      </material_1.Alert>);
    const { counterPsyOpsEngine, disinformationDetection, adversarySimulation } = data || {};
    return (<material_1.Box sx={{ width: '100%' }}>
      <material_1.Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <icons_material_1.Shield color="primary"/>
        PsyOps & Counter-Intelligence Dashboard
      </material_1.Typography>

      <material_1.Alert severity="warning" sx={{ mb: 3 }}>
        <strong>DEFENSIVE SECURITY TOOL:</strong> This dashboard is designed for
        defensive security operations, threat analysis, and simulation-based
        training only. All features comply with ethical AI guidelines.
      </material_1.Alert>

      {/* Status Overview Cards */}
      <Grid_1.default container spacing={3} sx={{ mb: 3 }}>
        <Grid_1.default item xs={12} md={4}>
          <material_1.Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
            color: 'white',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <icons_material_1.Security />
                <material_1.Typography variant="h6">Counter-PsyOps Engine</material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h4">
                {counterPsyOpsEngine?.detectedThreats || 0}
              </material_1.Typography>
              <material_1.Typography variant="body2">Threats Detected</material_1.Typography>
              <material_1.LinearProgress variant="determinate" value={75} sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}/>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        <Grid_1.default item xs={12} md={4}>
          <material_1.Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
            color: 'white',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <icons_material_1.Report />
                <material_1.Typography variant="h6">Disinformation Detection</material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h4">
                {disinformationDetection?.detectedCampaigns || 0}
              </material_1.Typography>
              <material_1.Typography variant="body2">Campaigns Identified</material_1.Typography>
              <material_1.LinearProgress variant="determinate" value={85} sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}/>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        <Grid_1.default item xs={12} md={4}>
          <material_1.Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
            color: 'white',
        }}>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <icons_material_1.Psychology />
                <material_1.Typography variant="h6">Adversary Simulation</material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h4">
                {adversarySimulation?.generatedTTPs || 0}
              </material_1.Typography>
              <material_1.Typography variant="body2">TTPs Generated</material_1.Typography>
              <material_1.LinearProgress variant="determinate" value={60} sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}/>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      {/* Main Dashboard Tabs */}
      <material_1.Card>
        <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <material_1.Tabs value={tabValue} onChange={handleTabChange} aria-label="psyops dashboard tabs">
            <material_1.Tab label="Counter-PsyOps Engine" icon={<icons_material_1.Security />}/>
            <material_1.Tab label="Disinformation Detection" icon={<icons_material_1.Report />}/>
            <material_1.Tab label="Adversary Simulation" icon={<icons_material_1.Psychology />}/>
            <material_1.Tab label="Real-Time Monitoring" icon={<icons_material_1.Visibility />}/>
          </material_1.Tabs>
        </material_1.Box>

        {/* Counter-PsyOps Engine Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Engine Control
                  </material_1.Typography>
                  <material_1.FormControlLabel control={<material_1.Switch checked={engineEnabled} onChange={(e) => handleEngineToggle(e.target.checked)}/>} label={`Counter-PsyOps Engine ${engineEnabled ? 'Active' : 'Inactive'}`}/>
                  <material_1.Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Status: {counterPsyOpsEngine?.status || 'Unknown'}
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Last Update:{' '}
                    {counterPsyOpsEngine?.lastUpdate
            ? new Date(counterPsyOpsEngine.lastUpdate).toLocaleString()
            : 'Never'}
                  </material_1.Typography>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Active Countermeasures
                  </material_1.Typography>
                  <material_1.List dense>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Narrative Detection" secondary="Monitoring keyword patterns and sentiment analysis"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Credibility Injection" secondary="Source verification and amplification"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Obfuscation Detection" secondary="Multi-layer deception analysis"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Recent Threat Analysis
                  </material_1.Typography>
                  <material_1.Alert severity="info" sx={{ mb: 2 }}>
                    All threat data shown is simulated for training purposes and
                    does not represent real threats.
                  </material_1.Alert>
                  <material_1.List>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Coordinated Inauthentic Behavior Detected" secondary="Pattern analysis identified potential bot network activity - confidence: 85%"/>
                      <material_1.Chip label="High Priority" color="error" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Narrative Amplification Campaign" secondary="Detected synchronized messaging across multiple platforms"/>
                      <material_1.Chip label="Medium Priority" color="warning" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Sentiment Manipulation Attempt" secondary="Unusual sentiment patterns detected in target demographics"/>
                      <material_1.Chip label="Low Priority" color="info" size="small"/>
                    </material_1.ListItem>
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>

        {/* Disinformation Detection Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Detection Metrics
                  </material_1.Typography>
                  <material_1.Box sx={{ mb: 2 }}>
                    <material_1.Typography variant="body2">Content Processed</material_1.Typography>
                    <material_1.Typography variant="h4" color="primary">
                      {disinformationDetection?.processedContent?.toLocaleString() ||
            '0'}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box sx={{ mb: 2 }}>
                    <material_1.Typography variant="body2">Confidence Score</material_1.Typography>
                    <material_1.LinearProgress variant="determinate" value={(disinformationDetection?.confidenceScore || 0) * 100} sx={{ height: 10, borderRadius: 5, mt: 1 }}/>
                    <material_1.Typography variant="caption">
                      {((disinformationDetection?.confidenceScore || 0) * 100).toFixed(1)}
                      %
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Detection Capabilities
                  </material_1.Typography>
                  <material_1.List dense>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="SBERT Semantic Analysis"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Coordinated Campaign Detection"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Counter-Narrative Generation"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Threat Actor Attribution"/>
                      <material_1.Chip label="Active" color="success" size="small"/>
                    </material_1.ListItem>
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Detected Campaigns
                  </material_1.Typography>
                  <material_1.Alert severity="warning" sx={{ mb: 2 }}>
                    Campaign data is anonymized and used for defensive analysis
                    only.
                  </material_1.Alert>
                  <Grid_1.default container spacing={2}>
                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Card variant="outlined">
                        <material_1.CardContent>
                          <material_1.Typography variant="subtitle1">
                            Campaign Alpha
                          </material_1.Typography>
                          <material_1.Typography variant="body2" color="text.secondary">
                            Cross-platform narrative coordination
                          </material_1.Typography>
                          <material_1.Chip label="Ongoing" color="error" size="small" sx={{ mt: 1 }}/>
                        </material_1.CardContent>
                      </material_1.Card>
                    </Grid_1.default>
                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Card variant="outlined">
                        <material_1.CardContent>
                          <material_1.Typography variant="subtitle1">
                            Campaign Beta
                          </material_1.Typography>
                          <material_1.Typography variant="body2" color="text.secondary">
                            Sentiment manipulation targeting
                          </material_1.Typography>
                          <material_1.Chip label="Monitored" color="warning" size="small" sx={{ mt: 1 }}/>
                        </material_1.CardContent>
                      </material_1.Card>
                    </Grid_1.default>
                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Card variant="outlined">
                        <material_1.CardContent>
                          <material_1.Typography variant="subtitle1">
                            Campaign Gamma
                          </material_1.Typography>
                          <material_1.Typography variant="body2" color="text.secondary">
                            Bot network amplification
                          </material_1.Typography>
                          <material_1.Chip label="Contained" color="success" size="small" sx={{ mt: 1 }}/>
                        </material_1.CardContent>
                      </material_1.Card>
                    </Grid_1.default>
                  </Grid_1.default>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>

        {/* Adversary Simulation Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Simulation Control
                  </material_1.Typography>
                  <material_1.Button variant="contained" onClick={() => setSimulationDialog(true)} startIcon={<icons_material_1.Psychology />} sx={{ mb: 2 }}>
                    Generate New Simulation
                  </material_1.Button>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Status: {adversarySimulation?.status || 'Idle'}
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Active Simulations:{' '}
                    {adversarySimulation?.activeSimulations || 0}
                  </material_1.Typography>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12} md={6}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    MITRE ATT&CK Integration
                  </material_1.Typography>
                  <material_1.List dense>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="TTP Chain Generation"/>
                      <material_1.Chip label="Available" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Intent Obfuscation"/>
                      <material_1.Chip label="Available" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Temporal Modeling"/>
                      <material_1.Chip label="Available" color="success" size="small"/>
                    </material_1.ListItem>
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default item xs={12}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Recent Simulations
                  </material_1.Typography>
                  <material_1.Alert severity="info" sx={{ mb: 2 }}>
                    All simulations are hypothetical and for training/research
                    purposes only.
                  </material_1.Alert>
                  <material_1.List>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="APT Simulation - Persistence Focus" secondary="Generated 12 TTPs with high persistence configuration"/>
                      <material_1.Chip label="Completed" color="success" size="small"/>
                    </material_1.ListItem>
                    <material_1.ListItem>
                      <material_1.ListItemText primary="Ransomware Group Behavior Model" secondary="Modeled encryption and exfiltration patterns"/>
                      <material_1.Chip label="Completed" color="success" size="small"/>
                    </material_1.ListItem>
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>

        {/* Real-Time Monitoring Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default item xs={12}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Live Monitoring Dashboard
                  </material_1.Typography>
                  <material_1.Alert severity="info" sx={{ mb: 2 }}>
                    Real-time monitoring provides continuous threat assessment
                    and response capabilities.
                  </material_1.Alert>

                  <Grid_1.default container spacing={2}>
                    <Grid_1.default item xs={12} md={3}>
                      <material_1.Box sx={{
            textAlign: 'center',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
        }}>
                        <icons_material_1.TrendingUp color="primary" sx={{ fontSize: 40 }}/>
                        <material_1.Typography variant="h6">Signal Strength</material_1.Typography>
                        <material_1.Typography variant="h4" color="primary">
                          87%
                        </material_1.Typography>
                      </material_1.Box>
                    </Grid_1.default>
                    <Grid_1.default item xs={12} md={3}>
                      <material_1.Box sx={{
            textAlign: 'center',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
        }}>
                        <icons_material_1.Speed color="warning" sx={{ fontSize: 40 }}/>
                        <material_1.Typography variant="h6">Processing Rate</material_1.Typography>
                        <material_1.Typography variant="h4" color="warning.main">
                          1.2k/min
                        </material_1.Typography>
                      </material_1.Box>
                    </Grid_1.default>
                    <Grid_1.default item xs={12} md={3}>
                      <material_1.Box sx={{
            textAlign: 'center',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
        }}>
                        <icons_material_1.Analytics color="success" sx={{ fontSize: 40 }}/>
                        <material_1.Typography variant="h6">Detection Rate</material_1.Typography>
                        <material_1.Typography variant="h4" color="success.main">
                          94%
                        </material_1.Typography>
                      </material_1.Box>
                    </Grid_1.default>
                    <Grid_1.default item xs={12} md={3}>
                      <material_1.Box sx={{
            textAlign: 'center',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
        }}>
                        <icons_material_1.Warning color="error" sx={{ fontSize: 40 }}/>
                        <material_1.Typography variant="h6">Active Alerts</material_1.Typography>
                        <material_1.Typography variant="h4" color="error.main">
                          3
                        </material_1.Typography>
                      </material_1.Box>
                    </Grid_1.default>
                  </Grid_1.default>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>
      </material_1.Card>

      {/* Adversary Simulation Dialog */}
      <material_1.Dialog open={simulationDialog} onClose={() => setSimulationDialog(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Generate Adversary Simulation</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Alert severity="warning" sx={{ mb: 2 }}>
            This will generate a hypothetical adversary simulation for defensive
            training purposes only.
          </material_1.Alert>
          <material_1.TextField select fullWidth label="Adversary Type" value={simulationConfig.adversaryType} onChange={(e) => setSimulationConfig({
            ...simulationConfig,
            adversaryType: e.target.value,
        })} sx={{ mb: 2 }}>
            <material_1.MenuItem value="APT">Advanced Persistent Threat</material_1.MenuItem>
            <material_1.MenuItem value="Ransomware">Ransomware Group</material_1.MenuItem>
            <material_1.MenuItem value="Nation-State">Nation-State Actor</material_1.MenuItem>
            <material_1.MenuItem value="Hacktivist">Hacktivist Group</material_1.MenuItem>
          </material_1.TextField>
          <material_1.TextField fullWidth label="Temperature (Creativity)" type="number" value={simulationConfig.temperature} onChange={(e) => setSimulationConfig({
            ...simulationConfig,
            temperature: parseFloat(e.target.value),
        })} inputProps={{ min: 0, max: 1, step: 0.1 }} sx={{ mb: 2 }}/>
          <material_1.TextField select fullWidth label="Persistence Level" value={simulationConfig.persistence} onChange={(e) => setSimulationConfig({
            ...simulationConfig,
            persistence: e.target.value,
        })}>
            <material_1.MenuItem value="low">Low</material_1.MenuItem>
            <material_1.MenuItem value="medium">Medium</material_1.MenuItem>
            <material_1.MenuItem value="high">High</material_1.MenuItem>
          </material_1.TextField>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setSimulationDialog(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleGenerateSimulation} variant="contained">
            Generate Simulation
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
};
exports.default = PsyOpsDashboard;
