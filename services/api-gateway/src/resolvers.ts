import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { buildServiceHeaders } from './utils/serviceAuth.js';

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

const delegateToBackend = async (query: string, variables: any, context: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${process.env.GRAPH_SERVICE_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': context.token || 'Bearer dev-token',
        'x-tenant-id': context.tenantId || 'tenant_1',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend delegation failed:', response.status, errorText);
      throw new Error(`Backend service error: ${response.status}`);
    }
    const result = await response.json();
    if (result.errors) {
      console.error('Backend returned GraphQL errors:', JSON.stringify(result.errors));
      throw new Error(result.errors[0].message);
    }
    const dataKey = Object.keys(result.data || {})[0];
    return result.data?.[dataKey];
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Fetch to backend failed:', err.message);
    throw err;
  }
};

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    health: () => ({
      ok: true,
      timestamp: new Date(),
    }),

    // Entity resolvers (delegated to graph service)
    entity: async (parent: any, args: any, context: any) => {
      const response = await fetch(
        `${process.env.GRAPH_SERVICE_URL}/graphql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': context.token || 'Bearer dev-token',
            'x-tenant-id': context.tenantId || 'tenant_1',
          },
          body: JSON.stringify({
            query: `query($id: ID!) { entity(id: $id) { id type properties createdAt updatedAt } }`,
            variables: { id: args.id },
          }),
        },
      );
      const result = await response.json();
      return result.data?.entity;
    },

    entities: async (parent: any, args: any, context: any) => {
      console.log('Delegating entities query to:', `${process.env.GRAPH_SERVICE_URL}/graphql`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(
          `${process.env.GRAPH_SERVICE_URL}/graphql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': context.token || 'Bearer dev-token',
              'x-tenant-id': context.tenantId || 'tenant_1',
            },
            body: JSON.stringify({
              query: `query($type: String, $limit: Int, $offset: Int) { entities(type: $type, limit: $limit, offset: $offset) { id type props createdAt updatedAt } }`,
              variables: { type: args.type, limit: args.limit, offset: args.offset },
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend delegation failed:', response.status, errorText);
          throw new Error(`Backend service error: ${response.status}`);
        }
        const result = await response.json();
        console.log('Backend response result:', JSON.stringify(result));
        return (result.data?.entities || []).map((e: any) => ({
          ...e,
          properties: e.props,
        }));
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('Fetch to backend failed:', err.message);
        throw err;
      }
    },

    // XAI resolvers (delegated to graph-xai service)
    explainEntity: async (parent: any, args: any, context: any) => {
      const { entityId, model, version } = args;
      const serviceHeaders = await buildServiceHeaders('graph-xai', ['xai:explain']);
      const response = await fetch(
        `${process.env.GRAPH_XAI_URL}/explain/entity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
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
      const serviceHeaders = await buildServiceHeaders('prov-ledger', [
        'provenance:read',
      ]);
      const response = await fetch(
        `${process.env.PROV_LEDGER_URL}/claims/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    provenance: async (parent: any, args: any, context: any) => {
      const serviceHeaders = await buildServiceHeaders('prov-ledger', [
        'provenance:read',
      ]);
      const response = await fetch(
        `${process.env.PROV_LEDGER_URL}/provenance?claimId=${args.claimId}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
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
      const serviceHeaders = await buildServiceHeaders('agent-runtime', [
        'runbook:read',
      ]);
      const response = await fetch(
        `${process.env.AGENT_RUNTIME_URL}/runbooks/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
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
      const serviceHeaders = await buildServiceHeaders('agent-runtime', [
        'runbook:read',
      ]);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Authority-ID': context.authorityId,
          'X-Reason-For-Access': context.reasonForAccess,
          ...serviceHeaders,
        },
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    },

    // Forecast resolvers (delegated to predictive-suite service)
    forecast: async (parent: any, args: any, context: any) => {
      const serviceHeaders = await buildServiceHeaders('predictive-suite', [
        'forecast:read',
      ]);
      const response = await fetch(
        `${process.env.PREDICTIVE_SUITE_URL}/forecasts/${args.id}`,
        {
          headers: {
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    // Case Management Queries
    case: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `query($id: ID!, $reason: String!, $legalBasis: String!) { case(id: $id, reason: $reason, legalBasis: $legalBasis) { id tenantId title description status priority compartment policyLabels metadata createdAt updatedAt createdBy closedAt closedBy slaTimers { slaId caseId tenantId type name startTime deadline completedAt status targetDurationSeconds metadata } } }`,
        args,
        context
      );
    },
    cases: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `query($status: String, $compartment: String, $limit: Int, $offset: Int) { cases(status: $status, compartment: $compartment, limit: $limit, offset: $offset) { id tenantId title description status priority compartment policyLabels metadata createdAt updatedAt createdBy } }`,
        args,
        context
      );
    },
    comments: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `query($targetType: String!, $targetId: ID!, $limit: Int, $offset: Int) { comments(targetType: $targetType, targetId: $targetId, limit: $limit, offset: $offset) { commentId tenantId targetType targetId parentId rootId content authorId createdAt updatedAt mentions isEdited isDeleted metadata } }`,
        args,
        context
      );
    },
  },

  Mutation: {
    // Provenance mutations
    createClaim: async (parent: any, args: any, context: any) => {
      const serviceHeaders = await buildServiceHeaders('prov-ledger', [
        'provenance:write',
      ]);
      const response = await fetch(`${process.env.PROV_LEDGER_URL}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authority-ID': context.authorityId,
          'X-Reason-For-Access': context.reasonForAccess,
          ...serviceHeaders,
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
      const serviceHeaders = await buildServiceHeaders('agent-runtime', [
        'runbook:write',
      ]);
      const response = await fetch(
        `${process.env.AGENT_RUNTIME_URL}/runbooks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
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
      const serviceHeaders = await buildServiceHeaders('predictive-suite', [
        'forecast:write',
      ]);
      const response = await fetch(
        `${process.env.PREDICTIVE_SUITE_URL}/forecast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-ID': context.authorityId,
            'X-Reason-For-Access': context.reasonForAccess,
            ...serviceHeaders,
          },
          body: JSON.stringify(args.input),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create forecast: ${response.status}`);
      }

      return response.json();
    },

    // Case Management Mutations
    createCase: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($input: CaseInput!) { createCase(input: $input) { id title status priority createdAt updatedAt createdBy } }`,
        args,
        context
      );
    },
    updateCase: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($input: CaseUpdateInput!) { updateCase(input: $input) { id title status priority createdAt updatedAt createdBy } }`,
        args,
        context
      );
    },
    archiveCase: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($id: ID!, $reason: String!, $legalBasis: String!) { archiveCase(id: $id, reason: $reason, legalBasis: $legalBasis) { id status } }`,
        args,
        context
      );
    },
    addComment: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($input: CommentInput!) { addComment(input: $input) { commentId content targetType targetId authorId createdAt } }`,
        args,
        context
      );
    },
    updateComment: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($id: ID!, $content: String!) { updateComment(id: $id, content: $content) { commentId content updatedAt isEdited } }`,
        args,
        context
      );
    },
    deleteComment: async (parent: any, args: any, context: any) => {
      return delegateToBackend(
        `mutation($id: ID!) { deleteComment(id: $id) }`,
        args,
        context
      );
    },

    ping: (parent: any, args: any) => {
      return {
        ok: true,
        timestamp: new Date(),
        message: args.input.message,
      };
    },
  },
};
