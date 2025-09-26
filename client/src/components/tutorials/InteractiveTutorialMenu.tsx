import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

export interface TutorialMenuItem {
  id: string;
  title: string;
  description: string;
  featureArea: string;
  estimatedTime: string;
  completed: boolean;
  completedAt?: string | null;
}

interface InteractiveTutorialMenuProps {
  tutorials: TutorialMenuItem[];
  onStart: (tutorialId: string) => void;
  onRestart: (tutorialId: string) => void;
  isLoading?: boolean;
}

const InteractiveTutorialMenu: React.FC<InteractiveTutorialMenuProps> = ({
  tutorials,
  onStart,
  onRestart,
  isLoading = false,
}) => {
  return (
    <Stack spacing={2} data-testid="interactive-tutorial-menu">
      {tutorials.map((tutorial) => (
        <Card key={tutorial.id} variant="outlined">
          <CardHeader
            title={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{tutorial.title}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={tutorial.featureArea}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip label={tutorial.estimatedTime} size="small" variant="outlined" />
                </Stack>
              </Box>
            }
            subheader={tutorial.completed ? 'Completed' : 'Recommended for you'}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              {tutorial.description}
            </Typography>
            {tutorial.completed && tutorial.completedAt && (
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Completed {new Date(tutorial.completedAt).toLocaleString()}
              </Typography>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={() => onStart(tutorial.id)}
                disabled={isLoading}
                data-testid={`tutorial-start-${tutorial.id}`}
              >
                {tutorial.completed ? 'Replay tutorial' : 'Start guided tour'}
              </Button>
              {tutorial.completed && (
                <Button
                  variant="text"
                  onClick={() => onRestart(tutorial.id)}
                  disabled={isLoading}
                  data-testid={`tutorial-restart-${tutorial.id}`}
                >
                  Reset progress
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default InteractiveTutorialMenu;
