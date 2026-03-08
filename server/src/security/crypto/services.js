"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseAuditLogger = exports.Rfc3161TimestampingService = exports.SoftwareHSM = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const audit_js_1 = require("../../utils/audit.js");
class SoftwareHSM {
    async sign(data, key) {
        if (!key.privateKeyPem) {
            throw new Error(`Key ${key.id} version ${key.version} missing private key material`);
        }
        switch (key.algorithm) {
            case 'RSA_SHA256': {
                const signer = node_crypto_1.default.createSign('RSA-SHA256');
                signer.update(data);
                signer.end();
                return signer.sign(key.privateKeyPem);
            }
            case 'ECDSA_P256_SHA256': {
                const signer = node_crypto_1.default.createSign('SHA256');
                signer.update(data);
                signer.end();
                return signer.sign({
                    key: key.privateKeyPem,
                    dsaEncoding: 'ieee-p1363',
                });
            }
            case 'ECDSA_P384_SHA384': {
                const signer = node_crypto_1.default.createSign('SHA384');
                signer.update(data);
                signer.end();
                return signer.sign({
                    key: key.privateKeyPem,
                    dsaEncoding: 'ieee-p1363',
                });
            }
            case 'EdDSA_ED25519': {
                return node_crypto_1.default.sign(null, data, key.privateKeyPem);
            }
            default:
                throw new Error(`Unsupported algorithm ${key.algorithm}`);
        }
    }
    async exportPublicKey(key) {
        if (key.publicKeyPem) {
            return key.publicKeyPem;
        }
        if (!key.privateKeyPem) {
            throw new Error(`Key ${key.id} version ${key.version} missing material to derive public key`);
        }
        const privateKey = node_crypto_1.default.createPrivateKey(key.privateKeyPem);
        const publicKey = node_crypto_1.default.createPublicKey(privateKey);
        return publicKey.export({ type: 'spki', format: 'pem' }).toString();
    }
}
exports.SoftwareHSM = SoftwareHSM;
class Rfc3161TimestampingService {
    endpoint;
    options;
    constructor(endpoint, options = {}) {
        this.endpoint = endpoint;
        this.options = options;
    }
    async getTimestampToken(payload) {
        const fetchFn = global.fetch;
        const response = await fetchFn(this.endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/octet-stream',
                ...(this.options.apiKeyHeader && this.options.apiKeyValue
                    ? { [this.options.apiKeyHeader]: this.options.apiKeyValue }
                    : {}),
            },
            body: new Uint8Array(payload),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Timestamping service responded with ${response.status}: ${text}`);
        }
        // Try to parse JSON { token }
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const body = (await response.json());
            if (!body.token) {
                throw new Error('Timestamping service returned JSON without token field');
            }
            return body.token;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.toString('base64');
    }
    async verify(payload, token) {
        if (!this.options.verifyEndpoint) {
            // Best-effort validation by ensuring token decodes
            try {
                Buffer.from(token, 'base64');
                return true;
            }
            catch (error) {
                return false;
            }
        }
        // Use native fetch if available (Node 18+) or dynamic import
        const fetchFn = global.fetch;
        const response = await fetchFn(this.options.verifyEndpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(this.options.apiKeyHeader && this.options.apiKeyValue
                    ? { [this.options.apiKeyHeader]: this.options.apiKeyValue }
                    : {}),
            },
            body: JSON.stringify({ token, payload: payload.toString('base64') }),
        });
        if (!response.ok) {
            return false;
        }
        const body = (await response.json().catch(() => ({})));
        return body.valid === true;
    }
}
exports.Rfc3161TimestampingService = Rfc3161TimestampingService;
class DatabaseAuditLogger {
    subsystem;
    constructor(subsystem) {
        this.subsystem = subsystem;
    }
    async log(event) {
        try {
            const resourceId = `${event.keyId}:${event.keyVersion ?? 'unknown'}`;
            const details = {
                subsystem: this.subsystem,
                algorithm: event.algorithm ?? null,
                success: event.success,
                reason: event.reason ?? null,
                metadata: event.metadata ?? null,
            };
            await (0, audit_js_1.writeAudit)({
                action: `crypto.${event.action}`,
                resourceType: 'crypto-key',
                resourceId,
                details,
            });
        }
        catch (error) {
            // Auditing must never throw in hot paths
            console.warn('Failed to write crypto audit log', error);
        }
    }
}
exports.DatabaseAuditLogger = DatabaseAuditLogger;
