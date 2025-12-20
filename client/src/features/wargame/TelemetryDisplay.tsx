// @ts-nocheck
import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { useQuery, gql } from '@apollo/client';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const GET_CRISIS_TELEMETRY = gql`
  query GetCrisisTelemetry($scenarioId: ID!) {
    getCrisisTelemetry(scenarioId: $scenarioId) {
      id
      platform
      postId
      content
      author
      timestamp
      sentiment
      viralityScore
      volume
      narrativeDetected
    }
  }
`;

interface TelemetryDisplayProps {
  scenarioId: string;
}

const columns: GridColDef[] = [
  {
    field: 'timestamp',
    headerName: 'Time',
    width: 180,
    valueFormatter: (params) => new Date(params.value).toLocaleString(),
  },
  { field: 'platform', headerName: 'Platform', width: 100 },
  { field: 'author', headerName: 'Author', width: 150 },
  { field: 'content', headerName: 'Content', flex: 1 },
  {
    field: 'sentiment',
    headerName: 'Sentiment',
    width: 100,
    type: 'number',
    renderCell: (params) => Number(params.value ?? 0).toFixed(2),
  },
  {
    field: 'viralityScore',
    headerName: 'Virality',
    width: 100,
    type: 'number',
    renderCell: (params) => Number(params.value ?? 0).toFixed(1),
  },
  { field: 'volume', headerName: 'Volume', width: 80, type: 'number' },
  { field: 'narrativeDetected', headerName: 'Narrative', width: 150 },
];

const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({ scenarioId }) => {
  const { loading, error, data } = useQuery(GET_CRISIS_TELEMETRY, {
    variables: { scenarioId },
    pollInterval: 5000, // Poll every 5 seconds for "live" updates
  });

  if (loading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">Error loading telemetry: {error.message}</Alert>
    );

  const telemetry = data?.getCrisisTelemetry || [];

  const totalVolume = telemetry.reduce(
    (sum: number, item: { volume?: number }) => sum + Number(item.volume ?? 0),
    0,
  );
  const avgSentiment =
    telemetry.length > 0
      ? telemetry.reduce(
          (sum: number, item: { sentiment?: number }) =>
            sum + Number(item.sentiment ?? 0),
          0,
        ) /
        telemetry.length
      : 0;
  const avgVirality =
    telemetry.length > 0
      ? telemetry.reduce((sum: any, item: any) => sum + item.viralityScore, 0) /
        telemetry.length
      : 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Live Social Media Telemetry
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Data displayed here is simulated and for decision
        support only.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Volume</Typography>
              <Typography variant="h4">
                {totalVolume.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Avg. Sentiment</Typography>
              <Typography variant="h4">{avgSentiment.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Avg. Virality</Typography>
              <Typography variant="h4">{avgVirality.toFixed(1)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={telemetry}
          columns={columns}
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
};

export default TelemetryDisplay;
