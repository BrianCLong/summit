import { federatedSearch } from '../../federation/router.js';

export const federationResolvers = {
  Query: {
    federatedSearch: async (
      _: unknown,
      { q, budgetMs }: { q: string; budgetMs?: number },
      ctx: unknown,
    ) => {
      return federatedSearch(q, { budgetMs }, ctx as any);
    },
  },
};
