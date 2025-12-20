import {
  getLatestEvidence,
  listEvidence,
} from '../../db/repositories/evidenceRepo.js';
import {
  getTrustScore,
  upsertTrustScore,
} from '../../db/repositories/trustRiskRepo.js';

export const provenanceResolvers = {
  Query: {
    async evidenceBundles(_: any, { filter }: any) {
      const { service, releaseId, since, until, limit, offset } = filter || {};
      if (!service || !releaseId) return [];
      if (
        since ||
        until ||
        typeof offset === 'number' ||
        (limit && limit > 1)
      ) {
        return await listEvidence(service, releaseId, {
          since,
          until,
          limit,
          offset,
        });
      }
      const latest = await getLatestEvidence(service, releaseId);
      return latest ? [latest] : [];
    },
  },
  Mutation: {
    async linkTrustScoreEvidence(
      _: any,
      { tenantId, subjectId, evidenceId }: any,
    ) {
      // Preserve current score/reasons; just attach evidenceId
      const cur = await getTrustScore(tenantId, subjectId);
      const score = cur?.score ?? 0.7;
      const reasons = cur?.reasons ?? ['manual_link'];
      await upsertTrustScore(tenantId, subjectId, score, reasons, evidenceId);
      const updated = await getTrustScore(tenantId, subjectId);
      return {
        subjectId,
        score: updated?.score ?? score,
        reasons: updated?.reasons ?? reasons,
        updatedAt: updated?.updated_at ?? new Date().toISOString(),
      };
    },
  },
};

export default provenanceResolvers;
