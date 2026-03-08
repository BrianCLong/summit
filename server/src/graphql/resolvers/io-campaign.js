"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignPhaseResolvers = void 0;
const CampaignPhaseService_1 = require("../../services/io-graph/CampaignPhaseService");
exports.campaignPhaseResolvers = {
    Query: {
        campaignPhase: async (_, args, context) => {
            // Basic auth check logic would go here
            return await CampaignPhaseService_1.campaignPhaseService.getCampaignPhase(args.phase_id);
        },
        campaignPhases: async (_, args, context) => {
            return await CampaignPhaseService_1.campaignPhaseService.getCampaignPhases(args.campaign_id);
        },
    },
    Mutation: {
        createCampaignPhase: async (_, args, context) => {
            return await CampaignPhaseService_1.campaignPhaseService.createCampaignPhase(args.input);
        },
        updateCampaignPhase: async (_, args, context) => {
            return await CampaignPhaseService_1.campaignPhaseService.updateCampaignPhase(args.phase_id, args.input);
        },
        deleteCampaignPhase: async (_, args, context) => {
            return await CampaignPhaseService_1.campaignPhaseService.deleteCampaignPhase(args.phase_id);
        },
    },
};
