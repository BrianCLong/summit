import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery.js';

export default function IOCList() {
  const { data } = useSafeQuery<{ id: string; type: string; value: string; risk: number }[]>({
    queryKey: 'ioc_list',
    mock: [
      { id: 'ioc1', type: 'ip', value: '1.2.3.4', risk: 80 },
      { id: 'ioc2', type: 'domain', value: 'evil.example.com', risk: 65 },
    ],
  });

  const cols: GridColDef[] = [
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'value', headerName: 'Value', flex: 1 },
    { field: 'risk', headerName: 'Risk', width: 100 },
  ];

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">IOCs</Typography>
          <Stack direction="row" spacing={1}><Button variant="contained">Add</Button><Button variant="outlined">Import CSV</Button></Stack>
        </Stack>
        <div style={{ height: 420 }}>
          <DataGrid rows={(data || []).map((r) => ({ id: r.id, ...r }))} columns={cols} disableRowSelectionOnClick density="compact" />
        </div>
      </CardContent>
    </Card>
  );
}
