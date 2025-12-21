import { NRRService } from '../../../services/NRRService';

const nrrService = NRRService.getInstance();

export const nrrResolvers = {
  Query: {
    nrrMetrics: async (_: any, { tenantId, period }: { tenantId: string; period: string }) => {
      return nrrService.getNRRMetrics(tenantId, period);
    },
    expansionLevers: async () => {
      return nrrService.getExpansionLevers();
    },
    nrrCohorts: async () => {
      return nrrService.getCohorts();
    },
    customerGrowthPlan: async (_: any, { tenantId }: { tenantId: string }) => {
      return nrrService.getGrowthPlan(tenantId);
    },
  },
  Mutation: {
    createCustomerGrowthPlan: async (_: any, { input }: { input: any }) => {
      return nrrService.createGrowthPlan(input);
    },
  },
};
