const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory store for persisted queries (PQ)
let pqItems = [];
const pqFilePath = path.join(__dirname, 'pq-data.json');

// Load PQ items from file
try {
  const rawData = fs.readFileSync(pqFilePath, 'utf8');
  pqItems = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading pq-data.json:', error.message);
  // Initialize with some default if file is missing or invalid
  pqItems = [
    { id: 'pq.getPersonById', name: 'Get Person By ID', operation: 'query' },
    { id: 'pq.getOrgDetails', name: 'Get Organization Details', operation: 'query' },
    { id: 'pq.updateUserRole', name: 'Update User Role', operation: 'mutation' },
  ];
  fs.writeFileSync(pqFilePath, JSON.stringify(pqItems, null, 2), 'utf8');
  console.log('Created default pq-data.json');
}

// GET /api/workbench/pq
app.get('/api/workbench/pq', (req, res) => {
  const { tenantId } = req.query;
  console.log(`[${new Date().toISOString()}] GET /api/workbench/pq for tenant: ${tenantId}`);
  // In a real app, you'd filter based on tenantId from a database
  res.json({ items: pqItems });
});

// POST /api/policy/simulate
app.post('/api/policy/simulate', (req, res) => {
  const { tenantId, purpose, residency, pqid } = req.body;
  console.log(`[${new Date().toISOString()}] POST /api/policy/simulate: tenantId=${tenantId}, purpose=${purpose}, residency=${residency}, pqid=${pqid}`);

  let allow = true;
  const reasons = [];

  // Example policy logic:
  // Deny 'updateUserRole' if purpose is 'investigation' and residency is 'EU'
  if (pqid === 'pq.updateUserRole' && purpose === 'investigation' && residency === 'EU') {
    allow = false;
    reasons.push('Denied: Update operation not allowed for investigation purpose in EU residency.');
  }

  // Deny if no PQID is provided and persistedOnly is true (frontend handles this, but backend should also enforce)
  if (!pqid && process.env.PERSISTED_ONLY === 'true') {
    allow = false;
    reasons.push('Denied: No PQID provided in persisted-only mode.');
  }

  // Allow if purpose is 'benchmarking' regardless of other factors (for demo purposes)
  if (purpose === 'benchmarking') {
    allow = true;
    reasons.push('Allowed: Benchmarking purpose overrides other policies.');
  }

  res.json({ allow, reasons });
});

// POST /api/workbench/chat
app.post('/api/workbench/chat', (req, res) => {
  const { tenantId, purpose, residency, model, pqid, input } = req.body;
  console.log(`[${new Date().toISOString()}] POST /api/workbench/chat: tenantId=${tenantId}, purpose=${purpose}, residency=${residency}, model=${model}, pqid=${pqid}, input='${input}'`);

  // Simulate policy check (should ideally be done by a dedicated policy engine like OPA)
  let policyAllow = true;
  let policyReasons = [];

  if (pqid === 'pq.updateUserRole' && purpose === 'investigation' && residency === 'EU') {
    policyAllow = false;
    policyReasons.push('Denied: Update operation not allowed for investigation purpose in EU residency.');
  }

  if (!pqid && process.env.PERSISTED_ONLY === 'true') {
    policyAllow = false;
    policyReasons.push('Denied: No PQID provided in persisted-only mode.');
  }

  if (purpose === 'benchmarking') {
    policyAllow = true;
    policyReasons.push('Allowed: Benchmarking purpose overrides other policies.');
  }

  if (!policyAllow) {
    return res.status(403).json({
      messages: [{ role: 'assistant', content: `Policy denied your request: ${policyReasons.join('; ')}`, at: new Date().toISOString() }],
      usage: { tokensIn: 0, tokensOut: 0 },
      persisted: true, // Even if denied, it's a response to a potentially persisted query
      policy: { allow: false, reasons: policyReasons },
    });
  }

  // Simulate LLM response
  const assistantResponse = `Acknowledged: '${input}'. Processing with model '${model}' for tenant '${tenantId}' (PQID: ${pqid || 'none'}).`;

  res.json({
    messages: [{ role: 'assistant', content: assistantResponse, at: new Date().toISOString() }],
    usage: { tokensIn: input.length, tokensOut: assistantResponse.length },
    persisted: !!pqid, // Indicate if a PQID was used
    policy: { allow: policyAllow, reasons: policyReasons },
  });
});

// POST /api/audit/log
app.post('/api/audit/log', (req, res) => {
  const { event, subject, tenantId, extra } = req.body;
  console.log(`[${new Date().toISOString()}] AUDIT: event='${event}', subject='${subject}', tenantId='${tenantId}', extra=${JSON.stringify(extra)}`);
  res.json({ ok: true });
});

// Health check endpoint for Dockerfile
app.get('/graphql', (req, res) => {
  if (req.query.query === '{health}') {
    return res.status(200).send('OK');
  }
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Agent Workbench Backend listening on port ${PORT}`);
  console.log(`PQ data loaded from ${pqFilePath}`);
});
