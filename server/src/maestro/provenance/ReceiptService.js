"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptService = exports.ReceiptService = void 0;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
// Mock Key Management Service
class KMS {
    privateKey;
    publicKey;
    kid;
    constructor() {
        const { privateKey, publicKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.kid = 'dev-key-1';
    }
    sign(data) {
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }
    getPublicKey() {
        return this.publicKey;
    }
}
const kms = new KMS();
class ReceiptService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ReceiptService.instance) {
            ReceiptService.instance = new ReceiptService();
        }
        return ReceiptService.instance;
    }
    generateReceipt(tenantId, action, actorId, resourceId, inputPayload, policyDecisionId) {
        const timestamp = new Date().toISOString();
        // Create digest of the event
        // Canonicalize input by stringifying
        const inputStr = JSON.stringify(inputPayload);
        const inputHash = (0, crypto_1.createHash)('sha256').update(inputStr).digest('hex');
        const receiptData = {
            tenantId,
            action,
            actorId,
            resourceId,
            inputHash,
            policyDecisionId,
            timestamp
        };
        const digest = (0, crypto_1.createHash)('sha256').update(JSON.stringify(receiptData)).digest('hex');
        const signature = kms.sign(digest);
        return {
            id: (0, uuid_1.v4)(),
            timestamp,
            digest,
            signature,
            kid: kms.kid
        };
    }
}
exports.ReceiptService = ReceiptService;
exports.receiptService = ReceiptService.getInstance();
