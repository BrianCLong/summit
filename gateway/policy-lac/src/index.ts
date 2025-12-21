import express from 'express';
import path from 'path';
import { PolicyService, loadExampleContexts } from './policy-service';
import { Context } from './policy-engine';

const defaultPolicyPath = process.env.POLICY_FILE ?? path.join(__dirname, '..', 'policies', 'examples', 'baseline.json');

export function createApp(policyPath: string = defaultPolicyPath) {
  const app = express();
  const service = new PolicyService(policyPath);

  app.use(express.json());

  app.post('/policy/explain', (req, res) => {
    try {
      const body = req.body ?? {};
      const context: Partial<Context> = {
        action: body.action ?? 'policy:explain',
        resource: body.resource ?? 'unspecified',
        attributes: body.attributes
      };
      const decision = service.evaluateContext(context);
      res.json({
        allowed: decision.allowed,
        reason: decision.reason,
        matchedRuleId: decision.matchedRuleId,
        policyVersion: service.policyVersion,
        input: context
      });
    } catch (err: unknown) {
      res.status(200).json({
        allowed: false,
        reason: `Denied: ${err instanceof Error ? err.message : 'Invalid request payload'}`,
        policyVersion: service.policyVersion
      });
    }
  });

  app.post('/policy/diff', (req, res) => {
    try {
      const { targetPolicy, contexts } = req.body ?? {};
      if (!targetPolicy) {
        return res.status(400).json({ error: 'targetPolicy is required' });
      }
      const diff = service.diff(targetPolicy, Array.isArray(contexts) ? contexts : loadExampleContexts());
      res.json({ differences: diff, policyVersion: service.policyVersion });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid diff payload' });
    }
  });

  app.post('/policy/reload', (_req, res) => {
    service.reload();
    res.json({ status: 'reloaded', policyVersion: service.policyVersion });
  });

  app.get('/health', (_req, res) => res.send('ok'));

  return { app, service };
}

if (require.main === module) {
  const { app } = createApp();
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`[policy-lac] listening on ${port}`));
}
