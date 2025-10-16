import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
} from '@mui/material';

async function fetchNL2Cypher(
  task: string,
): Promise<{ query: string; estRows: number; estCost: string }> {
  const api = import.meta.env.VITE_NL2CYPHER_API as string | undefined;
  if (api) {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    if (!res.ok) throw new Error('nl2cypher api error');
    return res.json();
  }
  // Fallback: dev mock
  const mock = {
    query: `// MATCH (n)-[r]->(m) WHERE n.name CONTAINS '${task}' RETURN n,r,m LIMIT 50`,
    estRows: 42,
    estCost: '~$0.002',
  };
  await new Promise((r) => setTimeout(r, 250));
  return mock;
}

export function NLToCypherPreview() {
  const [task, setTask] = useState(
    'Show entities related to Project Atlas in last 30 days',
  );
  const [query, setQuery] = useState('');
  const [estRows, setEstRows] = useState<number | null>(null);
  const [estCost, setEstCost] = useState<string>('');
  const [ts, setTs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const disabled = !task.trim();

  async function preview() {
    try {
      setLoading(true);
      const out = await fetchNL2Cypher(task);
      setQuery(out.query);
      setEstRows(out.estRows);
      setEstCost(out.estCost);
      setTs(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-preview once on mount using the default task
    preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          NL → Cypher Preview (Confirm before execute)
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Task"
            fullWidth
            value={task}
            onChange={(e) => setTask(e.target.value)}
            multiline
            minRows={2}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={preview}
              disabled={disabled || loading}
            >
              {loading ? 'Generating…' : 'Preview Query'}
            </Button>
            {ts && <Chip size="small" label={`Last updated ${ts}`} />}
            {estRows != null && (
              <Chip size="small" label={`~${estRows} rows`} />
            )}
            {estCost && <Chip size="small" label={`est cost ${estCost}`} />}
          </Box>
          <TextField
            label="Generated Query"
            fullWidth
            value={query}
            minRows={3}
            multiline
            InputProps={{ readOnly: true }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
