import { Router } from 'express';
import { parse } from './dsl';
import { toOPA } from './compile';

const r = Router();

r.post('/lac/compile', (req, res) => {
  try {
    const rules = parse(String(req.body?.src || ''));
    const rego = toOPA(rules);
    res.json({ rego });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

r.post('/lac/simulate', (req, res) => {
  const { user, dataset } = req.body || {};
  const allowed = Array.isArray(user?.roles)
    && user.roles.includes('DisclosureApprover')
    && dataset?.license !== 'restricted';
  res.json({ allowed, reason: allowed ? null : 'policy_denied' });
});

export default r;
