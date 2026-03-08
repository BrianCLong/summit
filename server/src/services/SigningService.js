"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigningService = void 0;
const crypto_1 = require("crypto");
const config_js_1 = require("../config.js");
/**
 * @class SigningService
 * @description Provides cryptographic signing for evidence packets.
 *
 * This service uses a private key from the application configuration to create
 * a digital signature for data, ensuring its integrity and authenticity.
 */
class SigningService {
    privateKey;
    publicKey;
    constructor() {
        if (!config_js_1.cfg.SIGNING_PRIVATE_KEY) {
            throw new Error('SIGNING_PRIVATE_KEY is not configured. Cannot create signatures.');
        }
        this.privateKey = config_js_1.cfg.SIGNING_PRIVATE_KEY;
        // Derive and store the public key for verification purposes
        try {
            const publicKeyObject = (0, crypto_1.createPublicKey)(this.privateKey);
            this.publicKey = publicKeyObject.export({ type: 'spki', format: 'pem' }).toString();
        }
        catch (error) {
            throw new Error('Invalid SIGNING_PRIVATE_KEY. Please provide a valid PEM-formatted private key.');
        }
    }
    /**
     * Signs the given data using the configured private key.
     * @param data The data to sign (string or Buffer).
     * @returns The base64-encoded signature.
     */
    sign(data) {
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }
    /**
     * Returns the public key corresponding to the private key.
     * @returns The public key in PEM format.
     */
    getPublicKey() {
        return this.publicKey;
    }
}
exports.SigningService = SigningService;
