"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceResolvers = void 0;
const provenance_service_js_1 = require("../../maestro/evidence/provenance-service.js");
const evidenceRepo_js_1 = require("../../db/repositories/evidenceRepo.js");
exports.evidenceResolvers = {
    Mutation: {
        async publishEvidence(_, { input }, ctx) {
            const now = new Date().toISOString();
            const id = `ev_${Date.now()}`;
            try {
                // Store a minimal provenance record; ignore failures in starter
                if (provenance_service_js_1.evidenceProvenanceService?.storeEvidence) {
                    await provenance_service_js_1.evidenceProvenanceService.storeEvidence({
                        type: 'bundle',
                        hash: input.artifacts?.[0]?.sha256 || id,
                        metadata: {
                            releaseId: input.releaseId,
                            service: input.service,
                            slo: input.slo,
                            cost: input.cost,
                        },
                    });
                }
                // Persist to Postgres for provenance linking
                await (0, evidenceRepo_js_1.saveEvidenceBundle)({
                    id,
                    service: input.service,
                    release_id: input.releaseId,
                    artifacts: input.artifacts || [],
                    slo: input.slo,
                    cost: input.cost || null,
                });
            }
            catch {
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
exports.default = exports.evidenceResolvers;
