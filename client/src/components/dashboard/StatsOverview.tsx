import React from 'react';
import { Skeleton, Stack, Typography } from '@mui/material';
import { useDB_ServerStatsQuery } from '../../generated/graphql';

export default function StatsOverview() {
  const { data, loading, error } = useDB_ServerStatsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.serverStats;

  const renderValue = (value: number | string) =>
    loading ? (
      <Skeleton width={60} data-testid="skeleton" />
    ) : (
      <Typography variant="h5">{value}</Typography>
    );

  return (
    <Stack direction="row" spacing={6} role="group" aria-label="Overview stats">
      <div>
        <Typography variant="subtitle2" color="text.secondary">
          Total Entities
        </Typography>
        {renderValue((stats?.totalEntities ?? 0).toLocaleString())}
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">
          Total Relationships
        </Typography>
        {renderValue((stats?.totalRelationships ?? 0).toLocaleString())}
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">
          Investigations
        </Typography>
        {renderValue((stats?.totalInvestigations ?? 0).toLocaleString())}
      </div>
      <div>
        <Typography variant="subtitle2" color="text.secondary">
          Uptime
        </Typography>
        {renderValue(stats?.uptime || 'n/a')}
      </div>
      {error && (
        <Typography variant="caption" color="error">
          {error.message}
        </Typography>
      )}
    </Stack>
  );
}
