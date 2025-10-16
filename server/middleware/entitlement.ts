import { evaluate } from '@open-policy-agent/opa-wasm';
export function requireFeature(feature: string) {
  return (req, res, next) =>
    evaluate('entitlements/allow', { plan: req.tenant.plan, feature })
      ? next()
      : res.status(402).json({ error: 'feature_not_in_plan' });
}
