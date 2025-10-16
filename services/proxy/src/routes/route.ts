import { Router } from 'express';
import { decide } from '../router/policy';
import { routeExecuteLatency } from '../metrics';
import { upsertRunReport } from '../integrations/github';

const r = Router();

r.post('/route/plan', (req, res) => {
  const decision = decide(req.app.get('policy'), req.body);
  res.json({ decision, policy: { allow: decision.allow } });
});

r.post('/route/execute', async (req, res) => {
  const start = process.hrtime.bigint();
  const decision = decide(req.app.get('policy'), req.body);
  if (!decision.allow || !decision.model) return res.status(429).json(decision);

  // pseudo‑call to gateway here (replace with real client)
  const { model } = decision;
  try {
    const output = { text: `hello from ${model}` };
    const latencyMs = Number((process.hrtime.bigint() - start) / 1000000n);
    routeExecuteLatency.observe(
      { model, stream: String(Boolean(req.body.stream)), status: 'ok' },
      latencyMs / 1000,
    );
    const audit_id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await upsertRunReport(
      audit_id,
      JSON.stringify({ decision, req }, null, 0) + '\n',
    );
    res.json({
      audit_id,
      latency_ms: latencyMs,
      output,
      explain: decision.reasons,
    });
  } catch (e: any) {
    routeExecuteLatency.observe(
      { model, stream: String(Boolean(req.body.stream)), status: 'err' },
      0,
    );
    return res.status(502).json({ error: 'gateway_failed', detail: e.message });
  }
});

export default r;
