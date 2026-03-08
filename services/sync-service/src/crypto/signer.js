"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleSigner = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const index_js_1 = require("../types/index.js");
class BundleSigner {
    privateKey = null;
    publicKey = null;
    algorithm;
    keyId;
    constructor(config) {
        this.algorithm = config.algorithm || 'RSA-SHA256';
        this.keyId = config.keyId || 'default';
        if (config.privateKey) {
            this.privateKey = node_crypto_1.default.createPrivateKey({
                key: config.privateKey,
                format: 'pem',
            });
        }
        if (config.publicKey) {
            this.publicKey = node_crypto_1.default.createPublicKey({
                key: config.publicKey,
                format: 'pem',
            });
        }
    }
    /**
     * Sign a sync bundle
     */
    async signBundle(bundle, signedBy) {
        if (!this.privateKey) {
            throw new Error('Private key not configured for signing');
        }
        const dataToSign = JSON.stringify({
            manifest: bundle.manifest,
            content: bundle.content,
            checksums: bundle.checksums,
        }, Object.keys(bundle).sort());
        const sign = node_crypto_1.default.createSign('SHA256');
        sign.update(dataToSign);
        sign.end();
        const signature = sign.sign(this.privateKey, 'base64');
        const publicKeyPem = this.publicKey
            ? this.publicKey.export({ format: 'pem', type: 'spki' }).toString()
            : '';
        return {
            signature,
            algorithm: this.algorithm,
            publicKey: publicKeyPem,
            signedBy,
            signedAt: new Date().toISOString(),
        };
    }
    /**
     * Verify bundle signatures
     */
    async verifyBundleSignatures(bundle) {
        const errors = [];
        let validSignatures = 0;
        let invalidSignatures = 0;
        if (!bundle.signatures || bundle.signatures.length === 0) {
            errors.push('No signatures present in bundle');
            return {
                valid: false,
                validSignatures: 0,
                invalidSignatures: 0,
                errors,
            };
        }
        const dataToVerify = JSON.stringify({
            manifest: bundle.manifest,
            content: bundle.content,
            checksums: bundle.checksums,
        }, Object.keys(bundle).sort());
        for (const sig of bundle.signatures) {
            try {
                const publicKey = node_crypto_1.default.createPublicKey({
                    key: sig.publicKey,
                    format: 'pem',
                });
                const verify = node_crypto_1.default.createVerify('SHA256');
                verify.update(dataToVerify);
                verify.end();
                const isValid = verify.verify(publicKey, sig.signature, 'base64');
                if (isValid) {
                    validSignatures++;
                }
                else {
                    invalidSignatures++;
                    errors.push(`Invalid signature from ${sig.signedBy} at ${sig.signedAt}`);
                }
            }
            catch (error) {
                invalidSignatures++;
                errors.push(`Signature verification failed for ${sig.signedBy}: ${error.message}`);
            }
        }
        return {
            valid: validSignatures > 0 && invalidSignatures === 0,
            validSignatures,
            invalidSignatures,
            errors,
        };
    }
    /**
     * Verify bundle checksums
     */
    async verifyBundleChecksums(bundle) {
        const errors = [];
        try {
            // Verify manifest checksum
            const manifestChecksum = (0, index_js_1.computeChecksum)(bundle.manifest, bundle.checksums.algorithm);
            if (manifestChecksum !== bundle.checksums.manifest) {
                errors.push(`Manifest checksum mismatch: expected ${bundle.checksums.manifest}, got ${manifestChecksum}`);
            }
            // Verify content checksum
            const contentChecksum = (0, index_js_1.computeChecksum)(bundle.content, bundle.checksums.algorithm);
            if (contentChecksum !== bundle.checksums.content) {
                errors.push(`Content checksum mismatch: expected ${bundle.checksums.content}, got ${contentChecksum}`);
            }
            // Verify overall checksum
            const overallChecksum = (0, index_js_1.computeChecksum)({
                manifest: bundle.manifest,
                content: bundle.content,
            }, bundle.checksums.algorithm);
            if (overallChecksum !== bundle.checksums.overall) {
                errors.push(`Overall checksum mismatch: expected ${bundle.checksums.overall}, got ${overallChecksum}`);
            }
            return {
                valid: errors.length === 0,
                errors,
            };
        }
        catch (error) {
            errors.push(`Checksum verification failed: ${error.message}`);
            return {
                valid: false,
                errors,
            };
        }
    }
    /**
     * Verify bundle is not expired
     */
    async verifyBundleNotExpired(bundle) {
        const errors = [];
        if (bundle.manifest.expiresAt) {
            const expiresAt = new Date(bundle.manifest.expiresAt);
            const now = new Date();
            if (now > expiresAt) {
                errors.push(`Bundle expired at ${bundle.manifest.expiresAt} (current time: ${now.toISOString()})`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Comprehensive bundle verification
     */
    async verifyBundle(bundle) {
        const errors = [];
        // Verify checksums
        const checksumResult = await this.verifyBundleChecksums(bundle);
        if (!checksumResult.valid) {
            errors.push(...checksumResult.errors);
        }
        // Verify signatures
        const signatureResult = await this.verifyBundleSignatures(bundle);
        if (!signatureResult.valid) {
            errors.push(...signatureResult.errors);
        }
        // Verify expiration
        const expirationResult = await this.verifyBundleNotExpired(bundle);
        if (!expirationResult.valid) {
            errors.push(...expirationResult.errors);
        }
        const valid = checksumResult.valid &&
            signatureResult.valid &&
            expirationResult.valid;
        return {
            valid,
            checksumValid: checksumResult.valid,
            signaturesValid: signatureResult.valid,
            notExpired: expirationResult.valid,
            validSignatureCount: signatureResult.validSignatures,
            errors,
        };
    }
    /**
     * Generate key pair for testing/development
     */
    static generateKeyPair() {
        const { privateKey, publicKey } = node_crypto_1.default.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });
        return {
            privateKey,
            publicKey,
        };
    }
}
exports.BundleSigner = BundleSigner;
