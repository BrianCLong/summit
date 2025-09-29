import React from 'react';
import { useAppSelector } from '../../store/index.js';
import { Card, CardContent, Stack, Typography, Skeleton } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery.js';

export default function ErrorPanels() {
  const { tenant, status, operation } = useAppSelector(s => s.ui);
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
    { field: 'ratio', headerName: 'Error Ratio', flex: 1, valueFormatter: (p) => `${(Number(p.value) * 100).toFixed(2)}%` },
  ];

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">Error Ratio (5m) — Operation</Typography>
          {loading ? <Skeleton width={140} height={40} /> : <Typography variant="h4">{(ratio?.value ?? 0).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</Typography>}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Top Operations by Error Ratio (5m)</Typography>
          <div style={{ height: 260 }}>
            <DataGrid rows={(topOps || []).map((r, i) => ({ id: i, ...r }))} columns={columns} disableRowSelectionOnClick density="compact" />
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}
