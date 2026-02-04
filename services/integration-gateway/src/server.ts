import express from 'express';
import { MandateService } from '../../../packages/mandates/src';
import { IntegrationTwin } from '../../../packages/integration-twin/src';
import { ToolRegistry } from './ToolRegistry';
import { Gateway } from './Gateway';
// import { JiraConnector } from './connectors/JiraConnector'; // Mock connector for demo purposes

const app = express();
app.use(express.json());

const mandates = new MandateService();
const registry = new ToolRegistry();
const twin = new IntegrationTwin();
const gateway = new Gateway(registry, mandates, twin);

// Discovery Endpoint
app.get('/mcp/v1/tools/list', (req, res) => {
  const tools = registry.getAllTools();
  res.json({ tools });
});

// Invoke Endpoint
app.post('/mcp/v1/tools/call', async (req, res) => {
  const { toolName, args, mandateId, dryRun } = req.body;

  if (!mandateId) {
    return res.status(401).json({ error: 'Missing mandateId' });
  }

  if (dryRun) {
    const result = await gateway.dryRun(mandateId, toolName, args);
    if (!result.allowed) {
      return res.status(403).json(result);
    }
    return res.json(result);
  }

  const result = await gateway.execute(mandateId, toolName, args);
  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json(result);
});

// Mandate Endpoint (for issuance in this demo server)
app.post('/mandates/issue', (req, res) => {
    const { issuer, description, scopes, limits } = req.body;
    const mandate = mandates.createMandate(issuer, description, scopes, limits);
    res.json(mandate);
});

export const startServer = (port: number) => {
  return app.listen(port, () => {
    console.log(`Integration Gateway running on port ${port}`);
  });
};
