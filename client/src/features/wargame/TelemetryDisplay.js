"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const client_1 = require("@apollo/client");
const x_data_grid_1 = require("@mui/x-data-grid");
const GET_CRISIS_TELEMETRY = (0, client_1.gql) `
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
const columns = [
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
const TelemetryDisplay = ({ scenarioId }) => {
    const { loading, error, data } = (0, client_1.useQuery)(GET_CRISIS_TELEMETRY, {
        variables: { scenarioId },
        pollInterval: 5000, // Poll every 5 seconds for "live" updates
    });
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">Error loading telemetry: {error.message}</material_1.Alert>);
    const telemetry = data?.getCrisisTelemetry || [];
    const totalVolume = telemetry.reduce((sum, item) => sum + Number(item.volume ?? 0), 0);
    const avgSentiment = telemetry.length > 0
        ? telemetry.reduce((sum, item) => sum + Number(item.sentiment ?? 0), 0) /
            telemetry.length
        : 0;
    const avgVirality = telemetry.length > 0
        ? telemetry.reduce((sum, item) => sum + Number(item.viralityScore ?? 0), 0) /
            telemetry.length
        : 0;
    return (<material_1.Box>
      <material_1.Typography variant="h6" gutterBottom>
        Live Social Media Telemetry
      </material_1.Typography>
      <material_1.Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Data displayed here is simulated and for decision
        support only.
      </material_1.Alert>

      <Grid_1.default container spacing={2} sx={{ mb: 3 }}>
        <Grid_1.default xs={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Total Volume</material_1.Typography>
              <material_1.Typography variant="h4">
                {totalVolume.toLocaleString()}
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default xs={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Avg. Sentiment</material_1.Typography>
              <material_1.Typography variant="h4">{avgSentiment.toFixed(2)}</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default xs={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Avg. Virality</material_1.Typography>
              <material_1.Typography variant="h4">{avgVirality.toFixed(1)}</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      <material_1.Box sx={{ height: 400, width: '100%' }}>
        <x_data_grid_1.DataGrid rows={telemetry} columns={columns} pageSizeOptions={[5, 10, 20]} initialState={{
            pagination: {
                paginationModel: { pageSize: 10 },
            },
        }} getRowId={(row) => row.id} disableRowSelectionOnClick/>
      </material_1.Box>
    </material_1.Box>);
};
exports.default = TelemetryDisplay;
