import crypto from 'crypto';
import credentials from './data/webauthn-credentials.json';
import type { ElevationContext, ElevationGrant } from './types';

interface CredentialRecord {
  credentialId: string;
  publicKeyPem: string;
  userHandle: string;
  deviceName: string;
  lastUsed?: string;
}

const credentialDirectory = credentials as Record<string, CredentialRecord[]>;

export interface StepUpOptions {
  ttlMs?: number;
  now?: () => number;
  elevationTtlMs?: number;
}

export interface StepUpChallenge {
  challenge: string;
  allowCredentials: {
    id: string;
    type: string;
    transports: string[];
    displayName: string;
  }[];
  expiresAt: string;
  context: Pick<
    ElevationContext,
    'requestedAction' | 'resourceId' | 'classification' | 'tenantId'
  >;
}

export interface StepUpVerification {
  credentialId: string;
  challenge: string;
  signature: string;
}

interface ChallengeCacheEntry {
  challenge: string;
  credentialId: string;
  expiresAt: number;
  used: boolean;
  context: ElevationContext;
}

const DEFAULT_STEP_UP_TTL = 5 * 60 * 1000;
const DEFAULT_ELEVATION_TTL = 10 * 60 * 1000;

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64');
}

function getRegisteredCredentials(userId: string): CredentialRecord[] {
  const entries = credentialDirectory[userId] ?? [];
  return entries.map((entry) => ({
    credentialId: entry.credentialId,
    publicKeyPem: entry.publicKeyPem,
    userHandle: entry.userHandle,
    deviceName: entry.deviceName,
    lastUsed: entry.lastUsed,
  }));
}

export class StepUpManager {
  private ttlMs: number;
  private now: () => number;
  private elevationTtlMs: number;
  private challengeCache = new Map<string, ChallengeCacheEntry>();

  constructor(options: StepUpOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_STEP_UP_TTL;
    this.now = options.now ?? Date.now;
    this.elevationTtlMs = options.elevationTtlMs ?? DEFAULT_ELEVATION_TTL;
  }

  clear() {
    this.challengeCache.clear();
  }

  createChallenge(userId: string, context: ElevationContext): StepUpChallenge {
    if (!context.sessionId) {
      throw new Error('session_missing');
    }
    if (!context.requestedAction) {
      throw new Error('action_missing');
    }
    const normalizedContext: ElevationContext = {
      ...context,
      currentAcr: context.currentAcr ?? 'loa1',
    };
    const registered = getRegisteredCredentials(userId);
    if (!registered.length) {
      throw new Error('no_registered_device');
    }
    const challengeBuffer = crypto.randomBytes(32);
    const challenge = toBase64Url(challengeBuffer);
    const primary = registered[0];
    this.challengeCache.set(userId, {
      challenge,
      credentialId: primary.credentialId,
      expiresAt: this.now() + this.ttlMs,
      used: false,
      context: normalizedContext,
    });
    return {
      challenge,
      allowCredentials: registered.map((entry) => ({
        id: entry.credentialId,
        type: 'public-key',
        transports: ['usb', 'nfc', 'ble'],
        displayName: entry.deviceName,
      })),
      expiresAt: new Date(this.now() + this.ttlMs).toISOString(),
      context: {
        requestedAction: normalizedContext.requestedAction,
        resourceId: normalizedContext.resourceId,
        classification: normalizedContext.classification,
        tenantId: normalizedContext.tenantId,
      },
    };
  }

  verifyResponse(
    userId: string,
    payload: StepUpVerification,
    sessionId: string,
  ): ElevationGrant {
    const entry = this.challengeCache.get(userId);
    if (!entry) {
      throw new Error('challenge_not_found');
    }
    if (entry.used) {
      throw new Error('challenge_already_used');
    }
    if (entry.expiresAt < this.now()) {
      this.challengeCache.delete(userId);
      throw new Error('challenge_expired');
    }
    if (payload.challenge !== entry.challenge) {
      throw new Error('challenge_mismatch');
    }
    if (payload.credentialId !== entry.credentialId) {
      throw new Error('credential_mismatch');
    }
    if (entry.context.sessionId !== sessionId) {
      throw new Error('session_mismatch');
    }

    const registered = getRegisteredCredentials(userId).find(
      (device) => device.credentialId === payload.credentialId,
    );
    if (!registered) {
      throw new Error('credential_not_registered');
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(payload.challenge, 'utf8'));
    verifier.end();
    const signatureBuffer = fromBase64Url(payload.signature);
    const verified = verifier.verify(registered.publicKeyPem, signatureBuffer);
    if (!verified) {
      throw new Error('signature_invalid');
    }
    entry.used = true;
    return {
      ...entry.context,
      grantedAt: new Date(this.now()).toISOString(),
      expiresAt: new Date(this.now() + this.elevationTtlMs).toISOString(),
      mechanism: 'webauthn',
      challengeId: entry.challenge,
    };
  }
}
