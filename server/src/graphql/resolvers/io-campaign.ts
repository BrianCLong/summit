import { campaignPhaseService } from '../../services/io-graph/CampaignPhaseService';
import { CampaignPhaseInput } from '../../services/io-graph/models/campaign_phase';

export const campaignPhaseResolvers = {
  Query: {
    campaignPhase: async (_: any, args: { phase_id: string }, context: any) => {
      // Basic auth check logic would go here
      return await campaignPhaseService.getCampaignPhase(args.phase_id);
    },
    campaignPhases: async (_: any, args: { campaign_id: string }, context: any) => {
      return await campaignPhaseService.getCampaignPhases(args.campaign_id);
    },
  },
  Mutation: {
    createCampaignPhase: async (_: any, args: { input: CampaignPhaseInput }, context: any) => {
      return await campaignPhaseService.createCampaignPhase(args.input);
    },
    updateCampaignPhase: async (_: any, args: { phase_id: string, input: CampaignPhaseInput }, context: any) => {
      return await campaignPhaseService.updateCampaignPhase(args.phase_id, args.input);
    },
    deleteCampaignPhase: async (_: any, args: { phase_id: string }, context: any) => {
      return await campaignPhaseService.deleteCampaignPhase(args.phase_id);
    },
  },
};
