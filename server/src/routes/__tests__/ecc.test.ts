import express from 'express';
import request from 'supertest';
import eccRouter from '../ecc.js';

describe('Emergency Containment Controller API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', eccRouter);

  let lastActionId: string | undefined;

  it('executes a kill plan, drains traffic, and quarantines artifacts', async () => {
    const response = await request(app).post('/api/ecc/actions').send({
      initiatedBy: 'sec-ops',
      slaMs: 750,
      reason: 'test incident',
      models: ['gpt-4-turbo'],
      tools: ['graph-search'],
      routes: ['/api/ai/completions'],
      artifacts: ['artifact-123'],
      policy: {
        blocklist: ['graph-search'],
        cachePurge: ['/cache/ai/completions'],
      },
    });

    expect(response.status).toBe(202);
    expect(response.body.ok).toBe(true);
    expect(typeof response.body.actionId).toBe('string');
    expect(response.body.signature).toHaveLength(64);
    expect(response.body.slaMet).toBe(true);

    const actions = (response.body.timeline as Array<{ action: string }>).map((entry) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'action_initiated',
        'targets_disabled',
        'traffic_drained',
        'artifacts_quarantined',
        'compensating_policy_applied',
        'containment_completed',
      ]),
    );

    lastActionId = response.body.actionId;

    const status = await request(app).get('/api/ecc/status');
    expect(status.status).toBe(200);
    expect(status.body.ok).toBe(true);
    expect(status.body.status.disabled.models).toContain('gpt-4-turbo');
    expect(status.body.status.disabled.tools).toContain('graph-search');
    expect(status.body.status.quarantinedArtifacts).toContain('artifact-123');
    expect(status.body.status.blocklist).toContain('graph-search');
    expect(status.body.status.cachePurges).toContain('/cache/ai/completions');

    const validation = await request(app).post('/api/ecc/validate').send({ type: 'artifact', name: 'artifact-123' });
    expect(validation.status).toBe(200);
    expect(validation.body.allowed).toBe(false);
    expect(validation.body.reason).toBe('quarantined_artifact');

    const routeValidation = await request(app)
      .post('/api/ecc/validate')
      .send({ type: 'route', name: '/api/ai/completions' });
    expect(routeValidation.body.allowed).toBe(false);
    expect(routeValidation.body.reason).toBe('disabled_route');
  });

  it('rolls back the containment plan and restores state deterministically', async () => {
    expect(lastActionId).toBeDefined();

    const rollback = await request(app)
      .post('/api/ecc/rollback')
      .send({ actionId: lastActionId, initiatedBy: 'unit-test' });

    expect(rollback.status).toBe(200);
    expect(rollback.body.ok).toBe(true);
    expect(rollback.body.timeline.map((entry: { action: string }) => entry.action)).toContain('rollback_completed');
    expect(rollback.body.restoredState.disabled.models).toHaveLength(0);
    expect(rollback.body.restoredState.quarantinedArtifacts).toHaveLength(0);

    const postStatus = await request(app).get('/api/ecc/status');
    expect(postStatus.body.status.disabled.models).toHaveLength(0);
    expect(postStatus.body.status.disabled.tools).toHaveLength(0);
    expect(postStatus.body.status.quarantinedArtifacts).toHaveLength(0);

    const validation = await request(app)
      .post('/api/ecc/validate')
      .send({ type: 'route', name: '/api/ai/completions' });
    expect(validation.body.allowed).toBe(true);
  });
});

