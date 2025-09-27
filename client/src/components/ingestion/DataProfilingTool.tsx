import React, { useMemo, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { DATA_PROFILING_QUERY, INGESTION_TABLES_QUERY } from '../../graphql/queries/dataProfiling';

type IngestionTable = {
  schema: string;
  name: string;
  rowCount: number;
};

type ColumnProfile = {
  name: string;
  dataType: string;
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  sampleTopValues: { value: string | null; count: number }[];
  numericSummary?: { min?: number | null; max?: number | null; mean?: number | null } | null;
};

type DataProfile = {
  table: string;
  schema: string;
  rowCount: number;
  generatedAt: string;
  columns: ColumnProfile[];
};

const numberFormatter = new Intl.NumberFormat('en-US');

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return numberFormatter.format(value);
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
};

export function DataProfilingTool(): JSX.Element {
  const [schema, setSchema] = useState('public');
  const [selectedTable, setSelectedTable] = useState('');
  const [sampleSize, setSampleSize] = useState(5000);
  const [topK, setTopK] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: tablesData, loading: tablesLoading, error: tablesError } = useQuery(
    INGESTION_TABLES_QUERY,
    {
      variables: { schema },
      fetchPolicy: 'cache-and-network',
    },
  );

  const tableOptions: IngestionTable[] = useMemo(
    () => tablesData?.ingestionTables ?? [],
    [tablesData?.ingestionTables],
  );

  const [loadProfile, { data: profileData, loading: profileLoading, error: profileError }] = useLazyQuery(
    DATA_PROFILING_QUERY,
    {
      fetchPolicy: 'no-cache',
    },
  );

  const profile: DataProfile | undefined = profileData?.dataProfile;

  const handleRunProfiling = () => {
    if (!selectedTable) {
      setFormError('Please select a table to profile.');
      return;
    }

    if (sampleSize <= 0 || topK <= 0) {
      setFormError('Sample size and Top K must be positive integers.');
      return;
    }

    setFormError(null);
    loadProfile({
      variables: {
        table: selectedTable,
        schema,
        sampleSize,
        topK,
      },
    }).catch((error) => {
      console.error('Failed to execute profiling query', error);
    });
  };

  const handleSchemaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSchema(event.target.value);
    setSelectedTable('');
  };

  const handleTableChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTable(event.target.value);
  };

  const handleSampleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSampleSize(Number.isNaN(value) ? 0 : value);
  };

  const handleTopKChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setTopK(Number.isNaN(value) ? 0 : value);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom data-testid="data-profiling-title">
        Data Profiling
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Inspect ingestion tables, review null rates, and understand value distributions before activating
        downstream pipelines.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profiling Parameters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Schema"
                value={schema}
                onChange={handleSchemaChange}
                fullWidth
                inputProps={{ 'data-testid': 'schema-input' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Table"
                value={selectedTable}
                onChange={handleTableChange}
                fullWidth
                SelectProps={{ native: true }}
                inputProps={{ 'data-testid': 'table-select' }}
                helperText={tableOptions.length === 0 ? 'No tables detected for this schema' : undefined}
              >
                <option value="">Select a table</option>
                {tableOptions.map((table) => (
                  <option key={`${table.schema}.${table.name}`} value={table.name}>
                    {table.name} ({formatNumber(table.rowCount)} rows)
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                type="number"
                label="Sample Size"
                value={sampleSize}
                onChange={handleSampleSizeChange}
                fullWidth
                inputProps={{ min: 1, 'data-testid': 'sample-size-input' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                type="number"
                label="Top K"
                value={topK}
                onChange={handleTopKChange}
                fullWidth
                inputProps={{ min: 1, 'data-testid': 'topk-input' }}
              />
            </Grid>
            <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'stretch' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRunProfiling}
                fullWidth
                data-testid="profile-submit"
              >
                Analyze
              </Button>
            </Grid>
          </Grid>

          {formError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {formError}
            </Alert>
          )}
          {tablesLoading && <LinearProgress sx={{ mt: 2 }} />}
          {tablesError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to load tables: {tablesError.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      {profileLoading && <LinearProgress sx={{ mb: 3 }} />}
      {profileError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Profiling request failed: {profileError.message}
        </Alert>
      )}

      {profile && (
        <Stack spacing={3}>
          <Card data-testid="profile-summary">
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
                <Box>
                  <Typography variant="h6">{profile.table}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Schema: {profile.schema}
                  </Typography>
                </Box>
                <Chip label={`${formatNumber(profile.rowCount)} rows`} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Generated {dayjs(profile.generatedAt).format('MMM D, YYYY h:mm A')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {profile.columns.length === 0 && (
            <Alert severity="info">No columns detected for this table.</Alert>
          )}

          {profile.columns.map((column) => {
            const sampleTotal = column.sampleTopValues.reduce((acc, item) => acc + item.count, 0);
            return (
              <Card key={column.name} data-testid={`column-card-${column.name}`}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                      <Typography variant="h6">{column.name}</Typography>
                      <Chip label={column.dataType} size="small" />
                      <Chip label={`Distinct: ${formatNumber(column.distinctCount)}`} size="small" />
                    </Stack>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Null rate
                      </Typography>
                      <LinearProgress variant="determinate" value={Math.min(column.nullPercent, 100)} sx={{ mt: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(column.nullCount)} nulls ({formatPercent(column.nullPercent)})
                      </Typography>
                    </Box>

                    {column.numericSummary && (
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Typography variant="body2">
                          Min: <strong>{formatNumber(column.numericSummary.min ?? null)}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Max: <strong>{formatNumber(column.numericSummary.max ?? null)}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Mean: <strong>{formatNumber(column.numericSummary.mean ?? null)}</strong>
                        </Typography>
                      </Stack>
                    )}

                    {column.sampleTopValues.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Top Values (sampled)
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Value</TableCell>
                              <TableCell align="right">Count</TableCell>
                              <TableCell align="right">Share</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {column.sampleTopValues.map((item) => {
                              const percent = sampleTotal ? (item.count / sampleTotal) * 100 : 0;
                              return (
                                <TableRow key={`${column.name}-${item.value ?? 'null'}-${item.count}`}>
                                  <TableCell>{item.value ?? '∅'}</TableCell>
                                  <TableCell align="right">{formatNumber(item.count)}</TableCell>
                                  <TableCell align="right">{formatPercent(percent)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {!profile && !profileLoading && !profileError && (
        <Alert severity="info" sx={{ mt: 3 }} data-testid="profiling-placeholder">
          Select a table and click <strong>Analyze</strong> to generate a data profile.
        </Alert>
      )}
    </Box>
  );
}

export default DataProfilingTool;
