import React, { useId } from 'react';
import { useAppSelector } from '../../store/index.ts';
import { Card, CardContent, Stack, Typography, Skeleton, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { visuallyHidden } from '@mui/utils';

export default function ErrorPanels() {
  const { tenant, status, operation } = useAppSelector((s) => s.ui);
  const { data: ratio, loading } = useSafeQuery<{ value: number }>({
    queryKey: `err_ratio_${tenant}_${status}_${operation}`,
    mock: { value: 0.0123 },
    deps: [tenant, status, operation],
  });
  const { data: topOps } = useSafeQuery<{ operation: string; ratio: number }[]>({
    queryKey: `err_top_ops_${tenant}_${status}`,
    mock: [
      { operation: 'SearchQuery', ratio: 0.034 },
      { operation: 'UpdateCase', ratio: 0.021 },
    ],
    deps: [tenant, status],
  });

  const columns: GridColDef[] = [
    { field: 'operation', headerName: 'Operation', flex: 1 },
    {
      field: 'ratio',
      headerName: 'Error Ratio',
      flex: 1,
      valueFormatter: (p) => `${(Number(p.value || 0) * 100).toFixed(2)}%`,
    },
  ];

  const errorRatioHeadingId = useId();
  const errorTableHeadingId = useId();
  const errorTableDescriptionId = useId();

  return (
    <Stack spacing={2}>
      <Card component="section" aria-labelledby={errorRatioHeadingId}>
        <CardContent>
          <Typography id={errorRatioHeadingId} variant="subtitle2" color="text.secondary" gutterBottom>
            Error Ratio (5m) — Operation
          </Typography>
          {loading ? (
            <Skeleton width={140} height={40} aria-label="Loading error ratio" />
          ) : (
            <Typography variant="h4" aria-live="polite">
              {(ratio?.value ?? 0).toLocaleString(undefined, {
                style: 'percent',
                minimumFractionDigits: 2,
              })}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Percentage of failed operations within the last five minutes.
          </Typography>
        </CardContent>
      </Card>
      <Card component="section" aria-labelledby={errorTableHeadingId}>
        <CardContent>
          <Typography id={errorTableHeadingId} variant="subtitle2" color="text.secondary" gutterBottom>
            Top Operations by Error Ratio (5m)
          </Typography>
          <Box component="p" id={errorTableDescriptionId} sx={visuallyHidden}>
            Table listing the operations with the highest error ratios over the last five minutes, including
            human-readable percentages.
          </Box>
          <Box sx={{ height: 260 }}>
            <DataGrid
              rows={(topOps || []).map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              disableRowSelectionOnClick
              density="compact"
              aria-labelledby={errorTableHeadingId}
              aria-describedby={errorTableDescriptionId}
              sx={{
                borderRadius: 2,
                borderColor: (theme) => theme.palette.divider,
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(15, 23, 42, 0.08)',
                  color: '#0f172a',
                  fontWeight: 600,
                },
                '& .MuiDataGrid-cell': {
                  color: '#0f172a',
                },
                '& .MuiDataGrid-row.Mui-selected': {
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
