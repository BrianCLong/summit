import React from 'react';
import { Skeleton, Stack, Typography } from '@mui/material';
import { useDB_ServerStatsQuery } from '../../generated/graphql.js';

export default function StatsOverview() {
  const { data, loading, error } = useDB_ServerStatsQuery();

  if (loading || !data) {
    return (
      <Stack direction="row" spacing={3}>
        <Skeleton variant="rounded" width={160} height={64} />
        <Skeleton variant="rounded" width={160} height={64} />
        <Skeleton variant="rounded" width={160} height={64} />
        <Skeleton variant="rounded" width={160} height={64} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">
        Error loading stats: {error.message}
      </Typography>
    );
  }

  const serverStats = data.serverStats;

  return (
    <Stack direction="row" spacing={6} role="group" aria-label="Overview stats">
      <div>
        <Typography variant="subtitle2" color="text.secondary">Total Entities</Typography>
        <Typography variant="h5">{serverStats.totalEntities.toLocaleString()}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Total Relationships</Typography>
        <Typography variant="h5">{serverStats.totalRelationships.toLocaleString()}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Investigations</Typography>
        <Typography variant="h5">{serverStats.totalInvestigations}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">Uptime</Typography>
        <Typography variant="h5">{serverStats.uptime}</Typography>
      </div>
    </Stack>
  );
}
