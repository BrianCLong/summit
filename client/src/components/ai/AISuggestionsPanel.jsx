import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { MLAPI } from '../../services/api';

export default function AISuggestionsPanel() {
  const [investigationId, setInvestigationId] = useState('');
  const [topK, setTopK] = useState(20);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [trainBusy, setTrainBusy] = useState(false);
  const [lastModel, setLastModel] = useState(null);

  const runSuggest = async () => {
    setBusy(true);
    try {
      const res = await MLAPI.suggestLinks({ investigationId, topK: Number(topK) });
      setSuggestions(res.suggestions || []);
    } finally {
      setBusy(false);
    }
  };

  const runTrain = async () => {
    setTrainBusy(true);
    try {
      const res = await MLAPI.train({ name: 'baseline-linkpred' });
      setLastModel(res);
    } finally {
      setTrainBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Suggestions
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Investigation ID"
                fullWidth
                value={investigationId}
                onChange={(e) => setInvestigationId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Top K"
                type="number"
                fullWidth
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="contained" disabled={!investigationId || busy} onClick={runSuggest}>
                {busy ? 'Running…' : 'Suggest Links'}
              </Button>
              <Button variant="outlined" onClick={runTrain} disabled={trainBusy}>
                {trainBusy ? 'Training…' : 'Train Baseline'}
              </Button>
              {lastModel && (
                <Typography variant="body2">
                  Model: {lastModel.modelId} (AUC {lastModel.metrics?.auc})
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Suggestions
      </Typography>
      <List>
        {suggestions.map((s, i) => (
          <React.Fragment key={i}>
            <ListItem>
              <ListItemText
                primary={`${s.source} ↔ ${s.target}`}
                secondary={`score: ${s.score.toFixed(3)}`}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
        {suggestions.length === 0 && (
          <Typography color="text.secondary">No suggestions yet.</Typography>
        )}
      </List>
    </Box>
  );
}
