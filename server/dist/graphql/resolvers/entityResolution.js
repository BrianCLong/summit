import { EntityResolutionService } from '../../services/EntityResolutionService';
const service = new EntityResolutionService();
export const entityResolutionResolvers = {
    Query: {
        erSuggestions: (_, { limit }) => service.suggestCandidates(limit),
    },
    Mutation: {
        erMerge: (_, { pairId }, ctx) => service.merge(pairId, ctx.user?.id || 'anonymous'),
        erRevert: (_, { mergeId }, ctx) => service.revert(mergeId, ctx.user?.id || 'anonymous'),
    },
};
export default entityResolutionResolvers;
//# sourceMappingURL=entityResolution.js.map