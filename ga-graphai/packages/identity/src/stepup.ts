import { createVerify, randomBytes } from 'node:crypto';
import type { AuditLogEvent } from 'common-types';
import { AuditBus } from './audit.js';
import type { IdentityUser, StepUpChallenge } from './types.js';

export interface StepUpAssertion {
  challenge: string;
  signature: string;
}

export class StepUpManager {
  private readonly audit: AuditBus;
  private readonly challenges = new Map<string, StepUpChallenge>();

  constructor(audit: AuditBus) {
    this.audit = audit;
  }

  issueChallenge(user: IdentityUser, action: string): StepUpChallenge {
    const challenge = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const record: StepUpChallenge = {
      action,
      challenge,
      userId: user.id,
      tenantId: user.tenantId,
      createdAt: Date.now(),
      expiresAt,
    };
    this.challenges.set(challenge, record);
    this.audit.emit(this.auditEvent('step_up_required', user, action));
    return record;
  }

  verifyAssertion(user: IdentityUser, action: string, assertion: StepUpAssertion): boolean {
    const record = this.challenges.get(assertion.challenge);
    if (!record) {
      throw new Error('Unknown challenge');
    }
    if (record.expiresAt < Date.now()) {
      this.challenges.delete(assertion.challenge);
      throw new Error('Step-up challenge expired');
    }
    if (record.userId !== user.id || record.action !== action) {
      throw new Error('Challenge does not match action or user');
    }
    if (!user.webAuthnPublicKey) {
      throw new Error('No registered WebAuthn credential');
    }

    const verifier = createVerify('SHA256');
    verifier.update(assertion.challenge);
    verifier.end();

    const ok = verifier.verify(user.webAuthnPublicKey, assertion.signature, 'base64');
    if (!ok) {
      throw new Error('Invalid WebAuthn assertion');
    }

    this.audit.emit(this.auditEvent('step_up_satisfied', user, action));
    this.challenges.delete(assertion.challenge);
    return true;
  }

  private auditEvent(action: string, user: IdentityUser, resource: string): AuditLogEvent {
    return {
      action,
      actor: user.id,
      tenant: user.tenantId,
      resource,
    };
  }
}
