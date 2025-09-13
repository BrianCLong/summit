
import { ApolloServerPlugin, GraphQLRequestContext } from '@apollo/server';
import fetch from 'node-fetch';

type OpaInput = {
  jwt: any; resource: { tenant: string; labels?: string[]; retention?: string };
  action: 'read'|'write'|'export'; context?: any;
};

export function opaEnforcer(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(ctx: GraphQLRequestContext) {
          // no-op: enforcement happens per resolver via context guard
        }
      };
    }
  };
}

export async function enforceABAC(args: OpaInput): Promise<void> {
  const res = await fetch('http://localhost:8181/v1/data/abac/authz/allow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: args })
  });
  const data = await res.json();
  if (!data.result) {
    const e = new Error('Forbidden by policy');
    // attach audit fields for provenance
    (e as any).reason = 'opa_deny';
    throw e;
  }
}
