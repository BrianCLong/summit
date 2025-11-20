// @ts-nocheck
import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { trackEvent } from '../../services/analytics';

// @ts-nocheck
export default function InvestigationList() {
  const { data } = useSafeQuery<{ id: string; name: string; stage: string }[]>({
    queryKey: 'inv_list',
    mock: [
      { id: 'inv1', name: 'Intrusion 2025-08-26', stage: 'COLLECT' },
      { id: 'inv2', name: 'Insider — Finance', stage: 'ANALYZE' },
    ],
  });

  const cols: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'stage', headerName: 'Stage', width: 140 },
  ];
  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6">Investigations</Typography>
          <Button
            variant="contained"
            onClick={() => trackEvent('investigation_created')}
          >
            Create from Template
          </Button>
        </Stack>
        <div style={{ height: 420 }}>
          <DataGrid
            rows={(data || []).map((r) => ({ id: r.id, ...r }))}
            columns={cols}
            disableRowSelectionOnClick
            density="compact"
          />
        </div>
      </CardContent>
    </Card>
  );
}
// @ts-nocheck
