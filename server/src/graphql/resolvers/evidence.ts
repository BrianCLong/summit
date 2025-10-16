import { evidenceProvenanceService } from '../../maestro/evidence/provenance-service';
import { saveEvidenceBundle } from '../../db/repositories/evidenceRepo.js';

export const evidenceResolvers = {
  Mutation: {
    async publishEvidence(_: any, { input }: any, ctx: any) {
      const now = new Date().toISOString();
      const id = `ev_${Date.now()}`;
      try {
        // Store a minimal provenance record; ignore failures in starter
        if (evidenceProvenanceService?.storeEvidence) {
          await evidenceProvenanceService.storeEvidence({
            type: 'bundle',
            hash: input.artifacts?.[0]?.sha256 || id,
            metadata: {
              releaseId: input.releaseId,
              service: input.service,
              slo: input.slo,
              cost: input.cost,
            },
          } as any);
        }
        // Persist to Postgres for provenance linking
        await saveEvidenceBundle({
          id,
          service: input.service,
          release_id: input.releaseId,
          artifacts: input.artifacts || [],
          slo: input.slo,
          cost: input.cost || null,
        });
      } catch {
        // noop: starter keeps endpoint resilient
      }
      return {
        id,
        releaseId: input.releaseId,
        service: input.service,
        artifacts: input.artifacts || [],
        slo: input.slo,
        cost: input.cost || null,
        createdAt: now,
      };
    },
  },
};

export default evidenceResolvers;
