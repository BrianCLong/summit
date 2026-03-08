"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceIdFromBytes = evidenceIdFromBytes;
exports.generateEvidenceId = generateEvidenceId;
const node_crypto_1 = __importDefault(require("node:crypto"));
function evidenceIdFromBytes(bytes) {
    const h = node_crypto_1.default.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    return `EVD_${h}`;
}
function generateEvidenceId(content) {
    return evidenceIdFromBytes(Buffer.from(content));
}
