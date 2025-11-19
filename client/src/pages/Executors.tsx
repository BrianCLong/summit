// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

type Exec = {
  id: string;
  name: string;
  kind: 'cpu' | 'gpu';
  labels: string[];
  capacity: number;
  status: string;
};

export default function ExecutorsPage() {
  const [list, setList] = useState<Exec[]>([]);
  const [name, setName] = useState('pool-1');
  const [kind, setKind] = useState<'cpu' | 'gpu'>('cpu');
  const [labels, setLabels] = useState('ci,build');
  const [capacity, setCapacity] = useState(1);
  const [error, setError] = useState('');
  const load = async () => {
    const r = await fetch('/api/maestro/v1/executors');
    setList(await r.json());
  };
  useEffect(() => {
    load();
  }, []);
  const create = async () => {
    setError('');
    try {
      const r = await fetch('/api/maestro/v1/executors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          kind,
          labels: labels
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          capacity,
          status: 'ready',
        }),
      });
      if (!r.ok) throw new Error('create failed');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'create failed');
    }
  };
  return (
    <Box>
      <Typography variant="h4">Executors</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Register Executor</Typography>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ my: 1 }}
              />
              <TextField
                fullWidth
                label="Kind (cpu/gpu)"
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                sx={{ my: 1 }}
              />
              <TextField
                fullWidth
                label="Labels (csv)"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                sx={{ my: 1 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Capacity"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                sx={{ my: 1 }}
              />
              <Button variant="contained" onClick={create}>
                Create
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pools</Typography>
              <List>
                {list.map((e) => (
                  <ListItem key={e.id}>
                    <ListItemText
                      primary={`${e.name} (${e.kind})`}
                      secondary={`cap=${e.capacity} labels=${e.labels.join(',')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
