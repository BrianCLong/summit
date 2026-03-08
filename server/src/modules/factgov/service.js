"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factGovService = void 0;
const repo_js_1 = require("./repo.js");
const crypto_1 = require("crypto");
exports.factGovService = {
    async matchRfp(rfpId) {
        const rfp = await repo_js_1.factGovRepo.getRfp(rfpId);
        if (!rfp)
            throw new Error('RFP not found');
        // Extract keywords (naive implementation)
        const keywords = rfp.content.split(' ').filter(w => w.length > 4);
        // Find vendors matching tags (assuming tags are keywords)
        const candidates = await repo_js_1.factGovRepo.findVendorsByTags(keywords);
        const matches = [];
        for (const vendor of candidates) {
            const score = Math.random() * 100; // Placeholder scoring
            const match = await repo_js_1.factGovRepo.createMatch(rfp.id, vendor.id, score);
            matches.push(match);
        }
        return matches;
    },
    async auditAction(entityType, entityId, action, actorId, details) {
        // Deterministic hash generation
        const lastAudit = await repo_js_1.factGovRepo.getLatestAudit(entityId);
        const previousHash = lastAudit?.hash || "0000000000000000";
        const payload = JSON.stringify({ entityType, entityId, action, actorId, details, previousHash });
        const hash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
        return await repo_js_1.factGovRepo.createAudit({
            entityType,
            entityId,
            action,
            actorId,
            details,
            previousHash,
            hash
        });
    }
};
