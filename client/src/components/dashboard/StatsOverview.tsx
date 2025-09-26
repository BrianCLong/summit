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

  const statItems = [
    {
      id: 'entities',
      label: 'Total Entities',
      value: mockStats.entities.total.toLocaleString(),
      description: 'Count of unique graph entities available in the workspace.',
    },
    {
      id: 'relationships',
      label: 'Total Relationships',
      value: mockStats.relationships.total.toLocaleString(),
      description: 'Total relationships connecting entities in the knowledge graph.',
    },
    {
      id: 'investigations',
      label: 'Active Investigations',
      value: mockStats.investigations.active.toLocaleString(),
      description: 'Investigations currently being tracked.',
    },
    {
      id: 'query-latency',
      label: 'Average Query Latency',
      value: `${mockStats.queries.avgLatency} ms`,
      description: 'Mean response time for graph queries over the last five minutes.',
    },
  ];

  return (
    <Stack
      component="dl"
      direction={{ xs: 'column', md: 'row' }}
      spacing={6}
      aria-label="Overview stats"
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        '& > *': { minWidth: { xs: '100%', md: 160 } },
      }}
    >
      {statItems.map((stat) => (
        <Box key={stat.id} component="div">
          <Typography component="dt" variant="subtitle2" color="text.secondary" gutterBottom>
            {stat.label}
          </Typography>
          {loading ? (
            <Skeleton width={120} height={36} aria-label={`Loading ${stat.label}`} />
          ) : error ? (
            <Typography component="dd" variant="body2" color="error.main" aria-live="assertive">
              Unavailable
            </Typography>
          ) : (
            <Typography component="dd" variant="h5" aria-live="polite">
              {stat.value}
            </Typography>
          )}
          <Typography component="p" variant="caption" color="text.secondary">
            {stat.description}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
