import express from 'express';
import rateLimit from 'express-rate-limit';
import { AnalyticsService } from '../self-serve/analyticsService.js';
import { CertificationService } from '../self-serve/certificationService.js';
import { ControlPlane } from '../self-serve/controlPlane.js';
import { SelfServeEvaluationService } from '../self-serve/evaluationService.js';
import { DeploymentProfile, EvaluationRequest } from '../self-serve/types.js';

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const analyticsService = new AnalyticsService();
export const controlPlane = new ControlPlane();
export const certificationService = new CertificationService();
export const evaluationService = new SelfServeEvaluationService(controlPlane, analyticsService, certificationService);

type RouterDeps = {
  evaluationService?: SelfServeEvaluationService;
  analyticsService?: AnalyticsService;
  certificationService?: CertificationService;
};

export const createSelfServeRouter = (deps: RouterDeps = {}) => {
  const router = express.Router();
  router.use(express.json());
  router.use(limiter);

  const evaluationSvc = deps.evaluationService ?? evaluationService;
  const analytics = deps.analyticsService ?? analyticsService;
  const certification = deps.certificationService ?? certificationService;

  router.post('/evaluations', (req, res) => {
    const payload = req.body as EvaluationRequest;
    try {
      const evaluation = evaluationSvc.requestEvaluation(payload);
      res.status(201).json({
        evaluationId: evaluation.id,
        tenantId: evaluation.tenantId,
        environment: evaluation.environment,
        status: evaluation.status,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.post('/evaluations/:id/run', (req, res) => {
    try {
      const report = evaluationSvc.runDemo(req.params.id, req.body?.scenario ?? 'default demo');
      res.status(200).json(report);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.get('/evaluations/:id/report', (req, res) => {
    try {
      const report = evaluationSvc.getReport(req.params.id);
      res.status(200).json(report);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  router.post('/evaluations/:id/deprovision', (req, res) => {
    try {
      const updated = evaluationSvc.deprovision(req.params.id);
      res.status(200).json({ status: updated.status, expiresAt: updated.environment.expiresAt });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.post('/certifications/connectors', (req, res) => {
    try {
      const connectors = req.body?.connectors ?? [];
      const results = certification.certifyConnectors(connectors);
      res.status(200).json({ results });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.post('/certifications/deployments', (req, res) => {
    try {
      const profile = req.body?.profile as DeploymentProfile;
      const result = certification.certifyDeploymentProfile(profile);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.get('/analytics/funnel', (_req, res) => {
    res.status(200).json(analytics.getFunnelMetrics());
  });

  return router;
};

const selfServeRouter = createSelfServeRouter();
export default selfServeRouter;
