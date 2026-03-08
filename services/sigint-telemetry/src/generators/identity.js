"use strict";
/**
 * Identity event generators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthEvent = generateAuthEvent;
exports.generateDevicePosture = generateDevicePosture;
exports.generateSessionEvent = generateSessionEvent;
exports.generateIdentityBatch = generateIdentityBatch;
const utils_js_1 = require("./utils.js");
/** Generate synthetic auth event */
function generateAuthEvent(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    const username = (0, utils_js_1.syntheticUsername)(rng);
    const isSuccess = rng.bool(0.85);
    const isExternal = rng.bool(0.3);
    // 5% chance of impossible travel for successful logins
    const impossibleTravel = isSuccess && rng.bool(0.05);
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'identity.auth',
        source: 'idp-primary',
        tenantId: config.tenantId,
        classification: 'confidential',
        retentionPolicy: 'extended',
        isSynthetic: true,
        userId: (0, utils_js_1.syntheticId)(),
        username,
        authMethod: rng.pick(['password', 'mfa_totp', 'mfa_push', 'sso_oidc']),
        result: isSuccess
            ? 'success'
            : rng.pick(['failure_invalid_credentials', 'failure_mfa_failed', 'failure_account_locked']),
        clientAddress: {
            ip: isExternal ? (0, utils_js_1.syntheticIpv4)(rng) : (0, utils_js_1.syntheticInternalIp)(rng),
        },
        clientGeo: isExternal ? (0, utils_js_1.syntheticGeo)(rng) : undefined,
        identityProvider: rng.pick(['okta', 'azure-ad', 'internal']),
        targetApplication: rng.pick(['portal', 'email', 'vpn', 'admin-console', 'api']),
        sessionId: isSuccess ? (0, utils_js_1.syntheticId)() : undefined,
        deviceId: `device-${rng.int(1000, 9999)}`,
        userAgent: 'Mozilla/5.0 (Synthetic; Example)',
        riskScore: isSuccess ? rng.int(0, 30) : rng.int(50, 100),
        impossibleTravel,
        previousAuthGeo: impossibleTravel ? (0, utils_js_1.syntheticGeo)(rng) : undefined,
    };
}
/** Generate synthetic device posture event */
function generateDevicePosture(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    const isCompliant = rng.bool(0.9);
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'identity.device_posture',
        source: 'mdm-primary',
        tenantId: config.tenantId,
        classification: 'internal',
        retentionPolicy: 'standard',
        isSynthetic: true,
        deviceId: `device-${rng.int(1000, 9999)}`,
        userId: (0, utils_js_1.syntheticId)(),
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
        lastCheckIn: (0, utils_js_1.syntheticTimestamp)(baseTime, -rng.int(0, 86400000)),
        diskEncrypted: rng.bool(0.95),
        firewallEnabled: rng.bool(0.9),
        avEnabled: rng.bool(0.85),
    };
}
/** Generate synthetic session event */
function generateSessionEvent(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'identity.session',
        source: 'session-manager',
        tenantId: config.tenantId,
        classification: 'internal',
        retentionPolicy: 'standard',
        isSynthetic: true,
        sessionId: (0, utils_js_1.syntheticId)(),
        userId: (0, utils_js_1.syntheticId)(),
        action: rng.pick(['created', 'refreshed', 'expired']),
        clientAddress: { ip: (0, utils_js_1.syntheticInternalIp)(rng) },
        duration: rng.int(300, 28800),
        mfaStepUp: rng.bool(0.1),
        privilegeLevel: rng.pick(['standard', 'standard', 'elevated', 'admin']),
    };
}
/** Generate batch of identity events */
function generateIdentityBatch(count, config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const events = [];
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
