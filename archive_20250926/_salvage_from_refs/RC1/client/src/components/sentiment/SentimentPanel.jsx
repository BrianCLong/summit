import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Grid, List, ListItem, ListItemText } from '@mui/material';
import { apiFetch } from '../../services/api';

export default function SentimentPanel() {
  const [inputs, setInputs] = useState('[{"id":"1","kind":"text","text":"This is great!"}]');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/sentiment/analyze', { method:'POST', body: JSON.stringify({ inputs: JSON.parse(inputs) }) });
      setResult(res);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Multimodal Sentiment</Typography>
      <Card sx={{ mb:2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Inputs (JSON array)" fullWidth multiline minRows={6} value={inputs} onChange={(e)=>setInputs(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={run} disabled={busy}>{busy ? 'Analyzing…' : 'Analyze'}</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1">Aggregate Score: {result.aggregateScore?.toFixed?.(3)}</Typography>
            <List>
              {(result.items||[]).map((it) => (
                <ListItem key={`${it.kind}-${it.id}`}>
                  <ListItemText primary={`${it.kind} #${it.id} — score ${it.score} (comp ${it.comparative})`} secondary={it.textPreview} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

