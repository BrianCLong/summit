"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHash = calculateHash;
exports.signData = signData;
exports.generateProvenance = generateProvenance;
const crypto_1 = __importDefault(require("crypto"));
function calculateHash(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
function signData(data) {
    // In a real implementation, this would use a private key or KMS/Cosign
    // For now, we simulate a signature with HMAC
    const secret = process.env.SIGNING_SECRET || 'dev-secret';
    return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
}
function generateProvenance(templateId, version, inputData, outputBuffer) {
    const inputHash = crypto_1.default.createHash('sha256').update(JSON.stringify(inputData)).digest('hex');
    const outputHash = calculateHash(outputBuffer);
    const provenanceData = `${templateId}:${version}:${inputHash}:${outputHash}`;
    const signature = signData(provenanceData);
    return {
        templateId,
        version,
        generatedAt: new Date().toISOString(),
        inputHash,
        outputHash,
        signature,
    };
}
