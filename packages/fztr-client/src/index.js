"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FZTRClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
class FZTRClient {
    relayUrl;
    clientId;
    privateKey; // In a real system, this would be a secure key management
    constructor(relayUrl, clientId, privateKey) {
        this.relayUrl = relayUrl;
        this.clientId = clientId;
        this.privateKey = privateKey;
    }
    async submitCredential(id, payload) {
        const payloadString = JSON.stringify(payload);
        const payloadHash = (0, crypto_1.createHash)('sha256').update(payloadString).digest('hex');
        // Mock signature for MVP
        const signature = `mock-sig-${payloadHash}`;
        const credential = {
            id,
            issuer: this.clientId,
            signature,
            payload: payloadString,
        };
        await axios_1.default.post(`${this.relayUrl}/relay/submit`, credential);
        return credential;
    }
    async retrieveCredential(id) {
        const response = await axios_1.default.get(`${this.relayUrl}/relay/retrieve/${id}`);
        return response.data;
    }
}
exports.FZTRClient = FZTRClient;
