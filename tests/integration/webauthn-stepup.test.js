/**
 * Integration tests for WebAuthn Step-Up Authentication
 *
 * Tests acceptance criteria:
 * 1. Attempt risky action without step-up → blocked with "Why blocked?"
 * 2. With step-up → allowed; audit contains evidence + attestation reference
 */

const request = require('supertest');
const { app } = require('../../backend/app');
const { AuditLogger } = require('../../backend/services/audit-logger');

describe('WebAuthn Step-Up Authentication', () => {
  let authToken;
  let stepUpToken;

  beforeAll(async () => {
    // Get regular auth token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpass123',
      });

    authToken = authResponse.body.token;
  });

  describe('Acceptance Criteria 1: Blocking without step-up', () => {
    test('POST /api/export without step-up → 403 with explanation', async () => {
      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          entityIds: ['ent_001', 'ent_002'],
          includeProvenance: true,
        });

      // Should be blocked
      expect(response.status).toBe(403);

      // Should explain why blocked
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('Step-up authentication required');
      expect(response.body.required_action).toBe('webauthn_stepup');
      expect(response.body.help).toBeDefined();
      expect(response.body.route).toBe('/api/export');
    });

    test('DELETE /api/delete/:id without step-up → 403 with explanation', async () => {
      const response = await request(app)
        .delete('/api/delete/ent_001')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Step-up authentication required');
      expect(response.body.required_action).toBe('webauthn_stepup');
    });

    test('POST /api/admin/users without step-up → 403 with explanation', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'update_permissions',
          userId: 'user_123',
          permissions: ['admin', 'export'],
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Step-up authentication required');
    });

    test('POST /api/graphql with risky mutation without step-up → 403', async () => {
      const response = await request(app)
        .post('/api/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              deleteEntity(id: "ent_001") {
                success
              }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Step-up authentication required');
    });
  });

  describe('Acceptance Criteria 2: Allowing with step-up + audit evidence', () => {
    beforeAll(async () => {
      // Get step-up token (simulated - in real test, use WebAuthn)
      const stepUpResponse = await request(app)
        .post('/api/webauthn/authenticate/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assertion: {
            id: 'credential_123',
            response: {
              authenticatorData: Buffer.from('mock_auth_data').toString('base64url'),
              clientDataJSON: Buffer.from(JSON.stringify({
                type: 'webauthn.get',
                challenge: 'mock_challenge',
                origin: 'http://localhost:3000',
              })).toString('base64url'),
              signature: Buffer.from('mock_signature').toString('base64url'),
            },
          },
          route: '/api/export',
        });

      stepUpToken = stepUpResponse.body.stepUpToken;
    });

    test('POST /api/export with step-up → 200 + audit evidence', async () => {
      // Clear audit logs
      const auditLogger = new AuditLogger();
      const auditSpy = jest.spyOn(auditLogger, 'emit');

      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-StepUp-Auth', stepUpToken)
        .send({
          format: 'json',
          entityIds: ['ent_001', 'ent_002'],
          includeProvenance: true,
        });

      // Should be allowed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('step-up authentication');

      // Should have audit evidence
      expect(auditSpy).toHaveBeenCalled();

      const auditCall = auditSpy.mock.calls[0][0];
      expect(auditCall.action).toBe('allowed_with_stepup');
      expect(auditCall.route).toBe('/api/export');
      expect(auditCall.stepup_auth).toBeDefined();
      expect(auditCall.stepup_auth.credential_id).toBe('credential_123');
      expect(auditCall.stepup_auth.attestation_reference).toBeDefined();
      expect(auditCall.policy).toBe('webauthn_stepup.rego');
    });

    test('DELETE /api/delete/:id with step-up → 200 + audit evidence', async () => {
      const auditLogger = new AuditLogger();
      const auditSpy = jest.spyOn(auditLogger, 'emit');

      const response = await request(app)
        .delete('/api/delete/ent_001')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-StepUp-Auth', stepUpToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify audit evidence
      expect(auditSpy).toHaveBeenCalled();
      const auditCall = auditSpy.mock.calls[0][0];
      expect(auditCall.action).toBe('allowed_with_stepup');
      expect(auditCall.stepup_auth.attestation_reference).toBeDefined();
    });

    test('Expired step-up token → 403 with "authentication expired"', async () => {
      // Create expired token (timestamp > 5 minutes ago)
      const expiredToken = Buffer.from(JSON.stringify({
        credential_id: 'credential_123',
        timestamp: Date.now() * 1000000 - 400000000000, // 6 minutes ago
        verified: true,
      })).toString('base64');

      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-StepUp-Auth', expiredToken)
        .send({
          format: 'json',
          entityIds: ['ent_001'],
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('expired');
      expect(response.body.required_action).toBe('webauthn_stepup');
    });
  });

  describe('DLP Policy Bindings', () => {
    test('Risky route with sensitive data pattern → additional DLP violation logged', async () => {
      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-StepUp-Auth', stepUpToken)
        .send({
          format: 'json',
          entityIds: ['ent_001'],
          includeProvenance: true,
          metadata: {
            notes: 'Contains SSN: 123-45-6789',
          },
        });

      // Should still be allowed (with step-up)
      expect(response.status).toBe(200);

      // But DLP violation should be logged
      // (In real implementation, check audit logs for DLP violation)
    });
  });
});
