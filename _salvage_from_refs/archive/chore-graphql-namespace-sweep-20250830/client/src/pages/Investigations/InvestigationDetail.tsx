import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery.js';
import ChainOfCustody from '../../components/investigations/ChainOfCustody.js';

export default function InvestigationDetail() {
  const { id } = useParams();
  const { data } = useSafeQuery<{ id: string; stage: string; evidence: { id: string; name: string }[]; coc: any[] }>({
    queryKey: `inv_${id}`,
    mock: { id: id || 'inv1', stage: 'ANALYZE', evidence: [{ id: 'e1', name: 'Log sample' }], coc: [{ actor: 'alice', action: 'created', at: new Date().toISOString() }] },
    deps: [id],
  });

  const handleExport = async () => {
    // Mock exporter flow
    alert('Export requested — a link will be delivered upon completion.');
  };

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Investigation — {data?.id}</Typography>
          <Button variant="contained" onClick={handleExport}>Export Report</Button>
        </Stack>
        <Typography sx={{ mt: 1 }}>Stage: {data?.stage}</Typography>
        <Typography sx={{ mt: 2 }} variant="subtitle2">Evidence</Typography>
        <ul>{data?.evidence.map((e) => <li key={e.id}>{e.name}</li>)}</ul>
        <Typography sx={{ mt: 2 }} variant="subtitle2">Chain of Custody</Typography>
        <ChainOfCustody entries={(data?.coc || []) as any} />
      </CardContent>
    </Card>
  );
}
