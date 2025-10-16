import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value: any) =>
    value instanceof Date ? value.toISOString() : value,
  parseValue: (value: any) => new Date(value),
  parseLiteral: (ast) =>
    ast.kind === Kind.STRING ? new Date(ast.value) : null,
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return null;
      }
    }
    return null;
  },
});

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    health: () => 'OK',

    // Entity resolvers (delegated to graph service)
    entity: async (parent: any, args: any, context: any) => {
      // TODO: Delegate to graph service
      return null;
    },

    entities: async (parent: any, args: any, context: any) => {
      // TODO: Delegate to graph service
      return [];
    },

    // XAI resolvers (delegated to graph-xai service)
    explainEntity: async (parent: any, args: any, context: any) => {
      const { entityId, model, version } = args;
      const response = await fetch(
        `${process.env.GRAPH_XAI_URL}/explain/entity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
          body: JSON.stringify({ entityId, model, version }),
        },
      );

      if (!response.ok) {
        throw new Error(`XAI service error: ${response.status}`);
      }

      return response.json();
    },

    // Provenance resolvers (delegated to prov-ledger service)
    claim: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.PROV_LEDGER_URL}/claims/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    provenance: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.PROV_LEDGER_URL}/provenance?claimId=${args.claimId}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    // Runbook resolvers (delegated to agent-runtime service)
    runbook: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.AGENT_RUNTIME_URL}/runbooks/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    runbooks: async (parent: any, args: any, context: any) => {
      const url = new URL(`${process.env.AGENT_RUNTIME_URL}/runbooks`);
      if (args.status) {
        url.searchParams.set('status', args.status);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Authority-ID': context.authorityId,
          'X-Reason-For-Access': context.reasonForAccess,
        },
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    },

    // Forecast resolvers (delegated to predictive-suite service)
    forecast: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.PREDICTIVE_SUITE_URL}/forecasts/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },
  },

  Mutation: {
    // Provenance mutations
    createClaim: async (parent: any, args: any, context: any) => {
      const response = await fetch(`${process.env.PROV_LEDGER_URL}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authority-ID': context.authorityId,
          'X-Reason-For-Access': context.reasonForAccess,
        },
        body: JSON.stringify(args.input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create claim: ${response.status}`);
      }

      return response.json();
    },

    // Runbook mutations
    startRunbook: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.AGENT_RUNTIME_URL}/runbooks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
          body: JSON.stringify({
            name: args.name,
            version: args.version,
            inputs: args.inputs,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to start runbook: ${response.status}`);
      }

      return response.json();
    },

    // Forecast mutations
    createForecast: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.PREDICTIVE_SUITE_URL}/forecast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
          },
          body: JSON.stringify(args.input),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create forecast: ${response.status}`);
      }

      return response.json();
    },
  },
};
