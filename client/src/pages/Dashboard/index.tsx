import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch';
import DashboardBuilder from '../../features/maestro/components/DashboardBuilder';

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return (
    <Box p={2} aria-live="polite">
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Adaptive Intelligence Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag cards from the palette to curate the view your mission needs. Changes are saved to the Maestro control plane via
          GraphQL so every analyst logs in to a workspace that matches their role.
        </Typography>
      </Box>
      <DashboardBuilder />
    </Box>
  );
}
