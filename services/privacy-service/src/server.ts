/**
 * Privacy Service
 * REST API for privacy analysis, enforcement, and compliance
 */

import express from 'express';
import cors from 'cors';
import { PrivacyBudgetManager, MomentAccountant } from '@intelgraph/differential-privacy';
import { AttackDetector, GDPRCompliance, SyntheticDataGenerator } from '@intelgraph/privacy-preserving-ml';

const app = express();
const port = process.env.PORT || 3101;

app.use(cors());
app.use(express.json());

const budgetManager = new PrivacyBudgetManager();
const attackDetector = new AttackDetector();
const gdprCompliance = new GDPRCompliance();
const syntheticGenerator = new SyntheticDataGenerator();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'privacy-service' });
});

// Initialize privacy budget
app.post('/api/budgets', (req, res) => {
  try {
    const { budgetId, epsilon, delta, composition } = req.body;
    const budget = budgetManager.initializeBudget(budgetId, epsilon, delta, composition);
    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Consume privacy budget
app.post('/api/budgets/:budgetId/consume', (req, res) => {
  try {
    const { budgetId } = req.params;
    const { epsilon, delta, operation } = req.body;
    const result = budgetManager.consumeBudget(budgetId, epsilon, delta, operation);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget status
app.get('/api/budgets/:budgetId', (req, res) => {
  try {
    const { budgetId } = req.params;
    const status = budgetManager.getBudgetStatus(budgetId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze budget
app.get('/api/budgets/:budgetId/analysis', (req, res) => {
  try {
    const { budgetId } = req.params;
    const analysis = budgetManager.analyzeBudget(budgetId);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Audit privacy
app.post('/api/budgets/:budgetId/audit', (req, res) => {
  try {
    const { budgetId } = req.params;
    const { maxEpsilon, maxDelta } = req.body;
    const audit = budgetManager.auditPrivacy(budgetId, maxEpsilon, maxDelta);
    res.json(audit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detect membership inference attack
app.post('/api/attacks/membership-inference', (req, res) => {
  try {
    const { model, trainingLosses, testLosses, threshold } = req.body;
    const result = attackDetector.detectMembershipInference(
      model,
      trainingLosses,
      testLosses,
      threshold
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detect model inversion attack
app.post('/api/attacks/model-inversion', (req, res) => {
  try {
    const { reconstructedSamples, originalSamples, threshold } = req.body;
    const result = attackDetector.detectModelInversion(
      reconstructedSamples,
      originalSamples,
      threshold
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate synthetic data
app.post('/api/synthetic/generate', (req, res) => {
  try {
    const { data, epsilon, numSamples } = req.body;
    const synthetic = syntheticGenerator.generateSynthetic(data, epsilon, numSamples);
    res.json({ synthetic });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GDPR: Handle access request
app.post('/api/gdpr/access-request', async (req, res) => {
  try {
    const { subjectId } = req.body;
    const request = await gdprCompliance.handleAccessRequest(subjectId);
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GDPR: Handle erasure request
app.post('/api/gdpr/erasure-request', async (req, res) => {
  try {
    const { subjectId } = req.body;
    const request = await gdprCompliance.handleErasureRequest(subjectId);
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GDPR: Conduct PIA
app.post('/api/gdpr/pia', async (req, res) => {
  try {
    const { processingActivity, risks } = req.body;
    const assessment = await gdprCompliance.conductPIA(processingActivity, risks);
    res.json(assessment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GDPR: Compliance report
app.get('/api/gdpr/report', (req, res) => {
  try {
    const report = gdprCompliance.generateComplianceReport();
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Privacy service listening on port ${port}`);
});

export default app;
