/**
 * Federated Learning Service
 * REST API for federated learning orchestration
 */

import express from 'express';
import cors from 'cors';
import { FederatedOrchestrator } from '@intelgraph/federated-learning';
import { PrivacyBudgetManager } from '@intelgraph/differential-privacy';

const app = express();
const port = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

const orchestrator = new FederatedOrchestrator();
const privacyBudgetManager = new PrivacyBudgetManager();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'federated-service' });
});

// Initialize federated session
app.post('/api/sessions', async (req, res) => {
  try {
    const { config, clients, initialWeights } = req.body;
    const sessionId = await orchestrator.initializeSession(config, clients, initialWeights);

    // Initialize privacy budget
    if (config.differentialPrivacy && config.privacyBudget) {
      privacyBudgetManager.initializeBudget(
        sessionId,
        config.privacyBudget.epsilon,
        config.privacyBudget.delta
      );
    }

    res.json({ sessionId, status: 'initialized' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start training round
app.post('/api/sessions/:sessionId/rounds', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const round = await orchestrator.startRound(sessionId);
    res.json(round);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit client update
app.post('/api/sessions/:sessionId/updates', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const update = req.body;
    await orchestrator.submitClientUpdate(sessionId, update);
    res.json({ status: 'received' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aggregate updates
app.post('/api/sessions/:sessionId/aggregate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { updates } = req.body;
    const result = await orchestrator.aggregateRound(sessionId, updates);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get session status
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = orchestrator.getSessionStatus(sessionId);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get global weights
app.get('/api/sessions/:sessionId/weights', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const weights = orchestrator.getGlobalWeights(sessionId);
    res.json({ weights });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get training metrics
app.get('/api/sessions/:sessionId/metrics', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const metrics = orchestrator.getTrainingMetrics(sessionId);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Federated service listening on port ${port}`);
});

export default app;
