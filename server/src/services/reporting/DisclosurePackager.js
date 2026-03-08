"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisclosurePackager = void 0;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const log = pino_1.default({ name: 'DisclosurePackager' });
class DisclosurePackager {
    createManifest(evidence, rightToReplyUrl) {
        const evidenceHashes = {};
        const sortedIds = evidence.map(e => e.id).sort();
        // Calculate individual hashes
        for (const item of evidence) {
            const hash = (0, crypto_1.createHash)('sha256').update(item.content).digest('hex');
            evidenceHashes[item.id] = hash;
        }
        // Calculate root hash (Merkle-like)
        const rootHasher = (0, crypto_1.createHash)('sha256');
        for (const id of sortedIds) {
            rootHasher.update(evidenceHashes[id]);
        }
        const rootHash = rootHasher.digest('hex');
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            evidenceHashes,
            rootHash,
            transforms: ['redaction', 'normalization'], // Placeholder for actual transforms
            rightToReply: rightToReplyUrl
        };
    }
    verifyManifest(manifest, evidence) {
        const fresh = this.createManifest(evidence, manifest.rightToReply);
        return fresh.rootHash === manifest.rootHash;
    }
}
exports.DisclosurePackager = DisclosurePackager;
