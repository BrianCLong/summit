"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_API_KEY = void 0;
exports.lookupApiClient = lookupApiClient;
const crypto_1 = __importDefault(require("crypto"));
function hashKey(raw) {
    return crypto_1.default.createHash('sha256').update(raw).digest('hex');
}
const apiKeys = [
    {
        keyId: 'demo-governance',
        clientId: 'governance-sample-client',
        tenantId: 'tenantA',
        subjectHint: 'alice',
        hashedKey: hashKey('demo-external-key-123'),
    },
];
function lookupApiClient(apiKey) {
    const hashed = hashKey(apiKey);
    const record = apiKeys.find((entry) => entry.hashedKey === hashed);
    if (!record || record.revoked) {
        return null;
    }
    const { hashedKey: _hashedKey, ...client } = record;
    return client;
}
exports.TEST_API_KEY = 'demo-external-key-123';
