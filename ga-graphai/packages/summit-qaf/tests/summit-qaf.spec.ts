import { describe, expect, it } from 'vitest';
import { AgentFactory } from '../src/agent-factory.js';
import { PkiManager } from '../src/pki.js';

describe('PkiManager', () => {
  it('issues and verifies mTLS certificates', () => {
    const pki = new PkiManager('summit-qaf-ca');
    const client = pki.issueCertificate('client', 60);
    const server = pki.issueCertificate('server', 60);

    expect(pki.verifyCertificate(client.certificate).valid).toBe(true);
    expect(pki.verifyCertificate(server.certificate).valid).toBe(true);

    const mtls = pki.mutualTlsHandshake(client.certificate, server.certificate);
    expect(mtls.allowed).toBe(true);

    pki.revokeCertificate(client.certificate.id, 'compromised');
    const failed = pki.mutualTlsHandshake(
      client.certificate,
      server.certificate,
    );
    expect(failed.allowed).toBe(false);
    expect(failed.reasons.some((reason) => reason.includes('revoked'))).toBe(
      true,
    );
  });
});

describe('AgentFactory', () => {
  it('spawns agents with enforced controls and ROI tracking', () => {
    const factory = new AgentFactory('summit-qaf');
    const agent = factory.spawnAgent({
      name: 'reviewer',
      role: 'review',
      tenantId: 'tenant-a',
      capabilities: ['code-review'],
      allowedActions: ['review-pr', 'lint'],
      tags: ['secure'],
    });

    const allowed = agent.performAction({
      name: 'review-pr',
      durationMs: 45_000,
      contextSwitches: 1,
      defectsFound: 0,
    });
    expect(allowed.allowed).toBe(true);

    const denied = agent.performAction({ name: 'deploy' });
    expect(denied.allowed).toBe(false);
    expect(denied.reasons.some((reason) => reason.includes('not permitted'))).toBe(
      true,
    );

    const roi = factory.roiDashboard.summarize();
    expect(roi.actionsTracked).toBe(1);
    expect(roi.velocityGain).toBeGreaterThan(0);
  });

  it('produces compliance reports with security and ROI evidence', () => {
    const factory = new AgentFactory('summit-qaf');
    const agent = factory.spawnAgent({
      name: 'deployer',
      role: 'deploy',
      tenantId: 'tenant-a',
      capabilities: ['deploy'],
      allowedActions: ['deploy'],
      minimumAssurance: 0.9,
    });

    agent.performAction({
      name: 'deploy',
      durationMs: 35_000,
      contextSwitches: 1,
      defectsFound: 0,
    });

    const report = factory.generateComplianceReport();
    const mtls = report.checks.find((check) => check.name === 'mTLS-enforced');
    const roi = report.checks.find((check) => check.name === 'roi-telemetry');
    const controls = report.checks.find(
      (check) => check.name === 'security-controls-coverage',
    );

    expect(mtls?.passed).toBe(true);
    expect(roi?.passed).toBe(true);
    expect(controls?.passed).toBe(true);
  });
});
