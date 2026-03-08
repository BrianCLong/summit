"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ByokHsmOrchestrator = void 0;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const keyStore_js_1 = require("./keyStore.js");
const services_js_1 = require("./services.js");
class ByokHsmOrchestrator {
    keyManager;
    hsm;
    auditLogger;
    tenantBindings = new Map();
    constructor(options = {}) {
        this.keyManager = new keyStore_js_1.KeyManager(options.keyStore ?? new keyStore_js_1.InMemoryKeyStore());
        this.hsm = options.hsm ?? new services_js_1.SoftwareHSM();
        this.auditLogger = options.auditLogger;
    }
    async registerCustomerManagedKey(registration) {
        const now = new Date();
        const version = {
            id: registration.keyId,
            version: 1,
            algorithm: registration.algorithm,
            publicKeyPem: registration.publicKeyPem,
            certificateChain: registration.certificateChain,
            validFrom: registration.validFrom ?? now,
            validTo: registration.validTo,
            metadata: {
                tenantId: registration.tenantId,
                provider: registration.provider,
                rotationIntervalHours: registration.rotationIntervalHours ?? 24,
                ...registration.metadata,
            },
            isActive: true,
            createdAt: now,
        };
        this.tenantBindings.set(registration.keyId, registration);
        await this.keyManager.registerKeyVersion(version);
        await this.logAudit({
            action: 'rotate',
            keyId: registration.keyId,
            keyVersion: version.version,
            algorithm: registration.algorithm,
            success: true,
            metadata: {
                reason: 'initial-registration',
                tenantId: registration.tenantId,
                provider: registration.provider,
            },
        });
        return version;
    }
    async encryptForTenant(tenantId, keyId, plaintext, aad) {
        const binding = this.tenantBindings.get(keyId);
        if (!binding || binding.tenantId !== tenantId) {
            throw new Error(`Key ${keyId} is not registered for tenant ${tenantId}`);
        }
        const activeKey = await this.keyManager.getActiveKey(keyId);
        if (!activeKey) {
            throw new Error(`No active key found for ${keyId}`);
        }
        const dataKey = (0, node_crypto_1.randomBytes)(32);
        const iv = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', dataKey, iv);
        const material = Buffer.isBuffer(plaintext)
            ? plaintext
            : Buffer.from(plaintext, 'utf8');
        let ciphertext = cipher.update(material, undefined, 'base64');
        ciphertext += cipher.final('base64');
        const wrapped = await this.wrapDataKey(dataKey, activeKey);
        await this.logAudit({
            action: 'sign',
            keyId,
            keyVersion: activeKey.version,
            algorithm: activeKey.algorithm,
            success: true,
            metadata: {
                purpose: 'byok-encryption',
                tenantId,
                aad,
            },
        });
        return {
            ciphertext,
            iv: Buffer.from(iv).toString('base64'),
            authTag: Buffer.from(cipher.getAuthTag()).toString('base64'),
            wrappedDataKey: wrapped.wrappedDataKey,
            wrapAuthTag: wrapped.wrapAuthTag,
            wrapIv: wrapped.wrapIv,
            keyId,
            keyVersion: activeKey.version,
            algorithm: 'AES-256-GCM',
            kmsProvider: binding.provider,
            aad,
        };
    }
    async rotateKeyWithZeroTrust(keyId, next) {
        const binding = this.tenantBindings.get(keyId);
        if (!binding) {
            throw new Error(`Key ${keyId} is not bound to a tenant`);
        }
        this.validateGuardrails(next.guardrails);
        const rotated = await this.keyManager.rotateKey(keyId, {
            algorithm: next.algorithm,
            publicKeyPem: next.publicKeyPem,
            certificateChain: next.certificateChain,
            validFrom: next.validFrom ?? new Date(),
            validTo: next.validTo,
            metadata: {
                tenantId: binding.tenantId,
                provider: binding.provider,
                guardrails: {
                    approvals: next.guardrails.approvals,
                    attestationToken: next.guardrails.attestationToken,
                    expiresAt: next.guardrails.expiresAt.toISOString(),
                    changeTicket: next.guardrails.changeTicket,
                    breakGlass: next.guardrails.breakGlass ?? false,
                },
                ...next.metadata,
            },
        });
        await this.logAudit({
            action: 'rotate',
            keyId,
            keyVersion: rotated.version,
            algorithm: rotated.algorithm,
            success: true,
            metadata: rotated.metadata,
        });
        return rotated;
    }
    async getRotationReadiness(keyId, asOf = new Date()) {
        const binding = this.tenantBindings.get(keyId);
        if (!binding) {
            throw new Error(`Key ${keyId} is not bound to a tenant`);
        }
        const activeKey = await this.keyManager.getActiveKey(keyId);
        if (!activeKey) {
            throw new Error(`No active key found for ${keyId}`);
        }
        const rotationHours = binding.rotationIntervalHours ?? 24;
        const nextRotationAt = new Date(activeKey.createdAt.getTime() + rotationHours * 60 * 60 * 1000);
        if (asOf > nextRotationAt) {
            return { status: 'overdue', nextRotationAt };
        }
        const dueSoon = new Date(nextRotationAt.getTime() - 60 * 60 * 1000);
        if (asOf >= dueSoon) {
            return { status: 'due', nextRotationAt };
        }
        return { status: 'healthy', nextRotationAt };
    }
    async wrapDataKey(dataKey, key) {
        const publicKeyPem = await this.hsm.exportPublicKey(key);
        if (key.algorithm === 'RSA_SHA256') {
            const wrappedDataKey = (0, node_crypto_1.publicEncrypt)({
                key: publicKeyPem,
                padding: node_crypto_1.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            }, dataKey);
            return {
                wrappedDataKey: wrappedDataKey.toString('base64'),
                wrapAuthTag: '',
                wrapIv: '',
            };
        }
        throw new Error(`Encryption not supported for algorithm ${key.algorithm}`);
    }
    validateGuardrails(guardrails) {
        if (!guardrails.attestationToken || guardrails.attestationToken.length < 16) {
            throw new Error('Guardrail attestation token is missing or too short');
        }
        if (guardrails.approvals.length < 2 && !guardrails.breakGlass) {
            throw new Error('At least two approvals are required for rotation');
        }
        if (guardrails.expiresAt.getTime() <= Date.now()) {
            throw new Error('Guardrail attestation is expired');
        }
    }
    async logAudit(event) {
        if (this.auditLogger) {
            await this.auditLogger.log(event);
        }
    }
}
exports.ByokHsmOrchestrator = ByokHsmOrchestrator;
