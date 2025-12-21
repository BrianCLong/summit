import express from 'express';
import request from 'supertest';
import { createSelfServeRouter } from '../../routes/self-serve-evals.js';
import { AnalyticsService } from '../analyticsService.js';
import { CertificationService } from '../certificationService.js';
import { ControlPlane } from '../controlPlane.js';
import { SelfServeEvaluationService } from '../evaluationService.js';

const buildApp = () => {
  const analytics = new AnalyticsService();
  const controlPlane = new ControlPlane();
  const certification = new CertificationService();
  const evaluation = new SelfServeEvaluationService(controlPlane, analytics, certification);
  const app = express();
  app.use('/api/self-serve', createSelfServeRouter({ evaluationService: evaluation, analyticsService: analytics, certificationService: certification }));
  return { app, analytics, evaluation, controlPlane };
};

describe('Self-serve evaluation flow', () => {
  it('provisions, runs, reports, and deprovisions an evaluation with analytics', async () => {
    const { app, analytics } = buildApp();

    const createResponse = await request(app)
      .post('/api/self-serve/evaluations')
      .send({
        tenantName: 'Acme Co',
        email: 'owner@acme.test',
        useCase: 'fraud detection',
        connectors: ['demo-db'],
        deploymentProfile: 'saas',
      })
      .expect(201);

    const evaluationId = createResponse.body.evaluationId;
    expect(createResponse.body.environment.sandboxed).toBe(true);

    const runResponse = await request(app)
      .post(`/api/self-serve/evaluations/${evaluationId}/run`)
      .send({ scenario: 'fraud graph pathing' })
      .expect(200);

    expect(runResponse.body.evaluationId).toBe(evaluationId);
    expect(runResponse.body.guidedSuggestions.length).toBeGreaterThan(0);
    expect(runResponse.body.successProbability).toBeGreaterThan(0.7);

    const reportResponse = await request(app).get(`/api/self-serve/evaluations/${evaluationId}/report`).expect(200);
    expect(reportResponse.body.latencyP95Ms).toBeGreaterThan(0);

    const analyticsResponse = await request(app).get('/api/self-serve/analytics/funnel').expect(200);
    expect(analyticsResponse.body.stages['report-ready']).toBe(1);
    expect(analytics.getFunnelMetrics().completionRate).toBeGreaterThan(0);

    const deprovisionResponse = await request(app)
      .post(`/api/self-serve/evaluations/${evaluationId}/deprovision`)
      .expect(200);

    expect(deprovisionResponse.body.status).toBe('deprovisioned');
  });

  it('enforces quotas on repeated runs', async () => {
    const { app } = buildApp();
    const createResponse = await request(app)
      .post('/api/self-serve/evaluations')
      .send({
        tenantName: 'Quota Co',
        email: 'quota@co.test',
        useCase: 'throughput',
        connectors: ['demo-db'],
        deploymentProfile: 'saas',
        quotaOverride: { maxEvaluations: 1 },
      })
      .expect(201);

    const evaluationId = createResponse.body.evaluationId;
    await request(app).post(`/api/self-serve/evaluations/${evaluationId}/run`).send({ scenario: 'first' }).expect(200);

    const second = await request(app)
      .post(`/api/self-serve/evaluations/${evaluationId}/run`)
      .send({ scenario: 'second' })
      .expect(400);

    expect(second.body.error).toContain('quota');
  });

  it('certifies connectors and deployment profiles', async () => {
    const { app } = buildApp();
    const connectorsResponse = await request(app)
      .post('/api/self-serve/certifications/connectors')
      .send({
        connectors: [
          { name: 'postgres', version: '1.2.3', capabilities: ['ingest', 'query'], signedBy: 'security' },
          { name: 'legacy', version: '1.0', capabilities: ['ingest'], signedBy: '' },
        ],
      })
      .expect(200);

    const [good, bad] = connectorsResponse.body.results;
    expect(good.passed).toBe(true);
    expect(bad.passed).toBe(false);
    expect(bad.issues.length).toBeGreaterThan(0);

    const deploymentResponse = await request(app)
      .post('/api/self-serve/certifications/deployments')
      .send({
        profile: {
          name: 'vpc-eval',
          isolation: 'vpc',
          controls: {
            rateLimitPerMinute: 120,
            auditEnabled: true,
            sandboxed: true,
            encryptedAtRest: true,
          },
          supportedRegions: ['us-east-1'],
        },
      })
      .expect(200);

    expect(deploymentResponse.body.passed).toBe(true);
  });
});
