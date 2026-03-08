"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const GET_ADVERSARY_INTENT_ESTIMATES = (0, client_1.gql) `
  query GetAdversaryIntentEstimates($scenarioId: ID!) {
    getAdversaryIntentEstimates(scenarioId: $scenarioId) {
      id
      adversaryProfile
      estimatedIntent
      likelihood
      reasoning
      timestamp
    }
  }
`;
const AdversaryIntentDisplay = ({ scenarioId, }) => {
    const { loading, error, data } = (0, client_1.useQuery)(GET_ADVERSARY_INTENT_ESTIMATES, {
        variables: { scenarioId },
        pollInterval: 10000, // Poll every 10 seconds
    });
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">
        Error loading adversary intent: {error.message}
      </material_1.Alert>);
    const estimates = data?.getAdversaryIntentEstimates || [];
    return (<material_1.Box>
      <material_1.Typography variant="h6" gutterBottom>
        Adversary Intent Estimation
      </material_1.Typography>
      <material_1.Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Intent estimates are hypothetical and for
        decision support only.
      </material_1.Alert>

      {estimates.length === 0 ? (<material_1.Typography variant="body1" color="text.secondary">
          No adversary intent estimates available for this scenario yet. Run a
          simulation to generate data.
        </material_1.Typography>) : (<material_1.List>
          {estimates.map((estimate) => (<material_1.Card key={estimate.id} sx={{ mb: 2 }}>
              <material_1.CardContent>
                <material_1.Typography variant="h6" component="div">
                  {estimate.adversaryProfile} - {estimate.estimatedIntent}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Estimated: {new Date(estimate.timestamp).toLocaleString()}
                </material_1.Typography>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <material_1.Typography variant="body2" sx={{ mr: 1 }}>
                    Likelihood: {(estimate.likelihood * 100).toFixed(1)}%
                  </material_1.Typography>
                  <material_1.LinearProgress variant="determinate" value={estimate.likelihood * 100} sx={{ flexGrow: 1, height: 10, borderRadius: 5 }} color={estimate.likelihood > 0.7
                    ? 'error'
                    : estimate.likelihood > 0.4
                        ? 'warning'
                        : 'success'}/>
                </material_1.Box>
                <material_1.Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Reasoning:</strong> {estimate.reasoning}
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>))}
        </material_1.List>)}
    </material_1.Box>);
};
exports.default = AdversaryIntentDisplay;
