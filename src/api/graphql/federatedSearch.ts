import { FederatedBroker, FederatedQuery } from "../../graphrag/retrieval/federated/federatedBroker";

export const federatedSearchResolver = {
  Query: {
    federatedSearch: async (
      _parent: any,
      args: { query: string; tenantId: string; k?: number },
      context: { federatedBroker: FederatedBroker }
    ) => {
      const k = args.k ?? 10;
      const queryOptions: FederatedQuery = {
        tenantId: args.tenantId,
        query: args.query,
        k,
      };

      const result = await context.federatedBroker.search(queryOptions);

      return {
        results: result.results,
        sourcesUsed: result.sourcesUsed,
        partialFailures: result.partialFailures,
      };
    },
  },
};
