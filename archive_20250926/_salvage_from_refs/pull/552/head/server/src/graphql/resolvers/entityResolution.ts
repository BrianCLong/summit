import { EntityResolutionService } from '../../services/EntityResolutionService';

const service = new EntityResolutionService();

export const entityResolutionResolvers = {
  Query: {
    erSuggestions: (_: any, { limit }: any) => service.suggestCandidates(limit),
  },
  Mutation: {
    erMerge: (_: any, { pairId }: any, ctx: any) =>
      service.merge(pairId, ctx.user?.id || 'anonymous'),
    erRevert: (_: any, { mergeId }: any, ctx: any) =>
      service.revert(mergeId, ctx.user?.id || 'anonymous'),
  },
};

export default entityResolutionResolvers;
