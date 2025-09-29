import React, { useEffect, useState } from 'react';
import { FederationAPI } from '../../services/api';
import { Box, Typography, Button, TextField, Grid, Card, CardContent, Chip, Stack } from '@mui/material';

export default function InstanceConnections() {
  const [instances, setInstances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', endpoint: '', apiKey: '', capabilities: '', maxConcurrentQueries: 5, timeout: 30000 });
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await FederationAPI.listInstances();
      setInstances(data.instances || []);
      setSummary(data.summary || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const register = async () => {
    await FederationAPI.register({
      id: form.id,
      name: form.name,
      endpoint: form.endpoint,
      apiKey: form.apiKey,
      capabilities: form.capabilities ? form.capabilities.split(',').map(s => s.trim()).filter(Boolean) : [],
      maxConcurrentQueries: Number(form.maxConcurrentQueries) || 5,
      timeout: Number(form.timeout) || 30000,
    });
    setForm({ id: '', name: '', endpoint: '', apiKey: '', capabilities: '', maxConcurrentQueries: 5, timeout: 30000 });
    await load();
  };

  const remove = async (id) => { await FederationAPI.remove(id); await load(); };
  const test = async (id) => { await FederationAPI.test(id); await load(); };
  const update = async (inst, updates) => { await FederationAPI.update(inst.id, updates); await load(); };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Instance Connections</Typography>
      {summary && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Total: {summary.total} · Healthy: {summary.healthy} · Visible: {summary.visible}
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['id','name','endpoint','apiKey','capabilities','maxConcurrentQueries','timeout'].map((key) => (
          <Grid item xs={12} md={key==='capabilities' ? 12 : 6} key={key}>
            <TextField
              label={key}
              fullWidth
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              helperText={key==='capabilities' ? 'Comma-separated (e.g., graph_analytics, nlp_processing)' : ' '}
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Button variant="contained" onClick={register} disabled={loading || !form.id || !form.name || !form.endpoint || !form.apiKey}>
            Register Instance
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {instances.map((inst) => (
          <Grid item xs={12} md={6} key={inst.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{inst.name}</Typography>
                <Typography variant="body2" color="text.secondary">{inst.endpoint}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Status: {statusMap[inst.id]?.connectionStatus?.status || 'Unknown'}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {(inst.capabilities || []).map((c) => <Chip size="small" key={c} label={c} />)}
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <TextField label="Access Level" select fullWidth SelectProps={{ native: true }} defaultValue={inst.accessLevel || 'public'} onBlur={(e) => update(inst, { accessLevel: e.target.value })}>
                        <option value="public">public</option>
                        <option value="restricted">restricted</option>
                        <option value="private">private</option>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Capabilities (comma-separated)" fullWidth defaultValue={(inst.capabilities || []).join(', ')} onBlur={(e) => update(inst, { capabilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Max Concurrent Queries" type="number" fullWidth defaultValue={inst.maxConcurrentQueries || 5} onBlur={(e) => update(inst, { maxConcurrentQueries: Number(e.target.value) || 5 })} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Timeout (ms)" type="number" fullWidth defaultValue={inst.timeout || 30000} onBlur={(e) => update(inst, { timeout: Number(e.target.value) || 30000 })} />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={async () => { const d = await FederationAPI.get(inst.id); setStatusMap(s => ({...s, [inst.id]: d})); }}>Status</Button>
                        <Button size="small" variant="outlined" onClick={async () => { await test(inst.id); const d = await FederationAPI.get(inst.id); setStatusMap(s => ({...s, [inst.id]: d})); }}>Test</Button>
                        <Button size="small" color="error" onClick={() => remove(inst.id)}>Remove</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
