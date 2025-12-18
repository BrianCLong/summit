import { Request, Response, Router } from 'express';
import { PolicyEvaluator } from '../policy-client.js';
import { httpRequestErrors, httpRequestTotal } from '../observability/metrics.js';

const parseAmount = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const buildSecureRouter = (policyEvaluator: PolicyEvaluator): Router => {
  const router = Router();

  router.post('/payments/:id/approve', async (req: Request, res: Response) => {
    const amount = parseAmount(req.body?.amount);
    if (amount === undefined) {
      httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 400 });
      return res.status(400).json({ message: 'invalid_amount' });
    }

    const userId = req.header('x-user-id');
    if (!userId) {
      httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 401 });
      return res.status(401).json({ message: 'missing_user' });
    }

    const user = { id: userId, roles: req.header('x-user-roles')?.split(',').map((r) => r.trim()).filter(Boolean) };
    const action = { verb: 'approve', resourceType: 'payment', amount, requires_step_up: true };
    const resource = { id: req.params.id, tenant: req.header('x-tenant') };
    const context = { ip: req.ip, userAgent: req.header('user-agent') };

    const decision = await policyEvaluator(user, resource, action, context);

    if (!decision.allow) {
      httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 403 });
      return res.status(403).json({ message: 'forbidden', reason: decision.reason, stepUpRequired: decision.stepUpRequired });
    }

    if (decision.stepUpRequired) {
      const assertion = req.header('x-step-up-token');
      if (!assertion) {
        httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 401 });
        return res.status(401).json({ message: 'step-up-required', reason: 'missing_assertion' });
      }
    }

    httpRequestTotal.inc({ method: req.method, route: req.route.path, status: 200 });
    return res.status(200).json({ status: 'approved', trace: decision.reason || 'policy_allow' });
  });

  return router;
};
