import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Grid, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { apiFetch } from '../../services/api';

export default function ExternalDataPanel() {
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState('wikipedia_search');
  const [params, setParams] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const presets = {
    wikipedia_search: { params: { term: 'intelgraph' } },
    wikidata_search: { params: { term: 'intel' } },
    urlhaus_recent: { params: {} },
    nvd_recent: { params: { resultsPerPage: 10 } },
    nominatim_search: { params: { q: '1600 Amphitheatre Parkway, Mountain View' } },
    open_meteo_air: { params: { latitude: 37.42, longitude: -122.08 } },
    spacex_launches: { params: {} },
    nasa_apod: { params: { date: '2024-12-01' } },
    shodan_host: { params: { ip: '8.8.8.8' } },
    greynoise_ip: { params: { ip: '8.8.8.8' } },
    hibp_breach: { params: { account: 'user@example.com' } },
    opencage_geocode: { params: { q: 'Paris, France' } },
    gnews_search: { params: { q: 'intelgraph' } },
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/external/providers');
        setProviders(res.providers || []);
      } catch {}
    })();
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const parsed = params ? JSON.parse(params) : {};
      const res = await apiFetch('/api/external/query', { method: 'POST', body: JSON.stringify({ provider, params: parsed }) });
      setOutput(JSON.stringify(res.result, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>External Data</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="prov">Provider</InputLabel>
                <Select labelId="prov" label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {providers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.id}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="outlined" onClick={()=>{
                const p = presets[provider];
                if (p) setParams(JSON.stringify(p.params, null, 2));
              }}>Quick Fill</Button>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="Params (JSON)" fullWidth multiline minRows={3} value={params} onChange={(e) => setParams(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={run} disabled={busy}>{busy ? 'Querying…' : 'Query'}</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {output && (
        <Card>
          <CardContent>
            <Typography variant="h6">Output</Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
