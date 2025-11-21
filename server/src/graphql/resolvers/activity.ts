import { provenanceLedger } from '../../provenance/ledger.js';

export const activityResolvers = {
  Query: {
    activities: async (_: any, args: any, context: any) => {
      const user = context.user;

      // Basic auth check
      if (!user) {
        throw new Error('Not authenticated');
      }

      const tenantId = user.tenantId || user.tenant || 'default_tenant';

      const { limit, offset, actionType, resourceType } = args;

      return await provenanceLedger.getEntries(tenantId, {
        limit: limit || 50,
        offset: offset || 0,
        actionType,
        resourceType,
        order: 'DESC'
      });
    },
  },
};
