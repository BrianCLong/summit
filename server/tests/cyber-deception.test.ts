
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { CyberDeceptionService } from '../src/services/CyberDeceptionService.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Cyber Deception Platform', () => {
  let app: any;
  let createApp: typeof import('../src/app.js').createApp;

  beforeAll(async () => {
    ({ createApp } = await import('../src/app.js'));
    app = await createApp();
  });

  // Helper to get service instance
  const getService = () => CyberDeceptionService.getInstance();

  it('should register a new honeypot', async () => {
    const res = await request(app)
      .post('/api/deception/honeypots')
      .send({
        name: 'test-honeypot-1',
        type: 'SSH',
        location: 'us-east-1'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.config.name).toBe('test-honeypot-1');
    expect(getService().getHoneypot(res.body.id)).toBeDefined();
  });

  it('should generate a honeytoken', async () => {
    const res = await request(app)
      .post('/api/deception/tokens')
      .send({
        type: 'API_KEY',
        context: 'github-repo-leak'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tokenValue');
    expect(res.body.tokenValue).toContain('sk-live-');
  });

  it('should record an interaction event', async () => {
    // First create a honeypot
    const hpRes = await request(app)
      .post('/api/deception/honeypots')
      .send({ name: 'event-test-hp', type: 'HTTP', location: 'eu-west-1' });

    const honeypotId = hpRes.body.id;

    // Trigger event
    const eventRes = await request(app)
      .post('/api/deception/events')
      .send({
        type: 'HONEYPOT_TRIGGER',
        targetId: honeypotId,
        sourceIp: '192.168.1.100',
        metadata: {
          userAgent: 'Mozilla/5.0',
          duration: 120 // 2 minutes
        }
      });

    expect(eventRes.status).toBe(201);
    expect(eventRes.body.type).toBe('HONEYPOT_TRIGGER');
    expect(eventRes.body.sourceIp).toBe('192.168.1.100');
    // Check attribution
    expect(eventRes.body.metadata.fingerprintScore).toBeDefined();
  });

  it('should retrieve intelligence stats', async () => {
    const res = await request(app).get('/api/deception/intelligence');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeHoneypots');
    expect(res.body.totalEvents).toBeGreaterThanOrEqual(1);
  });
});
