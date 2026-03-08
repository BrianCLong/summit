"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factGovResolvers = void 0;
const repo_js_1 = require("./repo.js");
const service_js_1 = require("./service.js");
exports.factGovResolvers = {
    Query: {
        factgovGetRfp: async (_, { id }) => {
            return await repo_js_1.factGovRepo.getRfp(id);
        },
        factgovGetVendor: async (_, { id }) => {
            return await repo_js_1.factGovRepo.getVendor(id);
        },
        factgovGetMatches: async (_, { rfpId }) => {
            return await repo_js_1.factGovRepo.getMatchesForRfp(rfpId);
        }
    },
    Mutation: {
        factgovCreateAgency: async (_, { name, domain }) => {
            return await repo_js_1.factGovRepo.createAgency(name, domain);
        },
        factgovCreateVendor: async (_, { name, tags, description }) => {
            return await repo_js_1.factGovRepo.createVendor(name, tags, description);
        },
        factgovCreateRfp: async (_, { agencyId, title, content }, context) => {
            const rfp = await repo_js_1.factGovRepo.createRfp(agencyId, title, content);
            const userId = context.user?.id || 'system';
            await service_js_1.factGovService.auditAction('RFP', rfp.id, 'CREATE', userId, { title });
            return rfp;
        },
        factgovMatchRfp: async (_, { rfpId }) => {
            return await service_js_1.factGovService.matchRfp(rfpId);
        }
    }
};
