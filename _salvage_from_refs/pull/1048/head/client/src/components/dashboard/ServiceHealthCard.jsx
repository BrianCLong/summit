import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material';

function kvColor(v) {
  const ok = ['ok', 'healthy', 'connected'];
  if (!v) return 'default';
  const val = String(v).toLowerCase();
  if (ok.includes(val)) return 'success';
  if (val.includes('fail') || val.includes('error')) return 'error';
  return 'warning';
}

export default function ServiceHealthCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const base = global.import_meta?.env?.VITE_API_URL || '';
    const url = `${base}/health`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Service Health
        </Typography>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error">Failed to load health: {String(error)}</Typography>
        )}
        {data && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 1, columnGap: 2 }}>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Chip size="small" label={data.status} color={kvColor(data.status)} />

            <Typography variant="body2" color="text.secondary">Environment</Typography>
            <Chip size="small" label={data.environment} />

            <Typography variant="body2" color="text.secondary">Neo4j</Typography>
            <Chip size="small" label={data?.services?.neo4j || 'unknown'} color={kvColor(data?.services?.neo4j)} />

            <Typography variant="body2" color="text.secondary">Postgres</Typography>
            <Chip size="small" label={data?.services?.postgres || 'unknown'} color={kvColor(data?.services?.postgres)} />

            <Typography variant="body2" color="text.secondary">Redis</Typography>
            <Chip size="small" label={data?.services?.redis || 'unknown'} color={kvColor(data?.services?.redis)} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

