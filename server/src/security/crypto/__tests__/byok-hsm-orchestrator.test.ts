import crypto from 'node:crypto';
import {
  ByokHsmOrchestrator,
  type CustomerManagedKey,
} from '../byok-hsm-orchestrator.js';
import { InMemoryKeyStore } from '../keyStore.js';
import { SoftwareHSM } from '../services.js';
import type { CryptoAuditEvent } from '../types.js';

class InMemoryAuditLogger {
  public readonly events: CryptoAuditEvent[] = [];

  async log(event: CryptoAuditEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('ByokHsmOrchestrator', () => {
  const baseRegistration = (): CustomerManagedKey => {
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    return {
      tenantId: 'tenant-a',
      keyId: 'tenant-a-key',
      provider: 'aws-kms',
      algorithm: 'RSA_SHA256',
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      rotationIntervalHours: 24,
      metadata: { kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/example' },
    };
  };

  const buildOrchestrator = (auditLogger: InMemoryAuditLogger) =>
    new ByokHsmOrchestrator({
      keyStore: new InMemoryKeyStore(),
      hsm: new SoftwareHSM(),
      auditLogger,
    });

  it('wraps tenant data with customer-managed keys and records audits', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const orchestrator = buildOrchestrator(auditLogger);
    await orchestrator.registerCustomerManagedKey(baseRegistration());

    const envelope = await orchestrator.encryptForTenant(
      'tenant-a',
      'tenant-a-key',
      'sensitive payload',
      { label: 'pii' },
    );

    expect(envelope.kmsProvider).toBe('aws-kms');
    expect(envelope.wrapAuthTag).toBeDefined();
    expect(envelope.wrappedDataKey).toBeDefined();
    expect(envelope.authTag).toHaveLength(24);
    expect(auditLogger.events.find((event) => event.action === 'sign')).toBeDefined();
  });

  it('enforces zero-trust guardrails before rotating keys', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const orchestrator = buildOrchestrator(auditLogger);
    const registration = await orchestrator.registerCustomerManagedKey(
      baseRegistration(),
    );

    const rotated = await orchestrator.rotateKeyWithZeroTrust('tenant-a-key', {
      algorithm: 'RSA_SHA256',
      publicKeyPem: registration.publicKeyPem,
      guardrails: {
        approvals: [
          { actor: 'security', reason: 'scheduled-rotation' },
          { actor: 'sre', reason: 'mfa-confirmed' },
        ],
        attestationToken: 'attestation-token-123456789',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        changeTicket: 'SEC-1234',
      },
      metadata: { scope: 'byok-rotation' },
    });

    expect(rotated.version).toBe(2);
    expect(rotated.metadata?.guardrails).toBeDefined();
    expect(
      auditLogger.events.filter((event) => event.action === 'rotate').length,
    ).toBe(2); // initial registration + zero-trust rotation
  });

  it('flags missing approvals and overdue rotations', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const orchestrator = buildOrchestrator(auditLogger);
    await orchestrator.registerCustomerManagedKey(baseRegistration());

    await expect(
      orchestrator.rotateKeyWithZeroTrust('tenant-a-key', {
        algorithm: 'RSA_SHA256',
        publicKeyPem: baseRegistration().publicKeyPem,
        guardrails: {
          approvals: [{ actor: 'security' }],
          attestationToken: 'token-000000000000',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      }),
    ).rejects.toThrow('At least two approvals are required for rotation');

    const due = await orchestrator.getRotationReadiness(
      'tenant-a-key',
      new Date(Date.now() + 23 * 60 * 60 * 1000),
    );
    expect(due.status).toBe('due');

    const overdue = await orchestrator.getRotationReadiness(
      'tenant-a-key',
      new Date(Date.now() + 26 * 60 * 60 * 1000),
    );
    expect(overdue.status).toBe('overdue');
  });
});
