import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const tenants = new Map();
const pendingDeletions = new Map();

app.use((req, res, next) => {
  res.on('finish', () => {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      actor: req.headers['x-admin-id'] || 'system',
      tenantId: req.params?.id || req.body?.tenantId,
      status: res.statusCode
    };
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);
  });
  next();
});

const emitReceipt = async (action, data) => {
  return {
    receiptId: `rcpt-${uuidv4().substring(0, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    data,
    signature: 'v-signed-by-summit-ca'
  };
};

app.post('/tenants', async (req, res) => {
  const { name, brandPack, policyProfile, retentionDays } = req.body;
  const id = `tnt-${uuidv4().substring(0, 8)}`;

  const tenant = {
    id,
    name,
    status: 'ACTIVE',
    brandPack: brandPack || 'base',
    policyProfile: policyProfile || 'standard',
    retentionDays: retentionDays || 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tenants.set(id, tenant);
  const receipt = await emitReceipt('TENANT_CREATE', tenant);
  res.status(201).json({ tenant, receipt });
});

app.get('/tenants', (req, res) => {
  res.json(Array.from(tenants.values()));
});

app.get('/tenants/:id', (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
});

app.put('/tenants/:id/status', async (req, res) => {
  const { status } = req.body;
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  tenant.status = status;
  tenant.updatedAt = new Date().toISOString();

  const receipt = await emitReceipt(`TENANT_${status}`, { tenantId: tenant.id });
  res.json({ tenant, receipt });
});

app.delete('/tenants/:id', async (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const actorId = req.headers['x-admin-id'] || 'admin-1';
  pendingDeletions.set(req.params.id, {
    tenantId: req.params.id,
    requestedBy: actorId,
    requestedAt: new Date().toISOString()
  });

  const receipt = await emitReceipt('TENANT_DELETE_REQUESTED', {
    tenantId: tenant.id,
    requestedBy: actorId
  });
  res.status(202).json({ message: 'Deletion requested', receipt });
});

app.post('/tenants/:id/approve-delete', async (req, res) => {
  const request = pendingDeletions.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'No pending deletion' });

  const approverId = req.headers['x-admin-id'] || 'admin-2';
  if (approverId === request.requestedBy) {
    return res.status(400).json({ error: 'Approver must be different' });
  }

  tenants.delete(req.params.id);
  pendingDeletions.delete(req.params.id);

  const receipt = await emitReceipt('TENANT_DELETE_FINALIZED', {
    tenantId: req.params.id,
    approvedBy: approverId
  });
  res.json({ message: 'Deleted', receipt });
});

app.get('/tenants/:id/export', async (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const bundle = {
    version: '1.0.0',
    tenantId: tenant.id,
    name: tenant.name,
    brandPack: tenant.brandPack,
    policyProfile: tenant.policyProfile
  };

  const receipt = await emitReceipt('TENANT_CONFIG_EXPORT', { tenantId: tenant.id });
  res.json({ bundle, receipt });
});

app.post('/tenants/:id/import/simulate', async (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const { bundle } = req.body;
  const simulation = {
    status: 'SUCCESS',
    impact: bundle.policyProfile === 'lenient' && tenant.policyProfile === 'strict' ? 'High' : 'Low',
    warnings: bundle.policyProfile === 'lenient' && tenant.policyProfile === 'strict' ? ['Security posture will be weakened.'] : []
  };
  res.json(simulation);
});

app.post('/tenants/:id/import/apply', async (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const { bundle } = req.body;
  const snapshot = { ...tenant };

  tenant.brandPack = bundle.brandPack;
  tenant.policyProfile = bundle.policyProfile;
  tenant.updatedAt = new Date().toISOString();

  const receipt = await emitReceipt('TENANT_CONFIG_IMPORT', {
    tenantId: tenant.id,
    previousSnapshot: snapshot
  });
  res.json({ tenant, receipt });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`tenant-admin listening on ${port}`);
  });
}
