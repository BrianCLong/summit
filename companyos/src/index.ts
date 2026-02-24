import express from 'express';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { PDPService } from './pdp/decide.js';

const app = express();
const port = process.env.PORT || 3000;
const pdp = new PDPService();
const auditLogPath = process.env.AUDIT_LOG_PATH || './audit.log';

app.use(express.json());

// Ensure audit log directory exists
const auditDir = path.dirname(auditLogPath);
await mkdir(auditDir, { recursive: true });

app.post('/api/v1/pdp/decide', async (req, res) => {
  try {
    const decision = await pdp.decide(req.body);
    const auditEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      request: req.body,
      response: decision
    }) + '\n';
    await appendFile(auditLogPath, auditEntry);
    res.json(decision);
  } catch (error) {
    console.error('PDP Decision Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Bootstrap/Provisioning Endpoints (MWS)
app.post('/api/v1/orgs', async (req, res) => {
  console.log('[companyOS] Provisioning Org:', req.body.name);
  res.status(201).json({ status: 'created', ...req.body });
});

app.post('/api/v1/roles', async (req, res) => {
  console.log('[companyOS] Provisioning Role:', req.body.name);
  res.status(201).json({ status: 'created', ...req.body });
});

app.post('/api/v1/budgets', async (req, res) => {
  console.log('[companyOS] Setting Budget:', req.body.tenantId);
  res.status(201).json({ status: 'created', ...req.body });
});

app.post('/api/v1/policies', async (req, res) => {
  console.log('[companyOS] Applying Policy:', req.body.name);
  res.status(201).json({ status: 'created', ...req.body, version: 'v1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`companyOS Governance Service listening at http://localhost:${port}`);
});
