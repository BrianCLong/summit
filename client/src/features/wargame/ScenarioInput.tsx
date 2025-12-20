// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface ScenarioInputProps {
  onRunSimulation: (input: any) => void;
  existingScenarios: Array<{
    id: string;
    crisisType: string;
    targetAudiences: string[];
    keyNarratives: string[];
    adversaryProfiles: string[];
    createdAt: string;
  }>;
  onSelectScenario: (scenarioId: string | null) => void;
  selectedScenarioId: string | null;
}

const predefinedCrisisTypes = [
  'geopolitical_conflict',
  'cyber_attack',
  'natural_disaster',
  'public_health_crisis',
];
const predefinedTargetAudiences = [
  'allies',
  'neutrals',
  'adversaries',
  'domestic_population',
  'international_community',
];
const predefinedKeyNarratives = [
  'disinformation_campaigns',
  'unity_messaging',
  'threat_mitigation',
  'economic_stability',
];
const predefinedAdversaryProfiles = [
  'state_actor_X',
  'non_state_actor_Y',
  'insider_threat_Z',
];

const ScenarioInput: React.FC<ScenarioInputProps> = ({
  onRunSimulation,
  existingScenarios,
  onSelectScenario,
  selectedScenarioId,
}) => {
  const [crisisType, setCrisisType] = useState<string>('');
  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [keyNarratives, setKeyNarratives] = useState<string[]>([]);
  const [adversaryProfiles, setAdversaryProfiles] = useState<string[]>([]);
  const [customSimulationParameters, setCustomSimulationParameters] =
    useState<string>('{}');
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedScenarioId) {
      const scenario = existingScenarios.find(
        (s) => s.id === selectedScenarioId,
      );
      if (scenario) {
        setCrisisType(scenario.crisisType);
        setTargetAudiences(scenario.targetAudiences);
        setKeyNarratives(scenario.keyNarratives);
        setAdversaryProfiles(scenario.adversaryProfiles);
        // Assuming simulationParameters are stored as JSON string in the backend
        setCustomSimulationParameters(
          JSON.stringify(scenario.simulationParameters || {}, null, 2),
        );
      }
    } else {
      // Reset form when no scenario is selected
      setCrisisType('');
      setTargetAudiences([]);
      setKeyNarratives([]);
      setAdversaryProfiles([]);
      setCustomSimulationParameters('{}');
    }
  }, [selectedScenarioId, existingScenarios]);

  const handleRunClick = () => {
    try {
      const simulationParameters = JSON.parse(customSimulationParameters);
      const input = {
        crisisType,
        targetAudiences,
        keyNarratives,
        adversaryProfiles,
        simulationParameters,
      };
      onRunSimulation(input);
      setInputError(null);
    } catch (e) {
      setInputError('Invalid JSON for Simulation Parameters.');
      console.error('JSON parsing error:', e);
    }
  };

  const handleSelectExistingScenario = (event: any) => {
    const scenarioId = event.target.value;
    onSelectScenario(scenarioId === '' ? null : scenarioId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Define or Select Crisis Scenario
      </Typography>

      <FormControl fullWidth>
        <InputLabel id="select-scenario-label">
          Select Existing Scenario
        </InputLabel>
        <Select
          labelId="select-scenario-label"
          value={selectedScenarioId || ''}
          label="Select Existing Scenario"
          onChange={handleSelectExistingScenario}
        >
          <MenuItem value="">
            <em>Create New Scenario</em>
          </MenuItem>
          {existingScenarios.map((scenario) => (
            <MenuItem key={scenario.id} value={scenario.id}>
              {scenario.crisisType} -{' '}
              {new Date(scenario.createdAt).toLocaleDateString()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Crisis Type"
        value={crisisType}
        onChange={(e) => setCrisisType(e.target.value)}
        fullWidth
        select
        helperText="Select a predefined crisis type"
      >
        {predefinedCrisisTypes.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      <Autocomplete
        multiple
        id="target-audiences-chip"
        options={predefinedTargetAudiences}
        value={targetAudiences}
        onChange={(_event, newValue) => setTargetAudiences(newValue)}
        freeSolo
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Target Audiences"
            placeholder="Add audiences"
          />
        )}
      />

      <Autocomplete
        multiple
        id="key-narratives-chip"
        options={predefinedKeyNarratives}
        value={keyNarratives}
        onChange={(_event, newValue) => setKeyNarratives(newValue)}
        freeSolo
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Key Narratives"
            placeholder="Add narratives"
          />
        )}
      />

      <Autocomplete
        multiple
        id="adversary-profiles-chip"
        options={predefinedAdversaryProfiles}
        value={adversaryProfiles}
        onChange={(_event, newValue) => setAdversaryProfiles(newValue)}
        freeSolo
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Adversary Profiles"
            placeholder="Add profiles"
          />
        )}
      />

      <TextField
        label="Custom Simulation Parameters (JSON)"
        value={customSimulationParameters}
        onChange={(e) => setCustomSimulationParameters(e.target.value)}
        fullWidth
        multiline
        rows={4}
        helperText="Enter additional simulation parameters in JSON format"
        error={!!inputError}
        FormHelperTextProps={{ error: !!inputError }}
      />
      {inputError && <Alert severity="error">{inputError}</Alert>}

      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={handleRunClick}
        disabled={
          !crisisType ||
          targetAudiences.length === 0 ||
          keyNarratives.length === 0 ||
          adversaryProfiles.length === 0
        }
      >
        Run War-Game Simulation
      </Button>
    </Box>
  );
};

export default ScenarioInput;
