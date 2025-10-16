import client from 'prom-client';
import express from 'express';
const app = express();
const r = new client.Registry();
client.collectDefaultMetrics({ register: r });
const gLead = new client.Gauge({
  name: 'dora_lead_time_minutes',
  help: 'Lead time',
  labelNames: ['service'],
});
const gDeploy = new client.Counter({
  name: 'dora_deploys_total',
  help: 'Deploys',
  labelNames: ['env'],
});
r.registerMetric(gLead);
r.registerMetric(gDeploy);

export function recordLead(minutes: number) {
  gLead.labels('maestro').set(minutes);
}
export function recordDeploy(env: string) {
  gDeploy.labels(env).inc();
}

app.get('/metrics', async (_req, res) => {
  res.type(r.contentType);
  res.end(await r.metrics());
});
app.listen(process.env.PORT || 9109);
