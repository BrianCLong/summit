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
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch';

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return (
    <Box
      component="main"
      p={2}
      aria-live="polite"
      aria-labelledby="dashboard-heading"
      role="main"
    >
      <Typography id="dashboard-heading" variant="h4" component="h1" sx={{ mb: 2 }}>
        Operational dashboard overview
      </Typography>
      <Grid container spacing={2} component="section" aria-label="Dashboard panels">
        <Grid item xs={12} md={6} component="article" aria-labelledby="stats-overview-heading">
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography id="stats-overview-heading" variant="h6" component="h2" gutterBottom>
              Stats Overview
            </Typography>
            <StatsOverview />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} component="article" aria-labelledby="live-activity-heading">
          <LiveActivityFeed headingId="live-activity-heading" />
        </Grid>
        <Grid item xs={12} md={4} component="article" aria-labelledby="observability-links-heading">
          <GrafanaLinkCard headingId="observability-links-heading" />
        </Grid>

        <Grid item xs={12} component="article" aria-labelledby="latency-panels-heading">
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <LatencyPanels headingId="latency-panels-heading" />
          </Paper>
        </Grid>

        <Grid item xs={12} component="article" aria-labelledby="error-panels-heading">
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ErrorPanels headingId="error-panels-heading" />
          </Paper>
        </Grid>

        <Grid item xs={12} component="article" aria-labelledby="resolver-top-heading">
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography id="resolver-top-heading" variant="h6" component="h2" gutterBottom>
              Top Resolvers by Latency
            </Typography>
            <ResolverTop5 ariaDescribedBy="resolver-top-heading" />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
