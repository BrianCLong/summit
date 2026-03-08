"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_crypto_1 = __importDefault(require("node:crypto"));
const byok_hsm_orchestrator_js_1 = require("../byok-hsm-orchestrator.js");
const keyStore_js_1 = require("../keyStore.js");
const services_js_1 = require("../services.js");
class InMemoryAuditLogger {
    events = [];
    async log(event) {
        this.events.push(event);
    }
}
(0, globals_1.describe)('ByokHsmOrchestrator', () => {
    const baseRegistration = () => {
        const { publicKey } = node_crypto_1.default.generateKeyPairSync('rsa', {
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
    const buildOrchestrator = (auditLogger) => new byok_hsm_orchestrator_js_1.ByokHsmOrchestrator({
        keyStore: new keyStore_js_1.InMemoryKeyStore(),
        hsm: new services_js_1.SoftwareHSM(),
        auditLogger,
    });
    (0, globals_1.it)('wraps tenant data with customer-managed keys and records audits', async () => {
        const auditLogger = new InMemoryAuditLogger();
        const orchestrator = buildOrchestrator(auditLogger);
        await orchestrator.registerCustomerManagedKey(baseRegistration());
        const envelope = await orchestrator.encryptForTenant('tenant-a', 'tenant-a-key', 'sensitive payload', { label: 'pii' });
        (0, globals_1.expect)(envelope.kmsProvider).toBe('aws-kms');
        (0, globals_1.expect)(envelope.wrapAuthTag).toBeDefined();
        (0, globals_1.expect)(envelope.wrappedDataKey).toBeDefined();
        (0, globals_1.expect)(envelope.authTag).toHaveLength(24);
        (0, globals_1.expect)(auditLogger.events.find((event) => event.action === 'sign')).toBeDefined();
    });
    (0, globals_1.it)('enforces zero-trust guardrails before rotating keys', async () => {
        const auditLogger = new InMemoryAuditLogger();
        const orchestrator = buildOrchestrator(auditLogger);
        const registration = await orchestrator.registerCustomerManagedKey(baseRegistration());
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
        (0, globals_1.expect)(rotated.version).toBe(2);
        (0, globals_1.expect)(rotated.metadata?.guardrails).toBeDefined();
        (0, globals_1.expect)(auditLogger.events.filter((event) => event.action === 'rotate').length).toBe(2); // initial registration + zero-trust rotation
    });
    (0, globals_1.it)('flags missing approvals and overdue rotations', async () => {
        const auditLogger = new InMemoryAuditLogger();
        const orchestrator = buildOrchestrator(auditLogger);
        await orchestrator.registerCustomerManagedKey(baseRegistration());
        await (0, globals_1.expect)(orchestrator.rotateKeyWithZeroTrust('tenant-a-key', {
            algorithm: 'RSA_SHA256',
            publicKeyPem: baseRegistration().publicKeyPem,
            guardrails: {
                approvals: [{ actor: 'security' }],
                attestationToken: 'token-000000000000',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })).rejects.toThrow('At least two approvals are required for rotation');
        const due = await orchestrator.getRotationReadiness('tenant-a-key', new Date(Date.now() + 23 * 60 * 60 * 1000));
        (0, globals_1.expect)(due.status).toBe('due');
        const overdue = await orchestrator.getRotationReadiness('tenant-a-key', new Date(Date.now() + 26 * 60 * 60 * 1000));
        (0, globals_1.expect)(overdue.status).toBe('overdue');
    });
    (0, globals_1.it)('throws error for unsupported algorithms', async () => {
        const auditLogger = new InMemoryAuditLogger();
        const orchestrator = buildOrchestrator(auditLogger);
        const { publicKey } = node_crypto_1.default.generateKeyPairSync('ec', {
            namedCurve: 'P-256',
        });
        const registration = {
            tenantId: 'tenant-b',
            keyId: 'tenant-b-key',
            provider: 'aws-kms',
            algorithm: 'ECDSA_P256_SHA256',
            publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            rotationIntervalHours: 24,
        };
        await orchestrator.registerCustomerManagedKey(registration);
        await (0, globals_1.expect)(orchestrator.encryptForTenant('tenant-b', 'tenant-b-key', 'payload')).rejects.toThrow('Encryption not supported for algorithm ECDSA_P256_SHA256');
    });
});
