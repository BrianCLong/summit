import React from 'react';
import { useAppSelector } from '../../store/index.ts';
import { Card, CardContent, Stack, Typography, Skeleton, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery';

interface ErrorPanelsProps {
  headingId?: string;
}

export default function ErrorPanels({ headingId = 'error-panels-heading' }: ErrorPanelsProps) {
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

  const formattedRatio = (ratio?.value ?? 0).toLocaleString(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
  });

  return (
    <Stack spacing={2} component="section" aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        Error insights
      </Typography>
      <Card component="article" aria-labelledby={`${headingId}-current`}>
        <CardContent>
          <Typography
            id={`${headingId}-current`}
            variant="subtitle2"
            sx={{ color: 'text.primary', fontWeight: 600 }}
          >
            Error Ratio (5m) — Operation
          </Typography>
          {loading ? (
            <Skeleton width={140} height={40} role="status" aria-live="polite" />
          ) : (
            <Typography variant="h4" component="p" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {formattedRatio}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            The percentage of failed operations in the last five minutes for the current filter
            selection.
          </Typography>
        </CardContent>
      </Card>
      <Card component="article" aria-labelledby={`${headingId}-table`}>
        <CardContent>
          <Typography
            id={`${headingId}-table`}
            variant="subtitle2"
            sx={{ color: 'text.primary', fontWeight: 600 }}
            gutterBottom
          >
            Top Operations by Error Ratio (5m)
          </Typography>
          <Box sx={{ height: 260 }}>
            <DataGrid
              aria-label="Operations sorted by error ratio"
              aria-describedby={`${headingId}-table`}
              rows={(topOps || []).map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              disableColumnMenu
              disableRowSelectionOnClick
              density="compact"
              getRowId={(row) => row.id}
              hideFooter
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'background.paper',
                },
                '& .MuiDataGrid-cell': {
                  color: 'text.primary',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
