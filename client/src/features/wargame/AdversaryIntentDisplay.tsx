import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import { useQuery, gql } from '@apollo/client';

const GET_ADVERSARY_INTENT_ESTIMATES = gql`
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

interface AdversaryIntentDisplayProps {
  scenarioId: string;
}

const AdversaryIntentDisplay: React.FC<AdversaryIntentDisplayProps> = ({
  scenarioId,
}) => {
  const { loading, error, data } = useQuery(GET_ADVERSARY_INTENT_ESTIMATES, {
    variables: { scenarioId },
    pollInterval: 10000, // Poll every 10 seconds
  });

  if (loading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">
        Error loading adversary intent: {error.message}
      </Alert>
    );

  const estimates = data?.getAdversaryIntentEstimates || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Adversary Intent Estimation
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Intent estimates are hypothetical and for
        decision support only.
      </Alert>

      {estimates.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No adversary intent estimates available for this scenario yet. Run a
          simulation to generate data.
        </Typography>
      ) : (
        <List>
          {estimates.map((estimate) => (
            <Card key={estimate.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div">
                  {estimate.adversaryProfile} - {estimate.estimatedIntent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estimated: {new Date(estimate.timestamp).toLocaleString()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Likelihood: {(estimate.likelihood * 100).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={estimate.likelihood * 100}
                    sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                    color={
                      estimate.likelihood > 0.7
                        ? 'error'
                        : estimate.likelihood > 0.4
                          ? 'warning'
                          : 'success'
                    }
                  />
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Reasoning:</strong> {estimate.reasoning}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </List>
      )}
    </Box>
  );
};

export default AdversaryIntentDisplay;
