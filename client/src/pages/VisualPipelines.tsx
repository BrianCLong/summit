import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  TextField,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

type Pipeline = { id: string; name: string; spec: unknown };
type HintResponse = { hints?: string[] } | { error?: string };
type CopilotSuggestion = Record<string, unknown> | string | null;

export default function VisualPipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [name, setName] = useState('My Pipeline');
  const [specText, setSpecText] = useState('{"nodes":[],"edges":[]}');
  const [hints, setHints] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<CopilotSuggestion>(null);
  const [error, setError] = useState<string>('');

  const load = async () => {
    try {
      const r = await fetch('/api/maestro/v1/pipelines');
      setPipelines(await r.json());
    } catch {
      /* noop */
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    try {
      const spec = JSON.parse(specText);
      const r = await fetch('/api/maestro/v1/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spec }),
      });
      if (!r.ok) throw new Error('create failed');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'create failed');
    }
  };

  const getHints = async () => {
    setHints([]);
    try {
      const spec = JSON.parse(specText);
      const r = await fetch('/api/maestro/v1/pipelines/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec),
      });
      const data: HintResponse = await r.json();
      setHints('hints' in data && Array.isArray(data.hints) ? data.hints : []);
    } catch {
      setHints(['Invalid JSON']);
    }
  };

  const copilot = async () => {
    setSuggestion(null);
    const r = await fetch('/api/maestro/v1/pipelines/copilot/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: name }),
    });
    const data = await r.json();
    setSuggestion(data);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Visual Pipelines
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Create / Edit</Typography>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ my: 1 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={8}
                label="Spec (JSON)"
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
              />
              <Box sx={{ mt: 1 }}>
                <Button variant="contained" onClick={create} sx={{ mr: 1 }}>
                  Save
                </Button>
                <Button onClick={getHints} sx={{ mr: 1 }}>
                  Policy Hints
                </Button>
                <Button onClick={copilot}>Copilot Suggest</Button>
              </Box>
              {hints.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <ul>
                    {hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {suggestion && (
                <Paper sx={{ p: 1, mt: 2 }}>
                  <Typography variant="subtitle1">
                    Copilot Suggestion
                  </Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(suggestion, null, 2)}
                  </pre>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pipelines</Typography>
              <List>
                {pipelines.map((p) => (
                  <ListItem key={p.id}>
                    <ListItemText primary={p.name} secondary={p.id} />
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
