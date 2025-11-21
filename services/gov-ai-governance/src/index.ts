/**
 * Government AI Governance Service
 *
 * Open source, auditable AI modules for government services.
 * Guarantees privacy, compliance, and ethical standards.
 * Provides citizens with full transparency and control over their data.
 *
 * @license Apache-2.0
 *
 * Core Principles:
 * 1. TRANSPARENCY - All AI decisions are explainable and auditable
 * 2. CITIZEN CONTROL - Full data access, portability, and deletion rights
 * 3. ETHICAL AI - Mandatory bias assessment and ethical review
 * 4. COMPLIANCE - Built-in support for NIST AI RMF, EU AI Act, EO 14110
 * 5. AUDITABILITY - Immutable, hash-chained audit trail
 */

import express, { Request, Response, NextFunction } from 'express';
import { CitizenDataControl } from './citizen-data-control.js';
import { EthicalAIRegistry } from './ethical-ai-registry.js';
import { TransparencyService } from './transparency-service.js';
import {
  CitizenConsentSchema,
  DataAccessRequestSchema,
  AIModelRegistrationSchema,
  AIDecisionSchema,
} from './types.js';

export * from './types.js';
export { CitizenDataControl } from './citizen-data-control.js';
export { EthicalAIRegistry } from './ethical-ai-registry.js';
export { TransparencyService } from './transparency-service.js';

const app = express();
app.use(express.json());

// Initialize services
const citizenDataControl = new CitizenDataControl();
const ethicalRegistry = new EthicalAIRegistry();
const transparencyService = new TransparencyService({ agency: process.env.AGENCY_NAME ?? 'Government Agency' });

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'gov-ai-governance', version: '1.0.0' });
});

// ============================================================================
// Citizen Data Control Endpoints
// ============================================================================

app.post('/citizen/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consent = CitizenConsentSchema.omit({ consentTimestamp: true }).parse(req.body);
    const result = await citizenDataControl.grantConsent(consent);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete('/citizen/:citizenId/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { citizenId } = req.params;
    const { dataCategories, purposes } = req.body;
    const success = await citizenDataControl.withdrawConsent(citizenId, dataCategories, purposes);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

app.get('/citizen/:citizenId/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consents = await citizenDataControl.getConsents(req.params.citizenId);
    res.json(consents);
  } catch (error) {
    next(error);
  }
});

app.post('/citizen/data-request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = DataAccessRequestSchema.omit({
      requestId: true,
      submittedAt: true,
      status: true,
    }).parse(req.body);
    const result = await citizenDataControl.submitAccessRequest(request);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/citizen/:citizenId/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await citizenDataControl.exportCitizenData(req.params.citizenId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AI Model Registry Endpoints
// ============================================================================

app.post('/models/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registration = AIModelRegistrationSchema.omit({
      modelId: true,
      registeredAt: true,
    }).parse(req.body);
    const result = await ethicalRegistry.registerModel(registration);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await ethicalRegistry.listModels({
      riskLevel: req.query.riskLevel as string,
      deploymentEnvironment: req.query.environment as string,
    });
    res.json(models);
  } catch (error) {
    next(error);
  }
});

app.get('/models/:modelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const model = await ethicalRegistry.getModel(req.params.modelId);
    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }
    res.json(model);
  } catch (error) {
    next(error);
  }
});

app.post('/models/:modelId/deploy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { environment } = req.body;
    const result = await ethicalRegistry.deployModel(req.params.modelId, environment);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/compliance/standards', (_req: Request, res: Response) => {
  res.json(ethicalRegistry.getStandards());
});

// ============================================================================
// Transparency Endpoints
// ============================================================================

app.post('/decisions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = AIDecisionSchema.omit({
      decisionId: true,
      madeAt: true,
    }).parse(req.body);
    const result = await transparencyService.recordDecision(decision);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/decisions/:decisionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await transparencyService.getDecision(req.params.decisionId);
    if (!decision) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }
    res.json(decision);
  } catch (error) {
    next(error);
  }
});

app.get('/decisions/:decisionId/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const explanation = await transparencyService.getDecisionExplanation(req.params.decisionId);
    if (!explanation) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }
    res.json(explanation);
  } catch (error) {
    next(error);
  }
});

app.post('/decisions/:decisionId/appeal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { citizenId, grounds } = req.body;
    const result = await transparencyService.fileAppeal(req.params.decisionId, citizenId, grounds);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/transparency/reports', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await transparencyService.getPublishedReports();
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

app.post('/transparency/reports/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodStart, periodEnd } = req.body;
    const report = await transparencyService.generateReport(
      new Date(periodStart),
      new Date(periodEnd),
    );
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

app.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await transparencyService.queryAuditTrail({
      eventType: req.query.eventType as string,
      actorId: req.query.actorId as string,
      resourceId: req.query.resourceId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.get('/audit/verify', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const integrity = await transparencyService.verifyAuditIntegrity();
    res.json(integrity);
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err.message });
});

const PORT = process.env.PORT ?? 3100;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Gov AI Governance Service running on port ${PORT}`);
  });
}

export { app };
