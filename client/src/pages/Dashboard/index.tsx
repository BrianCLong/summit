import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import StatsOverview from '../../components/dashboard/StatsOverview';
import LatencyPanels from '../../components/dashboard/LatencyPanels';
import ErrorPanels from '../../components/dashboard/ErrorPanels';
import ResolverTop5 from '../../components/dashboard/ResolverTop5';
import GrafanaLinkCard from '../../components/dashboard/GrafanaLinkCard';
import LiveActivityFeed from '../../components/dashboard/LiveActivityFeed';
import AIGovernanceWidget from '../../components/dashboard/AIGovernanceWidget';
import {
  useDashboardPrefetch,
  useIntelligentPrefetch,
} from '../../hooks/usePrefetch';

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return (
    <Box p={2} aria-live="polite">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stats Overview
            </Typography>
            <StatsOverview />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <LiveActivityFeed />
        </Grid>
        <Grid item xs={12} md={4}>
          <GrafanaLinkCard />
        </Grid>

        {/* AI Governance & Agent Fleet Dashboard */}
        <Grid item xs={12}>
          <AIGovernanceWidget />
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <LatencyPanels />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ErrorPanels />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ResolverTop5 />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
