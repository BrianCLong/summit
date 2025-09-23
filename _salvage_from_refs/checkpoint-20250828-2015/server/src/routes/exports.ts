import { Router } from 'express';
import { PolicyEngine } from '../security/policy';
export const exportsRouter = Router();
const engine = new PolicyEngine([
  { id:'deny-restricted-osint', effect:'deny', when:{ actions:['export'], resourceTypes:['dataset'],
    conditions:[{ key:'resource.attrs.license', op:'in', value:['restricted','internal'] }] }, reason:'Export blocked by license' },
]);

exportsRouter.post('/', async (req, res) => {
  const user = (req as any).user; // populated by auth middleware
  // In a real scenario, you'd fetch the dataset from your DB
  // For now, we'll mock it based on datasetId
  const datasetId = req.body.datasetId;
  let dataset: any;
  if (datasetId === 'osint-feed-xyz') {
    dataset = { id: 'osint-feed-xyz', tenant_id: user.tenantId, license: 'restricted' };
  } else if (datasetId === 'osint-feed-public') {
    dataset = { id: 'osint-feed-public', tenant_id: user.tenantId, license: 'public' };
  } else {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const decision = engine.evaluate({
    subject: user,
    action: 'export',
    resource: { type:'dataset', id: dataset.id, tenantId: dataset.tenant_id, attrs: { license: dataset.license } }
  });
  if (!decision.allowed) {
    return res.status(403).json({ reason: decision.reason, appealPath: '/policy/appeal' });
  }
  // … enqueue export job
  res.status(202).json({ status: 'queued' });
});
