import React from 'react';
import { Skeleton, Stack, Typography } from '@mui/material';

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
    queries: { total: 0, avgLatency: 0 }
  };

  return (
    <Stack direction="row" spacing={6} role="group" aria-label="Overview stats">
      <div>
        <Typography variant="subtitle2" color="text.secondary">Total Entities</Typography>
        <Typography variant="h5">{mockStats.entities.total.toLocaleString()}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Total Relationships</Typography>
        <Typography variant="h5">{mockStats.relationships.total.toLocaleString()}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Investigations</Typography>
        <Typography variant="h5">{mockStats.investigations.active}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Query Latency</Typography>
        <Typography variant="h5">{mockStats.queries.avgLatency}ms</Typography>
      </div>
    </Stack>
  );
}
