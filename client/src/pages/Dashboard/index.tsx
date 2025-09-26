import React from 'react';
import { useMutation } from '@apollo/client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import StatsOverview from '../../components/dashboard/StatsOverview';
import LatencyPanels from '../../components/dashboard/LatencyPanels';
import ErrorPanels from '../../components/dashboard/ErrorPanels';
import ResolverTop5 from '../../components/dashboard/ResolverTop5';
import GrafanaLinkCard from '../../components/dashboard/GrafanaLinkCard';
import LiveActivityFeed from '../../components/dashboard/LiveActivityFeed';
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch';
import { EXPORT_GRAPH_DATA } from '../../graphql/graphExport.gql.js';

const DEFAULT_GRAPH_EXPORT_QUERY =
  'MATCH (n:Entity) RETURN n.id AS id, n.label AS label, n.type AS type LIMIT 50';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null);
  const [dataSource, setDataSource] = React.useState<'NEO4J' | 'POSTGRES'>('NEO4J');
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [exportGraphData, { loading }] = useMutation(EXPORT_GRAPH_DATA);

  const handleOpenExportMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = () => setExportAnchorEl(null);

  const handleDataSourceChange = (event: SelectChangeEvent) => {
    setDataSource(event.target.value as 'NEO4J' | 'POSTGRES');
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const decodeBase64 = (value: string) => {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(value);
    }
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Buffer !== 'undefined') {
      return (globalThis as any).Buffer.from(value, 'base64').toString('utf-8');
    }
    throw new Error('Base64 decoding is not supported in this environment');
  };

  const handleExport = async (format: 'CSV' | 'JSON') => {
    handleCloseExportMenu();
    try {
      const { data } = await exportGraphData({
        variables: {
          input: {
            query: DEFAULT_GRAPH_EXPORT_QUERY,
            parameters: {},
            format,
            dataSource,
          },
        },
      });

      const result = data?.exportGraphData;
      if (!result) {
        throw new Error('No export payload returned');
      }

      const decoded = decodeBase64(result.content);
      const blob = new Blob([decoded], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        severity: 'success',
        message: `Export ready (${result.recordCount} records, ${format})`,
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: err?.message || 'Failed to export graph data',
      });
    }
  };

  return (
    <Box p={2} aria-live="polite">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{ mb: { xs: 1, sm: 0 } }}
              >
                Stats Overview
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="dashboard-export-source-label">Data Source</InputLabel>
                  <Select
                    labelId="dashboard-export-source-label"
                    id="dashboard-export-source"
                    label="Data Source"
                    value={dataSource}
                    onChange={handleDataSourceChange}
                  >
                    <MenuItem value="NEO4J">Neo4j Graph</MenuItem>
                    <MenuItem value="POSTGRES">PostgreSQL</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenExportMenu}
                  disabled={loading}
                  aria-haspopup="true"
                  aria-controls={exportAnchorEl ? 'dashboard-export-menu' : undefined}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Export Data'}
                </Button>
              </Stack>
            </Stack>
            <Menu
              id="dashboard-export-menu"
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleCloseExportMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => handleExport('CSV')} disabled={loading}>
                Download CSV
              </MenuItem>
              <MenuItem onClick={() => handleExport('JSON')} disabled={loading}>
                Download JSON
              </MenuItem>
            </Menu>
            <StatsOverview />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <LiveActivityFeed />
        </Grid>
        <Grid item xs={12} md={4}>
          <GrafanaLinkCard />
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
