import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Grid,
  Paper,
} from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';

// Import sub-components (will be created next)
import ScenarioInput from './ScenarioInput';
import TelemetryDisplay from './TelemetryDisplay';
import AdversaryIntentDisplay from './AdversaryIntentDisplay';
import NarrativeHeatmap from './NarrativeHeatmap';
import StrategicPlaybookDisplay from './StrategicPlaybookDisplay';

// GraphQL Queries and Mutations
const GET_ALL_CRISIS_SCENARIOS = gql`
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

const RUN_WARGAME_SIMULATION = gql`
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const ExecutiveDashboard: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const { loading, error, data, refetch } = useQuery(GET_ALL_CRISIS_SCENARIOS);
  const [runSimulation, { loading: simulationLoading, error: simulationError }] = useMutation(
    RUN_WARGAME_SIMULATION,
    {
      onCompleted: (data) => {
        setSelectedScenarioId(data.runWarGameSimulation.id);
        refetch(); // Refresh the list of scenarios
        setTabValue(1); // Switch to Telemetry tab after simulation
      },
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRunSimulation = async (input: any) => {
    try {
      await runSimulation({ variables: { input } });
    } catch (e) {
      console.error("Error running simulation:", e);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading scenarios: {error.message}</Alert>;

  const scenarios = data?.getAllCrisisScenarios || [];

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Alert severity="warning" sx={{ mb: 3 }}>
        WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY. This dashboard is for hypothetical scenario simulation and training purposes.
      </Alert>

      <Typography variant="h4" gutterBottom>
        WarGamed Decision Support Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Simulate crisis scenarios, analyze information environment dynamics, and evaluate strategic responses based on military IO doctrine.
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <ScenarioInput onRunSimulation={handleRunSimulation} existingScenarios={scenarios} onSelectScenario={setSelectedScenarioId} selectedScenarioId={selectedScenarioId} />
        {simulationLoading && <CircularProgress sx={{ mt: 2 }} />}
        {simulationError && <Alert severity="error" sx={{ mt: 2 }}>Simulation Error: {simulationError.message}</Alert>}
      </Paper>

      {selectedScenarioId && (
        <Box sx={{ width: '100%', mt: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <Tab label="Telemetry" {...a11yProps(0)} />
              <Tab label="Adversary Intent" {...a11yProps(1)} />
              <Tab label="Narrative Heatmap" {...a11yProps(2)} />
              <Tab label="Strategic Playbooks" {...a11yProps(3)} />
            </Tabs>
          </Box>
          <CustomTabPanel value={tabValue} index={0}>
            <TelemetryDisplay scenarioId={selectedScenarioId} />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={1}>
            <AdversaryIntentDisplay scenarioId={selectedScenarioId} />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={2}>
            <NarrativeHeatmap scenarioId={selectedScenarioId} />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={3}>
            <StrategicPlaybookDisplay scenarioId={selectedScenarioId} />
          </CustomTabPanel>
        </Box>
      )}
    </Container>
  );
};

export default ExecutiveDashboard;
