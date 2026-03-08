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
const PlayArrow_1 = __importDefault(require("@mui/icons-material/PlayArrow"));
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
const ScenarioInput = ({ onRunSimulation, existingScenarios, onSelectScenario, selectedScenarioId, }) => {
    const [crisisType, setCrisisType] = (0, react_1.useState)('');
    const [targetAudiences, setTargetAudiences] = (0, react_1.useState)([]);
    const [keyNarratives, setKeyNarratives] = (0, react_1.useState)([]);
    const [adversaryProfiles, setAdversaryProfiles] = (0, react_1.useState)([]);
    const [customSimulationParameters, setCustomSimulationParameters] = (0, react_1.useState)('{}');
    const [inputError, setInputError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (selectedScenarioId) {
            const scenario = existingScenarios.find((s) => s.id === selectedScenarioId);
            if (scenario) {
                setCrisisType(scenario.crisisType);
                setTargetAudiences(scenario.targetAudiences);
                setKeyNarratives(scenario.keyNarratives);
                setAdversaryProfiles(scenario.adversaryProfiles);
                // Assuming simulationParameters are stored as JSON string in the backend
                setCustomSimulationParameters(JSON.stringify(scenario.simulationParameters || {}, null, 2));
            }
        }
        else {
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
        }
        catch (e) {
            setInputError('Invalid JSON for Simulation Parameters.');
            console.error('JSON parsing error:', e);
        }
    };
    const handleSelectExistingScenario = (event) => {
        const scenarioId = event.target.value;
        onSelectScenario(scenarioId === '' ? null : scenarioId);
    };
    return (<material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <material_1.Typography variant="h6" gutterBottom>
        Define or Select Crisis Scenario
      </material_1.Typography>

      <material_1.FormControl fullWidth>
        <material_1.InputLabel id="select-scenario-label">
          Select Existing Scenario
        </material_1.InputLabel>
        <material_1.Select labelId="select-scenario-label" value={selectedScenarioId || ''} label="Select Existing Scenario" onChange={handleSelectExistingScenario}>
          <material_1.MenuItem value="">
            <em>Create New Scenario</em>
          </material_1.MenuItem>
          {existingScenarios.map((scenario) => (<material_1.MenuItem key={scenario.id} value={scenario.id}>
              {scenario.crisisType} -{' '}
              {new Date(scenario.createdAt).toLocaleDateString()}
            </material_1.MenuItem>))}
        </material_1.Select>
      </material_1.FormControl>

      <material_1.TextField label="Crisis Type" value={crisisType} onChange={(e) => setCrisisType(e.target.value)} fullWidth select helperText="Select a predefined crisis type">
        {predefinedCrisisTypes.map((option) => (<material_1.MenuItem key={option} value={option}>
            {option}
          </material_1.MenuItem>))}
      </material_1.TextField>

      <material_1.Autocomplete multiple id="target-audiences-chip" options={predefinedTargetAudiences} value={targetAudiences} onChange={(_event, newValue) => setTargetAudiences(newValue)} freeSolo renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip variant="outlined" label={option} {...getTagProps({ index })}/>))} renderInput={(params) => (<material_1.TextField {...params} label="Target Audiences" placeholder="Add audiences"/>)}/>

      <material_1.Autocomplete multiple id="key-narratives-chip" options={predefinedKeyNarratives} value={keyNarratives} onChange={(_event, newValue) => setKeyNarratives(newValue)} freeSolo renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip variant="outlined" label={option} {...getTagProps({ index })}/>))} renderInput={(params) => (<material_1.TextField {...params} label="Key Narratives" placeholder="Add narratives"/>)}/>

      <material_1.Autocomplete multiple id="adversary-profiles-chip" options={predefinedAdversaryProfiles} value={adversaryProfiles} onChange={(_event, newValue) => setAdversaryProfiles(newValue)} freeSolo renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip variant="outlined" label={option} {...getTagProps({ index })}/>))} renderInput={(params) => (<material_1.TextField {...params} label="Adversary Profiles" placeholder="Add profiles"/>)}/>

      <material_1.TextField label="Custom Simulation Parameters (JSON)" value={customSimulationParameters} onChange={(e) => setCustomSimulationParameters(e.target.value)} fullWidth multiline rows={4} helperText="Enter additional simulation parameters in JSON format" error={!!inputError} FormHelperTextProps={{ error: !!inputError }}/>
      {inputError && <material_1.Alert severity="error">{inputError}</material_1.Alert>}

      <material_1.Button variant="contained" startIcon={<PlayArrow_1.default />} onClick={handleRunClick} disabled={!crisisType ||
            targetAudiences.length === 0 ||
            keyNarratives.length === 0 ||
            adversaryProfiles.length === 0}>
        Run War-Game Simulation
      </material_1.Button>
    </material_1.Box>);
};
exports.default = ScenarioInput;
