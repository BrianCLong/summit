// services/lsc-service/src/index.ts
import express from 'express';

const app = express();
app.use(express.json());

// In-memory store for demonstration purposes
const evidenceStore: any = {};
const caseStore: any = {};

// Endpoint to receive evidence from CI
app.post('/events', (req, res) => {
  const { eventType, data, prId } = req.body;
  console.log(`Received event: ${eventType} for PR ${prId}`);

  if (!evidenceStore[prId]) {
    evidenceStore[prId] = [];
  }
  evidenceStore[prId].push({
    eventType,
    data,
    receivedAt: new Date().toISOString(),
  });

  // Logic to build the GSN graph based on events
  const claims = (evidenceStore[prId] || []).map((ev: any, idx: number) => ({
    id: `C${idx + 1}`,
    text: `Evidence ${ev.eventType} verified at ${ev.receivedAt}`,
    metadata: ev.data,
  }));

  caseStore[prId] = {
    goal: { id: 'G1', text: `PR ${prId} is safe` },
    claims,
  };

  res.status(202).send({ status: 'accepted' });
});

// Endpoint to serve the built safety case
app.get('/case/:prId', (req, res) => {
  const { prId } = req.params;
  const safetyCase = caseStore[prId];

  if (safetyCase) {
    res.json(safetyCase);
  } else {
    res.status(404).send({ error: 'Safety case not found for this PR.' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`lsc-service listening on port ${port}`);
});
