import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import StatsOverview from '../../components/dashboard/StatsOverview.tsx';
import LatencyPanels from '../../components/dashboard/LatencyPanels.tsx';
import ErrorPanels from '../../components/dashboard/ErrorPanels.tsx';
import ResolverTop5 from '../../components/dashboard/ResolverTop5.tsx';
import GrafanaLinkCard from '../../components/dashboard/GrafanaLinkCard.tsx';
import LiveActivityFeed from '../../components/dashboard/LiveActivityFeed.tsx';
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch.ts';

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return (
    <Box p={2} aria-live="polite">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>Stats Overview</Typography>
            <StatsOverview />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <LiveActivityFeed />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <GrafanaLinkCard />
        </Grid>

        <Grid size={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <LatencyPanels />
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ErrorPanels />
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ResolverTop5 />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
