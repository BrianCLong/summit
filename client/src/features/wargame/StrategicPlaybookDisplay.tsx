import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, gql } from '@apollo/client';

const GET_STRATEGIC_PLAYBOOKS = gql`
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

interface StrategicPlaybookDisplayProps {
  scenarioId: string;
}

const StrategicPlaybookDisplay: React.FC<StrategicPlaybookDisplayProps> = ({
  scenarioId,
}) => {
  const { loading, error, data } = useQuery(GET_STRATEGIC_PLAYBOOKS, {
    variables: { scenarioId },
    pollInterval: 20000, // Poll every 20 seconds
  });

  if (loading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">Error loading playbooks: {error.message}</Alert>
    );

  const playbooks = data?.getStrategicResponsePlaybooks || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Strategic Response Playbooks
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Playbooks are theoretical and for
        training/simulation purposes only.
      </Alert>

      {playbooks.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No strategic response playbooks available for this scenario yet. Run a
          simulation to generate data.
        </Typography>
      ) : (
        <Box>
          {playbooks.map((playbook) => (
            <Accordion key={playbook.id} sx={{ mb: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-${playbook.id}-content`}
                id={`panel-${playbook.id}-header`}
              >
                <Typography variant="h6">{playbook.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  <strong>Doctrine Reference:</strong>{' '}
                  {playbook.doctrineReference}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {playbook.description}
                </Typography>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Steps:
                </Typography>
                <List dense>
                  {playbook.steps.map((step, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleOutlineIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={step} />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Metrics of Effectiveness (MOEs):
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {playbook.metricsOfEffectiveness.map((moe, index) => (
                    <Chip
                      key={index}
                      label={moe}
                      variant="outlined"
                      color="success"
                    />
                  ))}
                </Stack>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Metrics of Performance (MOPs):
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {playbook.metricsOfPerformance.map((mop, index) => (
                    <Chip
                      key={index}
                      label={mop}
                      variant="outlined"
                      color="info"
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default StrategicPlaybookDisplay;
