"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceResolvers = void 0;
const ProvenanceClaimService_js_1 = require("../../services/ProvenanceClaimService.js");
exports.provenanceResolvers = {
    Mutation: {
        registerEvidence: async (_, args, context) => {
            const { input } = args;
            return ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance().registerEvidence({
                ...input,
                registered_by: context.user?.id || 'system',
                tenant_id: context.user?.tenantId || 'default'
            });
        },
        registerClaim: async (_, args, context) => {
            const { input } = args;
            return ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance().registerClaim({
                ...input,
                created_by: context.user?.id || 'system',
                tenant_id: context.user?.tenantId || 'default'
            });
        },
        linkClaimToEvidence: async (_, args, context) => {
            const { input } = args;
            return ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance().linkClaimToEvidence({
                ...input,
                created_by: context.user?.id || 'system',
                tenant_id: context.user?.tenantId || 'default'
            });
        },
        createExportManifest: async (_, args, context) => {
            const { input } = args;
            return ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance().createExportManifest({
                ...input,
                created_by: context.user?.id || 'system',
                tenant_id: context.user?.tenantId || 'default'
            });
        }
    },
    Query: {
    // Basic queries would be implemented here or generated via DataSources
    }
};
