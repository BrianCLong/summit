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
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const graphql_tag_1 = require("graphql-tag");
// Import sub-components (will be created next)
const ScenarioInput_1 = __importDefault(require("./ScenarioInput"));
const TelemetryDisplay_1 = __importDefault(require("./TelemetryDisplay"));
const AdversaryIntentDisplay_1 = __importDefault(require("./AdversaryIntentDisplay"));
const NarrativeHeatmap_1 = __importDefault(require("./NarrativeHeatmap"));
const StrategicPlaybookDisplay_1 = __importDefault(require("./StrategicPlaybookDisplay"));
// GraphQL Queries and Mutations
const GET_ALL_CRISIS_SCENARIOS = (0, graphql_tag_1.gql) `
  query GetAllCrisisScenarios {
    getAllCrisisScenarios {
      id
      crisisType
      targetAudiences
      keyNarratives
      adversaryProfiles
      createdAt
    }
  }
`;
const RUN_WARGAME_SIMULATION = (0, graphql_tag_1.gql) `
  mutation RunWarGameSimulation($input: CrisisScenarioInput!) {
    runWarGameSimulation(input: $input) {
      id
      crisisType
      targetAudiences
      keyNarratives
      adversaryProfiles
      createdAt
    }
  }
`;
function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <material_1.Box sx={{ p: 3 }}>{children}</material_1.Box>}
    </div>);
}
function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}
const ExecutiveDashboard = () => {
    const [selectedScenarioId, setSelectedScenarioId] = (0, react_1.useState)(null);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const { loading, error, data, refetch } = (0, client_1.useQuery)(GET_ALL_CRISIS_SCENARIOS);
    const [runSimulation, { loading: simulationLoading, error: simulationError },] = (0, client_1.useMutation)(RUN_WARGAME_SIMULATION, {
        onCompleted: (data) => {
            setSelectedScenarioId(data.runWarGameSimulation.id);
            refetch(); // Refresh the list of scenarios
            setTabValue(1); // Switch to Telemetry tab after simulation
        },
    });
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const handleRunSimulation = async (input) => {
        try {
            await runSimulation({ variables: { input } });
        }
        catch (e) {
            console.error('Error running simulation:', e);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">Error loading scenarios: {error.message}</material_1.Alert>);
    const scenarios = data?.getAllCrisisScenarios || [];
    return (<material_1.Container maxWidth="xl" sx={{ py: 2 }}>
      <material_1.Alert severity="warning" sx={{ mb: 3 }}>
        WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY. This dashboard is for
        hypothetical scenario simulation and training purposes.
      </material_1.Alert>

      <material_1.Typography variant="h4" gutterBottom>
        WarGamed Decision Support Dashboard
      </material_1.Typography>
      <material_1.Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Simulate crisis scenarios, analyze information environment dynamics, and
        evaluate strategic responses based on military IO doctrine.
      </material_1.Typography>

      <material_1.Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <ScenarioInput_1.default onRunSimulation={handleRunSimulation} existingScenarios={scenarios} onSelectScenario={setSelectedScenarioId} selectedScenarioId={selectedScenarioId}/>
        {simulationLoading && <material_1.CircularProgress sx={{ mt: 2 }}/>}
        {simulationError && (<material_1.Alert severity="error" sx={{ mt: 2 }}>
            Simulation Error: {simulationError.message}
          </material_1.Alert>)}
      </material_1.Paper>

      {selectedScenarioId && (<material_1.Box sx={{ width: '100%', mt: 4 }}>
          <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <material_1.Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <material_1.Tab label="Telemetry" {...a11yProps(0)}/>
              <material_1.Tab label="Adversary Intent" {...a11yProps(1)}/>
              <material_1.Tab label="Narrative Heatmap" {...a11yProps(2)}/>
              <material_1.Tab label="Strategic Playbooks" {...a11yProps(3)}/>
            </material_1.Tabs>
          </material_1.Box>
          <CustomTabPanel value={tabValue} index={0}>
            <TelemetryDisplay_1.default scenarioId={selectedScenarioId}/>
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={1}>
            <AdversaryIntentDisplay_1.default scenarioId={selectedScenarioId}/>
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={2}>
            <NarrativeHeatmap_1.default scenarioId={selectedScenarioId}/>
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={3}>
            <StrategicPlaybookDisplay_1.default scenarioId={selectedScenarioId}/>
          </CustomTabPanel>
        </material_1.Box>)}
    </material_1.Container>);
};
exports.default = ExecutiveDashboard;
