"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceResolvers = void 0;
const evidenceRepo_js_1 = require("../../db/repositories/evidenceRepo.js");
const trustRiskRepo_js_1 = require("../../db/repositories/trustRiskRepo.js");
const lineage_js_1 = require("../../provenance/lineage.js");
const provExporter_js_1 = require("../../provenance/provExporter.js");
exports.provenanceResolvers = {
    Query: {
        async evidenceBundles(_, { filter }) {
            const { service, releaseId, since, until, limit, offset } = filter || {};
            if (!service || !releaseId)
                return [];
            if (since ||
                until ||
                typeof offset === 'number' ||
                (limit && limit > 1)) {
                return await (0, evidenceRepo_js_1.listEvidence)(service, releaseId, {
                    since,
                    until,
                    limit,
                    offset,
                });
            }
            const latest = await (0, evidenceRepo_js_1.getLatestEvidence)(service, releaseId);
            return latest ? [latest] : [];
        },
        async exportProvenance(_, { tenantId, format }) {
            const graph = await lineage_js_1.lineageGraph.buildGraph(tenantId);
            let content;
            if (format === 'PROV-JSON' || !format) {
                content = (0, provExporter_js_1.convertLineageToProv)(graph);
            }
            else if (format === 'JSON') {
                content = graph;
            }
            else {
                throw new Error(`Unsupported format: ${format}`);
            }
            return {
                format: format || 'PROV-JSON',
                content,
                exportedAt: new Date().toISOString(),
                tenantId
            };
        },
    },
    Mutation: {
        async linkTrustScoreEvidence(_, { tenantId, subjectId, evidenceId }) {
            // Preserve current score/reasons; just attach evidenceId
            const cur = await (0, trustRiskRepo_js_1.getTrustScore)(tenantId, subjectId);
            const score = cur?.score ?? 0.7;
            const reasons = cur?.reasons ?? ['manual_link'];
            await (0, trustRiskRepo_js_1.upsertTrustScore)(tenantId, subjectId, score, reasons, evidenceId);
            const updated = await (0, trustRiskRepo_js_1.getTrustScore)(tenantId, subjectId);
            return {
                subjectId,
                score: updated?.score ?? score,
                reasons: updated?.reasons ?? reasons,
                updatedAt: updated?.updated_at ?? new Date().toISOString(),
            };
        },
    },
};
exports.default = exports.provenanceResolvers;
