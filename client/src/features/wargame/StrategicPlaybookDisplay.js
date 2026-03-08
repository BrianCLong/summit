"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const ExpandMore_1 = __importDefault(require("@mui/icons-material/ExpandMore"));
const CheckCircleOutline_1 = __importDefault(require("@mui/icons-material/CheckCircleOutline"));
const client_1 = require("@apollo/client");
const GET_STRATEGIC_PLAYBOOKS = (0, client_1.gql) `
  query GetStrategicPlaybooks($scenarioId: ID!) {
    getStrategicResponsePlaybooks(scenarioId: $scenarioId) {
      id
      name
      doctrineReference
      description
      steps
      metricsOfEffectiveness
      metricsOfPerformance
    }
  }
`;
const StrategicPlaybookDisplay = ({ scenarioId, }) => {
    const { loading, error, data } = (0, client_1.useQuery)(GET_STRATEGIC_PLAYBOOKS, {
        variables: { scenarioId },
        pollInterval: 20000, // Poll every 20 seconds
    });
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">Error loading playbooks: {error.message}</material_1.Alert>);
    const playbooks = data?.getStrategicResponsePlaybooks || [];
    return (<material_1.Box>
      <material_1.Typography variant="h6" gutterBottom>
        Strategic Response Playbooks
      </material_1.Typography>
      <material_1.Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Playbooks are theoretical and for
        training/simulation purposes only.
      </material_1.Alert>

      {playbooks.length === 0 ? (<material_1.Typography variant="body1" color="text.secondary">
          No strategic response playbooks available for this scenario yet. Run a
          simulation to generate data.
        </material_1.Typography>) : (<material_1.Box>
          {playbooks.map((playbook) => (<material_1.Accordion key={playbook.id} sx={{ mb: 2 }}>
              <material_1.AccordionSummary expandIcon={<ExpandMore_1.default />} aria-controls={`panel-${playbook.id}-content`} id={`panel-${playbook.id}-header`}>
                <material_1.Typography variant="h6">{playbook.name}</material_1.Typography>
              </material_1.AccordionSummary>
              <material_1.AccordionDetails>
                <material_1.Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Doctrine Reference:</strong>{' '}
                  {playbook.doctrineReference}
                </material_1.Typography>
                <material_1.Typography variant="body1" sx={{ mb: 2 }}>
                  {playbook.description}
                </material_1.Typography>

                <material_1.Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Steps:
                </material_1.Typography>
                <material_1.List dense>
                  {playbook.steps.map((step, index) => (<material_1.ListItem key={index}>
                      <material_1.ListItemIcon>
                        <CheckCircleOutline_1.default color="primary"/>
                      </material_1.ListItemIcon>
                      <material_1.ListItemText primary={step}/>
                    </material_1.ListItem>))}
                </material_1.List>

                <material_1.Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Metrics of Effectiveness (MOEs):
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {playbook.metricsOfEffectiveness.map((moe, index) => (<material_1.Chip key={index} label={moe} variant="outlined" color="success"/>))}
                </material_1.Stack>

                <material_1.Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Metrics of Performance (MOPs):
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {playbook.metricsOfPerformance.map((mop, index) => (<material_1.Chip key={index} label={mop} variant="outlined" color="info"/>))}
                </material_1.Stack>
              </material_1.AccordionDetails>
            </material_1.Accordion>))}
        </material_1.Box>)}
    </material_1.Box>);
};
exports.default = StrategicPlaybookDisplay;
