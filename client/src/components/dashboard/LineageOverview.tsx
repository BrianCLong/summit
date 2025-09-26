import React from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppSelector } from '../../store';

const DATA_LINEAGE_QUERY = gql`
  query DataLineage($dataset: String!, $tenantId: String, $direction: LineageDirection) {
    dataLineage(dataset: $dataset, tenantId: $tenantId, direction: $direction) {
      dataset
      generatedAt
      upstream {
        runId
        stepId
        eventTime
        eventType
        sourceDataset
        targetDataset
        transformation
        targetSystem
        metadata
      }
      downstream {
        runId
        stepId
        eventTime
        eventType
        sourceDataset
        targetDataset
        transformation
        targetSystem
        metadata
      }
      runs {
        runId
        jobName
        jobType
        status
        startedAt
        completedAt
      }
    }
  }
`;

type LineageEdge = {
  runId: string | null;
  stepId: string | null;
  eventTime: string;
  eventType: string;
  sourceDataset?: string | null;
  targetDataset?: string | null;
  transformation?: string | null;
  targetSystem?: string | null;
  metadata?: Record<string, any> | null;
};

type LineageRunSummary = {
  runId: string;
  jobName?: string | null;
  jobType?: string | null;
  status?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

type DataLineageResponse = {
  dataLineage: {
    dataset: string;
    generatedAt: string;
    upstream: LineageEdge[];
    downstream: LineageEdge[];
    runs: LineageRunSummary[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

type LineageOverviewProps = {
  maxEdges?: number;
};

const DEFAULT_DATASET_SUFFIX = '.ingest.signals';

export default function LineageOverview({ maxEdges = 5 }: LineageOverviewProps) {
  const tenant = useAppSelector((state) => state.ui.tenant);
  const scopedTenant = tenant && tenant !== 'all' ? tenant : 'default';
  const datasetName = `${scopedTenant}${DEFAULT_DATASET_SUFFIX}`;

  const { data, loading, error, refetch } = useQuery<DataLineageResponse>(DATA_LINEAGE_QUERY, {
    variables: {
      dataset: datasetName,
      tenantId: tenant && tenant !== 'all' ? tenant : null,
      direction: 'BOTH',
    },
    fetchPolicy: 'cache-and-network',
  });

  const upstream = data?.dataLineage?.upstream || [];
  const downstream = data?.dataLineage?.downstream || [];
  const runs = data?.dataLineage?.runs || [];
  const generatedAt = data?.dataLineage?.generatedAt;

  const totalEdges = upstream.length + downstream.length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={2}>
        <Box>
          <Typography variant="h6">Data Lineage</Typography>
          <Typography variant="body2" color="text.secondary">
            Tracking flow for <strong>{datasetName}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh lineage data">
            <IconButton size="small" aria-label="refresh lineage" onClick={() => refetch()}>
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Chip label={`${totalEdges} edges`} color="primary" size="small" />
          <Chip label={`tenant: ${scopedTenant}`} size="small" variant="outlined" />
        </Stack>
      </Stack>

      {loading && !data ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading lineage data…
          </Typography>
        </Stack>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          Unable to load lineage data: {error.message}
        </Alert>
      ) : null}

      {!error && data && (
        <Grid container spacing={2} aria-live="polite">
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Upstream Sources
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense disablePadding>
              {upstream.length === 0 && (
                <ListItem>
                  <ListItemText primary="No upstream lineage captured yet." secondary="Ingestion batches will populate once they complete." />
                </ListItem>
              )}
              {upstream.slice(0, maxEdges).map((edge) => (
                <ListItem key={`${edge.runId}-${edge.stepId}-upstream`} alignItems="flex-start">
                  <ListItemText
                    primary={`${edge.sourceDataset || 'unknown'} → ${edge.targetDataset || data.dataLineage.dataset}`}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(edge.eventTime)} • {edge.targetSystem || 'unknown system'}
                        </Typography>
                        {edge.transformation ? (
                          <Typography variant="caption" color="text.secondary">
                            Transformation: {edge.transformation}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Downstream Targets
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense disablePadding>
              {downstream.length === 0 && (
                <ListItem>
                  <ListItemText primary="No downstream lineage recorded." secondary="Once data is materialized, downstream systems will appear here." />
                </ListItem>
              )}
              {downstream.slice(0, maxEdges).map((edge) => (
                <ListItem key={`${edge.runId}-${edge.stepId}-downstream`} alignItems="flex-start">
                  <ListItemText
                    primary={`${edge.sourceDataset || data.dataLineage.dataset} → ${edge.targetDataset || 'unknown'}`}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(edge.eventTime)} • {edge.targetSystem || 'unknown system'}
                        </Typography>
                        {edge.transformation ? (
                          <Typography variant="caption" color="text.secondary">
                            Transformation: {edge.transformation}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Recent Runs
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense disablePadding>
              {runs.length === 0 && (
                <ListItem>
                  <ListItemText primary="No runs available yet." secondary="Runs will appear after the first ingestion completes." />
                </ListItem>
              )}
              {runs.slice(0, maxEdges).map((run) => (
                <ListItem key={run.runId} alignItems="flex-start">
                  <ListItemText
                    primary={run.jobName || run.runId}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Status: {run.status || 'UNKNOWN'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Started: {formatDate(run.startedAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completed: {formatDate(run.completedAt)}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {generatedAt ? (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Last updated {formatDate(generatedAt)}
              </Typography>
            ) : null}
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
