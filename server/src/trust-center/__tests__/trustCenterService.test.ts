import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { TrustCenterService, ControlCheck } from '../service';

describe('TrustCenterService', () => {
  const baselineEvidence = {
    id: 'evidence-1',
    name: 'SOC2 summary',
    type: 'soc2',
    accessTier: 'enterprise' as const,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };

  it('publishes versioned trust pages with change logs and transparency data', () => {
    const service = new TrustCenterService();
    const pageV1 = service.publishPage({
      id: 'security-page',
      scope: 'security',
      content: 'Initial security posture',
      changeLog: ['created'],
      uptime: 99.99,
      incidentCadence: 'real-time',
      dataResidency: 'us-only',
      retentionPosture: '90-days',
      aiTransparency: 'no training on customer data',
    });

    const pageV2 = service.publishPage({
      id: 'security-page',
      scope: 'security',
      content: 'Added vuln SLA',
      changeLog: ['added vuln SLA'],
      uptime: 99.995,
      incidentCadence: 'real-time',
      dataResidency: 'us-only',
      retentionPosture: '90-days',
      aiTransparency: 'no training on customer data',
    });

    expect(pageV1.version).toBe(1);
    expect(pageV2.version).toBe(2);
    expect(service.listPages('security')).toHaveLength(2);
    expect(pageV2.changeLog).toContain('added vuln SLA');
  });

  it('maps claims to evidence, detects drift from control failures, and gates approvals', () => {
    const service = new TrustCenterService();
    service.registerEvidence(baselineEvidence);
    service.registerClaim({
      id: 'claim-1',
      statement: 'SSO and MFA enforced for admin tools',
      evidenceIds: ['evidence-1'],
      owner: 'security-team',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    expect(() =>
      service.addQuestionnaireAnswer({
        id: 'answer-high-risk',
        question: 'Do you enforce MFA?',
        answer: 'Yes, enforced for all admins',
        tier: 'deep',
        exportProfiles: ['CAIQ'],
        risk: 'high',
        evidencePointers: ['evidence-1'],
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      }),
    ).toThrow('High-risk answers require approval or a documented deviation.');

    service.addQuestionnaireAnswer({
      id: 'answer-1',
      question: 'Do you enforce MFA?',
      answer: 'Yes, enforced for all admins',
      tier: 'standard',
      exportProfiles: ['SIG-Lite'],
      risk: 'medium',
      evidencePointers: ['evidence-1'],
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const approved = service.approveAnswer('answer-1', 'ciso');
    expect(approved.approvedBy).toBe('ciso');

    const control: ControlCheck = {
      id: 'control-mfa',
      name: 'MFA enforced',
      status: 'fail',
      severity: 'critical',
      signals: ['mfa-disabled-alert'],
      reviewedAt: new Date(),
    };

    const recorded = service.recordControlResult({
      ...control,
      relatedClaims: ['claim-1'],
      relatedAnswers: ['answer-1'],
    });

    expect(recorded.status).toBe('fail');
    const [claim] = service['claims'];
    expect(claim.status).toBe('drifted');
    const [answer] = service['answers'];
    expect(answer.deviation?.justification).toContain('Auto-detected drift');
  });

  it('auto-revokes JIT elevations during access reviews and produces immutable audit manifests', () => {
    const service = new TrustCenterService();
    service.scheduleAccessElevation({
      userId: 'alice',
      role: 'admin',
      expiresAt: new Date(Date.now() - 1000),
      active: true,
    });

    const review = service.completeAccessReview({
      id: 'review-1',
      reviewer: 'security-ops',
      completedAt: new Date(),
      autoRevoked: [],
    });

    expect(review.autoRevoked).toContain('alice:admin');

    const revoked = service.autoRevokeElevations();
    expect(revoked).toHaveLength(1);

    const audit = service.exportAuditLog('customer-export', ['entry-1', 'entry-2']);
    expect(audit.manifestHash).toHaveLength(64);
  });

  it('manages privacy controls, procurement packets, and produces a scorecard', () => {
    const service = new TrustCenterService();
    service.registerEvidence(baselineEvidence);
    service.addQuestionnaireAnswer({
      id: 'answer-2',
      question: 'Do you delete data on termination?',
      answer: 'Yes, within 30 days',
      tier: 'lite',
      exportProfiles: ['spreadsheet'],
      risk: 'low',
      evidencePointers: ['evidence-1'],
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    service.upsertPrivacyControl({
      id: 'retention-engine',
      control: 'Verified deletion engine',
      status: 'healthy',
      evidence: 'retention-logs',
      lastDrillAt: new Date(),
    });

    service.upsertProcurementPacket({
      id: 'enterprise-pack',
      riders: ['security rider'],
      dpaVersion: 'v1',
      fastLaneSlaDays: 3,
      blockers: ['awaiting customer data mapping'],
    });

    const scorecard = service.generateScorecard();
    expect(scorecard.operational.controlPassRate).toBe(100);
    expect(scorecard.governance.answerDeviations).toBe(0);
    expect(scorecard.commercial.trustPackets).toBe(1);
    expect(scorecard.quality.sbomCoverage).toBe(100);
  });
});
