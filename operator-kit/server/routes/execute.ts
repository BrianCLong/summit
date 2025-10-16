import express from 'express';
import { routeLatency, tokensTotal, errorsTotal } from '../metrics';
import { emit } from '../events';
import { traceId } from '../util';
import { RedisQuotaStore, QuotaStore } from '../quotas/store';

export const execRouter = express.Router();

execRouter.post('/', async (req, res) => {
  const t0 = Date.now();
  const { task, input, env, loa = 1, tenant = 'default' } = req.body || {};
  const audit_id = traceId();

  try {
    // In a real system, call your actual model runner here.
    const decision_detail = { model: 'local/ollama', chosen_by: 'score-top' };
    const output = `echo: ${input ?? ''}`;

    // Placeholder for provider API call and header parsing
    // In a real implementation, this would be where you make the actual call to Perplexity/Venice
    // and read their rate-limit headers (e.g., X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
    const providerResponseHeaders = {
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '90',
      'x-ratelimit-reset': (Date.now() / 1000 + 60).toString(), // Reset in 60 seconds
    };

    // Example of parsing headers and updating QuotaStore
    const limit = parseInt(
      providerResponseHeaders['x-ratelimit-limit'] || '0',
      10,
    );
    const remaining = parseInt(
      providerResponseHeaders['x-ratelimit-remaining'] || '0',
      10,
    );
    const resetTime =
      parseInt(providerResponseHeaders['x-ratelimit-reset'] || '0', 10) * 1000; // Convert to milliseconds

    // Assuming 'decision_detail.model' is the model used
    // And 'tokensTotal' is the unit
    // This is a simplified example
    if (limit > 0) {
      const quotaStore = new RedisQuotaStore(); // Or get from app context
      // Record the usage for the current request
      await quotaStore.record(decision_detail.model, 'requests', 1); // Assuming 1 request per execution
      // Update the cap and remaining based on headers (this is more complex for rolling windows)
      // For fixed windows, you might update the cap directly if the provider sends it
    }
    const latency_ms = Date.now() - t0;

    routeLatency.labels(decision_detail.model, tenant).observe(latency_ms);
    tokensTotal.labels(decision_detail.model, tenant, 'prompt').inc(50);
    tokensTotal.labels(decision_detail.model, tenant, 'completion').inc(20);

    const payload = { audit_id, latency_ms, decision_detail, output };
    emit({ type: 'route.execute', detail: payload });
    res.json(payload);
  } catch (e: any) {
    errorsTotal.labels('/route/execute', '500').inc();
    emit({
      type: 'error',
      route: '/route/execute',
      code: 500,
      msg: e?.message,
    });
    res.status(500).json({ error: 'execution_failed', audit_id });
  }
});
