import React from 'react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';

export default function StatsOverview() {
  // TODO: Re-enable GraphQL query when schema is available
  // const { data, loading, error } = useDB_ServerStatsQuery();
  const data = null;
  const loading = false;
  const error = null;

  // Show placeholder data for now
  const mockStats = {
    entities: { total: 0, new24h: 0 },
    relationships: { total: 0, new24h: 0 },
    investigations: { active: 0, completed: 0 },
    queries: { total: 0, avgLatency: 0 },
  };

  const stats = [
    {
      label: 'Total Entities',
      value: mockStats.entities.total.toLocaleString(),
      description: `${mockStats.entities.new24h} new in the last 24 hours`,
    },
    {
      label: 'Total Relationships',
      value: mockStats.relationships.total.toLocaleString(),
      description: `${mockStats.relationships.new24h} new in the last 24 hours`,
    },
    {
      label: 'Active Investigations',
      value: mockStats.investigations.active.toLocaleString(),
      description: `${mockStats.investigations.completed} completed overall`,
    },
    {
      label: 'Query Latency',
      value: `${mockStats.queries.avgLatency} ms`,
      description: `${mockStats.queries.total.toLocaleString()} queries executed`,
    },
  ];

  return (
    <Stack
      component="dl"
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: 3, md: 6 }}
      role="group"
      aria-label="Overview statistics"
    >
      {stats.map((stat) => (
        <Box
          key={stat.label}
          component="div"
          tabIndex={0}
          aria-label={`${stat.label}: ${stat.value}. ${stat.description}`}
          aria-busy={loading}
          sx={{
            minWidth: 160,
            outline: 'none',
            borderRadius: 2,
            paddingRight: 1,
            '&:focus-visible': {
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
            },
          }}
        >
          <Typography
            component="dt"
            variant="subtitle2"
            sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}
          >
            {stat.label}
          </Typography>
          <Typography
            component="dd"
            variant="h5"
            sx={{ color: 'text.primary', fontWeight: 700 }}
            aria-live="polite"
          >
            {loading ? <Skeleton variant="text" width={80} data-testid="skeleton" /> : stat.value}
          </Typography>
          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
            {stat.description}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
