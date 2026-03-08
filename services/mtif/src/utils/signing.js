"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigningService = void 0;
const node_crypto_1 = require("node:crypto");
class SigningService {
    secret;
    constructor(secret) {
        this.secret = secret;
        if (!secret) {
            throw new Error('Signing secret must be provided');
        }
    }
    sign(payload) {
        const normalized = JSON.stringify(payload, Object.keys(payload).sort());
        return (0, node_crypto_1.createHmac)('sha256', this.secret).update(normalized).digest('base64url');
    }
}
exports.SigningService = SigningService;
