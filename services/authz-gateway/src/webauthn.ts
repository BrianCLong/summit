import { createVerify, randomBytes } from 'crypto';
import { log } from './audit';

export interface WebAuthnChallenge {
  challenge: string;
  expiresAt: number;
  tenantId: string;
  purposeTags: string[];
}

export interface RegistrationRequest {
  userId: string;
  tenantId: string;
  purposeTags: string[];
}

export interface RegistrationResponse {
  userId: string;
  credentialId: string;
  publicKeyPem: string;
  signCount: number;
}

export interface Assertion {
  userId: string;
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  signCount: number;
}

interface StoredCredential {
  publicKeyPem: string;
  signCount: number;
  tenantId: string;
  purposeTags: string[];
}

const challengeStore = new Map<string, WebAuthnChallenge>();
const credentialStore = new Map<string, StoredCredential>();

export function generateChallenge(req: RegistrationRequest): WebAuthnChallenge {
  const challenge = randomBytes(32).toString('base64url');
  const payload: WebAuthnChallenge = {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000,
    tenantId: req.tenantId,
    purposeTags: req.purposeTags,
  };
  challengeStore.set(req.userId, payload);
  return payload;
}

export async function registerCredential(
  response: RegistrationResponse,
): Promise<void> {
  const pending = challengeStore.get(response.userId);
  if (!pending || pending.expiresAt < Date.now()) {
    throw new Error('challenge_expired');
  }

  credentialStore.set(response.credentialId, {
    publicKeyPem: response.publicKeyPem,
    signCount: response.signCount,
    tenantId: pending.tenantId,
    purposeTags: pending.purposeTags,
  });
  challengeStore.delete(response.userId);

  await log({
    subject: response.userId,
    action: 'webauthn:register',
    resource: response.credentialId,
    tenantId: pending.tenantId,
    allowed: true,
    reason: 'mfa_enrolled',
  });
}

export async function verifyAssertion(assertion: Assertion): Promise<boolean> {
  const credential = credentialStore.get(assertion.credentialId);
  if (!credential) {
    return false;
  }

  const pending = challengeStore.get(assertion.userId);
  if (!pending || pending.expiresAt < Date.now()) {
    return false;
  }

  if (credential.tenantId !== pending.tenantId) {
    return false;
  }

  const verifier = createVerify('SHA256');
  verifier.update(Buffer.from(assertion.authenticatorData, 'base64url'));
  verifier.update(Buffer.from(assertion.clientDataJSON, 'base64url'));

  const signatureValid = verifier.verify(
    credential.publicKeyPem,
    Buffer.from(assertion.signature, 'base64url'),
  );

  if (!signatureValid) {
    return false;
  }

  if (assertion.signCount <= credential.signCount) {
    return false;
  }

  credential.signCount = assertion.signCount;
  challengeStore.delete(assertion.userId);

  await log({
    subject: assertion.userId,
    action: 'webauthn:assert',
    resource: assertion.credentialId,
    tenantId: credential.tenantId,
    allowed: true,
    reason: 'mfa_verified',
  });

  return true;
}

export function pendingChallenge(userId: string): WebAuthnChallenge | undefined {
  return challengeStore.get(userId);
}
