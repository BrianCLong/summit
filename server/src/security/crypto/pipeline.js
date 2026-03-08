"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoPipeline = void 0;
exports.createDefaultCryptoPipeline = createDefaultCryptoPipeline;
const crypto = __importStar(require("node:crypto"));
const certificates_js_1 = require("./certificates.js");
const keyStore_js_1 = require("./keyStore.js");
const services_js_1 = require("./services.js");
class CryptoPipeline {
    keyManager;
    certificateValidator;
    hsm;
    timestampingService;
    auditLogger;
    defaultKeyId;
    constructor(options = {}) {
        this.keyManager = new keyStore_js_1.KeyManager(options.keyStore ?? new keyStore_js_1.InMemoryKeyStore());
        this.certificateValidator = new certificates_js_1.CertificateValidator(options.trustAnchors ?? []);
        this.hsm = options.hsm ?? new services_js_1.SoftwareHSM();
        this.timestampingService = options.timestampingService;
        this.auditLogger = options.auditLogger;
        this.defaultKeyId = options.defaultKeyId;
    }
    async registerKeyVersion(key) {
        await this.keyManager.registerKeyVersion(key);
    }
    async rotateKey(keyId, key) {
        const next = await this.keyManager.rotateKey(keyId, key);
        await this.logAudit({
            action: 'rotate',
            keyId,
            keyVersion: next.version,
            algorithm: next.algorithm,
            success: true,
            metadata: key.metadata ?? undefined,
        });
        return next;
    }
    async signPayload(payload, keyId, options = {}) {
        const material = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
        const effectiveKeyId = keyId ?? this.defaultKeyId;
        if (!effectiveKeyId) {
            throw new Error('No keyId specified for signing payload');
        }
        const key = await this.keyManager.getActiveKey(effectiveKeyId);
        if (!key) {
            throw new Error(`Active key not found for ${effectiveKeyId}`);
        }
        const signature = await this.hsm.sign(material, key);
        let timestampToken;
        if (options.includeTimestamp && this.timestampingService) {
            timestampToken =
                await this.timestampingService.getTimestampToken(material);
        }
        const bundle = {
            keyId: effectiveKeyId,
            keyVersion: key.version,
            algorithm: key.algorithm,
            signature: signature.toString('base64'),
            timestampToken,
            certificateChain: key.certificateChain,
            metadata: options.metadata ?? undefined,
        };
        await this.logAudit({
            action: 'sign',
            keyId: effectiveKeyId,
            keyVersion: key.version,
            algorithm: key.algorithm,
            success: true,
            metadata: options.metadata,
        });
        return bundle;
    }
    async verifySignature(payload, bundle, context = {}) {
        const errors = [];
        const material = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
        if (context.expectedKeyId && context.expectedKeyId !== bundle.keyId) {
            errors.push(`Unexpected key id ${bundle.keyId}, expected ${context.expectedKeyId}`);
        }
        if (context.expectedAlgorithm &&
            context.expectedAlgorithm !== bundle.algorithm) {
            errors.push(`Unexpected algorithm ${bundle.algorithm}`);
        }
        let key = await this.keyManager.getKey(bundle.keyId, bundle.keyVersion);
        if (!key) {
            key = await this.keyManager.getActiveKey(bundle.keyId);
        }
        let publicKeyPem = key?.publicKeyPem;
        let certificateResult;
        if (key &&
            key.validTo &&
            key.validTo.getTime() < Date.now() &&
            !context.allowExpiredKeys) {
            errors.push(`Key ${key.id} version ${key.version} is expired`);
        }
        if (bundle.certificateChain?.length) {
            certificateResult = this.certificateValidator.validate(bundle.certificateChain);
            if (!certificateResult.valid) {
                errors.push(...certificateResult.errors);
            }
        }
        if (!publicKeyPem) {
            if (bundle.certificateChain?.length) {
                try {
                    const leaf = new crypto.X509Certificate(bundle.certificateChain[0]);
                    publicKeyPem = leaf.publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString();
                }
                catch (error) {
                    errors.push(`Unable to extract public key from leaf certificate: ${error.message}`);
                }
            }
            else if (key?.privateKeyPem) {
                const privateKey = crypto.createPrivateKey(key.privateKeyPem);
                publicKeyPem = crypto
                    .createPublicKey(privateKey)
                    .export({ type: 'spki', format: 'pem' })
                    .toString();
            }
            else {
                errors.push(`No public key material found for ${bundle.keyId}`);
            }
        }
        let signatureValid = false;
        if (publicKeyPem) {
            signatureValid = this.verifyWithAlgorithm(bundle.algorithm, material, Buffer.from(bundle.signature, 'base64'), publicKeyPem);
            if (!signatureValid) {
                errors.push('Signature verification failed');
            }
        }
        let timestampValid;
        if (bundle.timestampToken && this.timestampingService?.verify) {
            timestampValid = await this.timestampingService.verify(material, bundle.timestampToken);
            if (!timestampValid) {
                errors.push('Timestamp token verification failed');
            }
        }
        const result = {
            valid: errors.length === 0 && signatureValid,
            keyId: bundle.keyId,
            keyVersion: bundle.keyVersion,
            algorithm: bundle.algorithm,
            chainValidated: certificateResult?.valid,
            timestampVerified: timestampValid,
            errors: errors.length ? errors : undefined,
        };
        await this.logAudit({
            action: 'verify',
            keyId: bundle.keyId,
            keyVersion: bundle.keyVersion,
            algorithm: bundle.algorithm,
            success: result.valid,
            reason: result.errors?.join('; '),
            metadata: context,
        });
        return result;
    }
    verifyWithAlgorithm(algorithm, payload, signature, publicKey) {
        try {
            switch (algorithm) {
                case 'RSA_SHA256': {
                    const verifier = crypto.createVerify('RSA-SHA256');
                    verifier.update(payload);
                    verifier.end();
                    return verifier.verify(publicKey, signature);
                }
                case 'ECDSA_P256_SHA256': {
                    const verifier = crypto.createVerify('SHA256');
                    verifier.update(payload);
                    verifier.end();
                    return verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
                }
                case 'ECDSA_P384_SHA384': {
                    const verifier = crypto.createVerify('SHA384');
                    verifier.update(payload);
                    verifier.end();
                    return verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
                }
                case 'EdDSA_ED25519':
                    return crypto.verify(null, payload, publicKey, signature);
                default:
                    throw new Error(`Unsupported verification algorithm ${algorithm}`);
            }
        }
        catch (error) {
            console.warn('Signature verification error', error);
            return false;
        }
    }
    async logAudit(event) {
        if (!this.auditLogger)
            return;
        await this.auditLogger.log(event);
    }
}
exports.CryptoPipeline = CryptoPipeline;
async function createDefaultCryptoPipeline(options = {}) {
    const raw = process.env.CRYPTO_SIGNING_KEYS;
    if (!raw) {
        return null;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        console.error('Failed to parse CRYPTO_SIGNING_KEYS', error);
        return null;
    }
    if (!Array.isArray(parsed) || !parsed.length) {
        console.error('CRYPTO_SIGNING_KEYS must be a non-empty array');
        return null;
    }
    const keyStore = new keyStore_js_1.InMemoryKeyStore();
    const auditLogger = new services_js_1.DatabaseAuditLogger(options.auditSubsystem ?? 'crypto-pipeline');
    const trustAnchors = options.trustAnchorsEnv
        ? process.env[options.trustAnchorsEnv]?.split(':::').filter(Boolean)
        : undefined;
    let timestampingService;
    if (options.timestampingEndpointEnv) {
        const endpoint = process.env[options.timestampingEndpointEnv];
        if (endpoint) {
            timestampingService = new services_js_1.Rfc3161TimestampingService(endpoint);
        }
    }
    const pipeline = new CryptoPipeline({
        keyStore,
        auditLogger,
        timestampingService,
        trustAnchors,
    });
    for (const definition of parsed) {
        const version = {
            id: definition.id,
            version: definition.version ?? 1,
            algorithm: definition.algorithm,
            publicKeyPem: definition.publicKeyPem ?? '',
            privateKeyPem: definition.privateKeyPem,
            certificateChain: definition.certificateChain,
            metadata: definition.metadata,
            createdAt: new Date(),
            validFrom: new Date(),
            isActive: definition.active ?? true,
        };
        if (!version.publicKeyPem && version.privateKeyPem) {
            const keyObject = crypto.createPrivateKey(version.privateKeyPem);
            version.publicKeyPem = crypto
                .createPublicKey(keyObject)
                .export({ type: 'spki', format: 'pem' })
                .toString();
        }
        await pipeline.registerKeyVersion(version);
    }
    return pipeline;
}
