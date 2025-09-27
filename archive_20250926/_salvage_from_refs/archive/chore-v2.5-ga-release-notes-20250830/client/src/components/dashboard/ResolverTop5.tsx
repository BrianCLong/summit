import React from 'react';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Link from '@mui/material/Link';

export default function ResolverTop5() {
  const { data } = useSafeQuery<{ parent: string; field: string; avgMs: number }[]>({
    queryKey: 'resolver_top5',
    mock: [
      { parent: 'Query', field: 'search', avgMs: 12.3 },
      { parent: 'Mutation', field: 'updateCase', avgMs: 10.8 },
      { parent: 'Query', field: 'entity', avgMs: 9.2 },
      { parent: 'Query', field: 'path', avgMs: 8.9 },
      { parent: 'Mutation', field: 'addEvidence', avgMs: 7.1 },
    ],
    deps: [],
  });

  const cols: GridColDef[] = [
    { field: 'parent', headerName: 'Parent', flex: 1 },
    { field: 'field', headerName: 'Field', flex: 1, renderCell: (p) => {
      const op = `${p.row.parent}.${p.row.field}`;
      const base = (window as any).__JAEGER_BASE || 'http://localhost:16686';
      const service = (window as any).__JAEGER_SERVICE || 'intelgraph-dev';
      const lookback = (window as any).__JAEGER_LOOKBACK || '1h';
      const href = `${base}/search?service=${service}&operation=${op}&lookback=${lookback}`;
      return <Link href={href} target="_blank" rel="noreferrer" aria-label={`Open ${op} in Jaeger`}>{p.value}</Link>;
    } },
    { field: 'avgMs', headerName: 'Avg (ms)', width: 120, valueFormatter: (p) => p.value?.toFixed(1) ?? '0.0' },
  ];

  return (
    <div style={{ height: 320 }}>
      <DataGrid rows={(data || []).map((r, i) => ({ id: i, ...r }))} columns={cols} density="compact" hideFooter disableRowSelectionOnClick />
    </div>
  );
}
