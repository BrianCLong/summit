// Simple test server that creates a minimal express app for integration tests
// Using express from a specific package to avoid version conflicts

import express from '@intelgraph/api-gateway/node_modules/express';

export async function createTestApp() {
  const app = express();
  app.use(express.json());

  // Minimal stub routes needed by maestro_flow.test.ts
  app.post('/api/flows', (req, res) => {
    // return 202 Accepted to simulate async orchestration kickoff
    return res.status(202).json({ id: 'flow_1', kind: req.body?.kind ?? 'maestro', state: 'queued' });
  });

  app.post('/run', (req, res) => {
    // For maestro_flow.test.ts compatibility
    return res.status(202).json({ runId: 'run_1', status: 'ACCEPTED' });
  });

  app.get('/runs/:runId', (req, res) => {
    // For maestro_flow.test.ts status checking
    return res.status(200).json({ 
      runId: req.params.runId, 
      status: 'SUCCEEDED', 
      completedAt: new Date().toISOString() 
    });
  });

  app.get('/__health', (_req, res) => res.status(200).send('ok'));
  
  // Return the app directly (supertest can use it without listening)
  return app;
}