import React from 'react';
import { Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery.js';

export default function HuntList() {
  const { data } = useSafeQuery<{ id: string; name: string; status: string; tactic: string }[]>({
    queryKey: 'hunt_list',
    mock: [
      { id: 'h1', name: 'Suspicious Lateral Movement', status: 'RUNNING', tactic: 'Lateral Movement' },
      { id: 'h2', name: 'Credential Dumping', status: 'SUCCESS', tactic: 'Credential Access' },
    ],
  });

  const cols: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'RUNNING' ? 'warning' : 'success'} /> },
    { field: 'tactic', headerName: 'ATT&CK Tactic', width: 220 },
  ];

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Threat Hunts</Typography>
        </Stack>
        <div style={{ height: 420 }}>
          <DataGrid rows={(data || []).map((r) => ({ id: r.id, ...r }))} columns={cols} disableRowSelectionOnClick density="compact" />
        </div>
      </CardContent>
    </Card>
  );
}
