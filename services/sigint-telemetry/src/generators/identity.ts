/**
 * Identity event generators
 */

import type { AuthEvent, DevicePosture, SessionEvent } from '../schemas/identity.js';
import {
  SeededRandom,
  syntheticId,
  syntheticTimestamp,
  syntheticInternalIp,
  syntheticIpv4,
  syntheticUsername,
  syntheticGeo,
} from './utils.js';

export interface IdentityGeneratorConfig {
  rng?: SeededRandom;
  baseTime?: Date;
  tenantId?: string;
}

/** Generate synthetic auth event */
export function generateAuthEvent(config: IdentityGeneratorConfig = {}): AuthEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();

  const username = syntheticUsername(rng);
  const isSuccess = rng.bool(0.85);
  const isExternal = rng.bool(0.3);

  // 5% chance of impossible travel for successful logins
  const impossibleTravel = isSuccess && rng.bool(0.05);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'identity.auth',
    source: 'idp-primary',
    tenantId: config.tenantId,
    classification: 'confidential',
    retentionPolicy: 'extended',
    isSynthetic: true,
    userId: syntheticId(),
    username,
    authMethod: rng.pick(['password', 'mfa_totp', 'mfa_push', 'sso_oidc']),
    result: isSuccess
      ? 'success'
      : rng.pick(['failure_invalid_credentials', 'failure_mfa_failed', 'failure_account_locked']),
    clientAddress: {
      ip: isExternal ? syntheticIpv4(rng) : syntheticInternalIp(rng),
    },
    clientGeo: isExternal ? syntheticGeo(rng) : undefined,
    identityProvider: rng.pick(['okta', 'azure-ad', 'internal']),
    targetApplication: rng.pick(['portal', 'email', 'vpn', 'admin-console', 'api']),
    sessionId: isSuccess ? syntheticId() : undefined,
    deviceId: `device-${rng.int(1000, 9999)}`,
    userAgent: 'Mozilla/5.0 (Synthetic; Example)',
    riskScore: isSuccess ? rng.int(0, 30) : rng.int(50, 100),
    impossibleTravel,
    previousAuthGeo: impossibleTravel ? syntheticGeo(rng) : undefined,
  };
}

/** Generate synthetic device posture event */
export function generateDevicePosture(config: IdentityGeneratorConfig = {}): DevicePosture {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();

  const isCompliant = rng.bool(0.9);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'identity.device_posture',
    source: 'mdm-primary',
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    deviceId: `device-${rng.int(1000, 9999)}`,
    userId: syntheticId(),
    deviceType: rng.pick(['laptop', 'desktop', 'mobile']),
    osType: rng.pick(['Windows', 'macOS', 'iOS', 'Android', 'Linux']),
    osVersion: rng.pick(['14.0', '13.0', '11', '10', '22.04']),
    status: isCompliant ? 'compliant' : 'non_compliant',
    checks: [
      { checkName: 'disk_encryption', passed: rng.bool(0.95), details: 'FileVault/BitLocker' },
      { checkName: 'firewall', passed: rng.bool(0.9) },
      { checkName: 'os_updated', passed: rng.bool(0.8) },
      { checkName: 'antivirus', passed: rng.bool(0.85) },
    ],
    isManaged: rng.bool(0.8),
    lastCheckIn: syntheticTimestamp(baseTime, -rng.int(0, 86400000)),
    diskEncrypted: rng.bool(0.95),
    firewallEnabled: rng.bool(0.9),
    avEnabled: rng.bool(0.85),
  };
}

/** Generate synthetic session event */
export function generateSessionEvent(config: IdentityGeneratorConfig = {}): SessionEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'identity.session',
    source: 'session-manager',
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    sessionId: syntheticId(),
    userId: syntheticId(),
    action: rng.pick(['created', 'refreshed', 'expired']),
    clientAddress: { ip: syntheticInternalIp(rng) },
    duration: rng.int(300, 28800),
    mfaStepUp: rng.bool(0.1),
    privilegeLevel: rng.pick(['standard', 'standard', 'elevated', 'admin']),
  };
}

/** Generate batch of identity events */
export function generateIdentityBatch(
  count: number,
  config: IdentityGeneratorConfig = {}
): Array<AuthEvent | DevicePosture | SessionEvent> {
  const rng = config.rng ?? new SeededRandom();
  const events: Array<AuthEvent | DevicePosture | SessionEvent> = [];

  for (let i = 0; i < count; i++) {
    const eventType = rng.pick(['auth', 'auth', 'auth', 'posture', 'session']);
    const baseTime = new Date(Date.now() - rng.int(0, 3600000));

    switch (eventType) {
      case 'auth':
        events.push(generateAuthEvent({ ...config, rng, baseTime }));
        break;
      case 'posture':
        events.push(generateDevicePosture({ ...config, rng, baseTime }));
        break;
      case 'session':
        events.push(generateSessionEvent({ ...config, rng, baseTime }));
        break;
    }
  }

  return events;
}
