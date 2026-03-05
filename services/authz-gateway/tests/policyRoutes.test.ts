import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { resetAuditLog } from '../src/audit';

describe('policy routes', () => {
  afterAll(async () => {
    await stopObservability();
  });

  beforeEach(() => {
    resetAuditLog();
  });

  it('simulates a policy decision via dry-run', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/policy/dry-run')
      .send({
        user: {
          sub: 'carol',
          tenantId: 'tenantA',
          roles: ['compliance'],
          clearance: 'confidential',
          status: 'active',
        },
        resource: { path: '/protected/investigation', tenantId: 'tenantB' },
        action: 'read',
        purpose: 'investigation',
        authority: 'fraud-investigation',
        record: { subject: { name: 'Carol White', ssn: '111-22-3333' } },
      });
    expect(res.status).toBe(200);
    expect(res.body.policyId).toBe('policy.compliance-override');
    expect(res.body.fields['subject.ssn']).toEqual({
      before: '111-22-3333',
      after: '[REDACTED]',
      effect: 'redact',
    });
  });

  it('returns stored audit decision by id', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const denied = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantB')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    const auditId = denied.headers['x-audit-id'];
    const auditRes = await request(app).get(`/audit/${auditId}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.id).toBe(auditId);
    expect(auditRes.body.decision.policyId).toBe('policy.tenant-isolation');
  });
});
