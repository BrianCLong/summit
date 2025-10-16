import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { apiFetch } from '../../services/api';

export default function FederatedSearchPanel() {
  const [query, setQuery] = useState(
    `query Entities($limit:Int){\n  __schema { types { name } }\n}`,
  );
  const [variables, setVariables] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const [instances, setInstances] = useState([]);
  const [selected, setSelected] = useState({});
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/federation/instances');
        const inst = (res.instances || []).map((i) => ({
          id: i.id,
          name: i.name,
        }));
        setInstances(inst);
        setSelected(inst.reduce((acc, i) => ({ ...acc, [i.id]: true }), {}));
      } catch (e) {}
    })();
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/federation/search', {
        method: 'POST',
        body: JSON.stringify({
          query: { graphql: query, variables: JSON.parse(variables || '{}') },
          instances: Object.keys(selected).filter((k) => selected[k]),
          aggregateResults: true,
        }),
      });
      setOutput(JSON.stringify(res, null, 2));
      // Attempt to flatten a common result shape if present
      const data = res?.results || res?.data || res;
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data?.items)) items = data.items;
      if (items.length && typeof items[0] === 'object') {
        const cols = Object.keys(items[0])
          .slice(0, 8)
          .map((k) => ({ field: k, headerName: k, width: 180 }));
        const rws = items.map((it, idx) => ({ id: idx, ...it }));
        setColumns(cols);
        setRows(rws);
      } else {
        setColumns([]);
        setRows([]);
      }
    } catch (e) {
      setOutput(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Federated Search
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                label="GraphQL"
                fullWidth
                multiline
                minRows={6}
                sx={{ mb: 2 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <TextField
                label="Variables (JSON)"
                fullWidth
                multiline
                minRows={3}
                sx={{ mb: 2 }}
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
              />
              <Button variant="contained" onClick={run} disabled={busy}>
                {busy ? 'Running…' : 'Run Federated Search'}
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Target Instances
              </Typography>
              <FormGroup>
                {instances.map((i) => (
                  <FormControlLabel
                    key={i.id}
                    control={
                      <Checkbox
                        checked={!!selected[i.id]}
                        onChange={(e) =>
                          setSelected({ ...selected, [i.id]: e.target.checked })
                        }
                      />
                    }
                    label={i.name || i.id}
                  />
                ))}
              </FormGroup>
              <TextField
                label="Preset Name"
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  onClick={() => {
                    if (!presetName) return;
                    const presets = JSON.parse(
                      localStorage.getItem('fed_presets') || '{}',
                    );
                    presets[presetName] = { query, variables, selected };
                    localStorage.setItem(
                      'fed_presets',
                      JSON.stringify(presets),
                    );
                  }}
                >
                  Save Preset
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const presets = JSON.parse(
                      localStorage.getItem('fed_presets') || '{}',
                    );
                    const p = presets[presetName];
                    if (p) {
                      setQuery(p.query);
                      setVariables(p.variables);
                      setSelected(p.selected);
                    }
                  }}
                >
                  Load Preset
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {rows.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Results
            </Typography>
            <div style={{ height: 420, width: '100%' }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </div>
          </CardContent>
        </Card>
      ) : output ? (
        <Card>
          <CardContent>
            <Typography variant="h6">Output</Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
