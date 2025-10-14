import { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardContent, Grid, TextField, Button, Stack, Typography
} from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

export default function ScenarioChart() {
  const [form, setForm] = useState({
    headcount: 28,
    price: 1200,
    churn: 0.03,
    pipeline: 8,
    cogsRate: 0.25,
    payrollPerFte: 15000,
    otherOpex: 50000,
    months: 12,
  });
  const [data, setData] = useState(null);

  const handle = (k) => (e) => {
    const v = e.target.value;
    setForm((s) => ({ ...s, [k]: String(v).includes('.') ? Number(v) : Number(v) }));
  };

  const run = async () => {
    const r = await fetch('/v1/scenario/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-roles': 'Exec' },
      body: JSON.stringify(form),
    });
    const json = await r.json();
    setData(json);
  };

  const rows = useMemo(() => {
    if (!data) return [];
    return data.revenueMonthly.map((rev, i) => ({
      month: `M${i + 1}`,
      revenue: Math.round(rev),
      gm: Math.round(data.grossMarginMonthly[i]),
      burn: Math.round(data.burnMonthly[i]),
    }));
  }, [data]);

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardHeader title="Scenario — ARR / Burn Sensitivity" />
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}><TextField label="Headcount" type="number" fullWidth value={form.headcount} onChange={handle('headcount')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="ARPA / Price" type="number" fullWidth value={form.price} onChange={handle('price')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="Churn (0–1)" type="number" fullWidth value={form.churn} onChange={handle('churn')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="New Accts / mo" type="number" fullWidth value={form.pipeline} onChange={handle('pipeline')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="COGS rate (0–1)" type="number" fullWidth value={form.cogsRate} onChange={handle('cogsRate')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="Payroll / FTE / mo" type="number" fullWidth value={form.payrollPerFte} onChange={handle('payrollPerFte')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="Other Opex / mo" type="number" fullWidth value={form.otherOpex} onChange={handle('otherOpex')} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField label="Months" type="number" fullWidth value={form.months} onChange={handle('months')} /></Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="contained" fullWidth onClick={run}>Run</Button>
          </Grid>
        </Grid>

        {data && (
          <>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Typography variant="body2"><b>ARR:</b> ${Math.round(data.arr).toLocaleString()}</Typography>
              <Typography variant="body2"><b>Sens. Price +10%:</b> +${Math.round(data.sensitivities.price10).toLocaleString()}</Typography>
              <Typography variant="body2"><b>Sens. Headcount +10%:</b> +${Math.round(data.sensitivities.headcount10).toLocaleString()}</Typography>
              <Typography variant="body2"><b>Sens. Churn +10%:</b> +${Math.round(data.sensitivities.churn10).toLocaleString()}</Typography>
            </Stack>

            <div style={{ width: '100%', height: 320, marginTop: 12 }}>
              <ResponsiveContainer>
                <LineChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" />
                  <Line type="monotone" dataKey="gm" />
                  <Line type="monotone" dataKey="burn" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}