import { RiskService } from '../risk/RiskService';

const service = new RiskService();

export const riskResolvers = {
  Query: {
    riskSummary: async (_: any, { entityId, window }: any) => {
      const res = await service.compute(entityId, window);
      return {
        entityId,
        score: res.score,
        band: res.band,
        window: res.window,
        topContributions: res.contributions.slice(0, 5),
      };
    },
    topRiskEntities: async () => [],
  },
};
