import { factGovRepo } from './repo.js';
import { createHash } from 'crypto';

export const factGovService = {
  async matchRfp(rfpId: string) {
    const rfp = await factGovRepo.getRfp(rfpId);
    if (!rfp) throw new Error('RFP not found');

    // Extract keywords (naive implementation)
    const keywords = rfp.content.split(' ').filter(w => w.length > 4);

    // Find vendors matching tags (assuming tags are keywords)
    const candidates = await factGovRepo.findVendorsByTags(keywords);

    const matches = [];
    for (const vendor of candidates) {
        const score = Math.random() * 100; // Placeholder scoring
        const match = await factGovRepo.createMatch(rfp.id, vendor.id, score);
        matches.push(match);
    }
    return matches;
  },

  async auditAction(entityType: string, entityId: string, action: string, actorId: string, details: any) {
      // Deterministic hash generation
      const lastAudit = await factGovRepo.getLatestAudit(entityId);
      const previousHash = lastAudit?.hash || "0000000000000000";

      const payload = JSON.stringify({ entityType, entityId, action, actorId, details, previousHash });
      const hash = createHash('sha256').update(payload).digest('hex');

      return await factGovRepo.createAudit({
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
