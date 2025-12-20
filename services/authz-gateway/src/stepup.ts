import crypto from 'crypto';
import credentials from './data/webauthn-credentials.json';
import { registry } from './observability';
import type { ElevationContext, ElevationGrant } from './types';
import { Counter, Gauge } from 'prom-client';

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
  maxCachedChallenges?: number;
}

export interface StepUpChallenge {
  challenge: string;
  allowCredentials: {
    id: string;
    type: string;
    transports: string[];
    displayName: string;
    authenticatorAttachment: 'cross-platform' | 'platform';
    deviceType: 'yubikey' | 'fido2-key';
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
  createdAt: number;
}

const DEFAULT_STEP_UP_TTL = 5 * 60 * 1000;
const DEFAULT_ELEVATION_TTL = 10 * 60 * 1000;
const DEFAULT_MAX_CACHED_CHALLENGES = 1000;

function getOrCreateGauge(
  name: string,
  factory: () => Gauge<string>,
): Gauge<string> {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Gauge<string>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

function getOrCreateCounter(
  name: string,
  factory: () => Counter<'reason'>,
): Counter<'reason'> {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Counter<'reason'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

const stepUpCacheSize = getOrCreateGauge(
  'authz_gateway_stepup_cache_size',
  () =>
    new Gauge({
      name: 'authz_gateway_stepup_cache_size',
      help: 'Number of active step-up challenges held in memory.',
    }),
);

const stepUpEvictionsTotal = getOrCreateCounter(
  'authz_gateway_stepup_evictions_total',
  () =>
    new Counter({
      name: 'authz_gateway_stepup_evictions_total',
      help: 'Total number of step-up challenges evicted.',
      labelNames: ['reason'],
    }) as Counter<'reason'>,
);

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
  private maxCachedChallenges: number;
  private challengeCache = new Map<string, ChallengeCacheEntry>();

  constructor(options: StepUpOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_STEP_UP_TTL;
    this.now = options.now ?? Date.now;
    this.elevationTtlMs = options.elevationTtlMs ?? DEFAULT_ELEVATION_TTL;
    this.maxCachedChallenges = Math.max(
      1,
      options.maxCachedChallenges ?? DEFAULT_MAX_CACHED_CHALLENGES,
    );
    this.updateCacheSizeMetric();
  }

  clear() {
    this.challengeCache.clear();
    this.updateCacheSizeMetric();
  }

  createChallenge(userId: string, context: ElevationContext): StepUpChallenge {
    this.cleanupExpired();
    this.enforceCapacity();

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
      createdAt: this.now(),
    });
    this.updateCacheSizeMetric();
    return {
      challenge,
      allowCredentials: registered.map((entry) => ({
        id: entry.credentialId,
        type: 'public-key',
        transports: ['usb', 'nfc', 'ble', 'hybrid'],
        displayName: entry.deviceName,
        authenticatorAttachment: 'cross-platform',
        deviceType: entry.deviceName.toLowerCase().includes('yubi')
          ? 'yubikey'
          : 'fido2-key',
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
    this.cleanupExpired();
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
    this.challengeCache.delete(userId);
    stepUpEvictionsTotal.inc({ reason: 'used' });
    this.updateCacheSizeMetric();
    return {
      ...entry.context,
      grantedAt: new Date(this.now()).toISOString(),
      expiresAt: new Date(this.now() + this.elevationTtlMs).toISOString(),
      mechanism: 'webauthn',
      challengeId: entry.challenge,
    };
  }

  private cleanupExpired() {
    const now = this.now();
    let removed = false;
    for (const [userId, entry] of this.challengeCache.entries()) {
      if (entry.expiresAt <= now) {
        this.challengeCache.delete(userId);
        stepUpEvictionsTotal.inc({ reason: 'expired' });
        removed = true;
      }
    }
    if (removed) {
      this.updateCacheSizeMetric();
    }
  }

  private enforceCapacity() {
    while (this.challengeCache.size >= this.maxCachedChallenges) {
      const oldest = this.challengeCache.keys().next().value;
      if (!oldest) {
        break;
      }
      this.challengeCache.delete(oldest);
      stepUpEvictionsTotal.inc({ reason: 'bounded' });
    }
    this.updateCacheSizeMetric();
  }

  private updateCacheSizeMetric() {
    stepUpCacheSize.set(this.challengeCache.size);
  }
}
