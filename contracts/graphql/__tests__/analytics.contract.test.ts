import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { buildClientSchema, getIntrospectionQuery, parse, printSchema } from 'graphql';

const goldenPath = path.join(__dirname, '..', 'analytics.golden.graphql');
const golden = fs.readFileSync(goldenPath, 'utf8');

function normalizeSDL(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

describe('analytics GraphQL contract', () => {
  it('golden SDL is valid and runtime schema matches when service is reachable', async () => {
    // ensure golden is syntactically valid
    expect(() => parse(golden)).not.toThrow();

    const endpoint = process.env.ANALYTICS_GRAPHQL_ENDPOINT || 'http://localhost:4030/graphql';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: getIntrospectionQuery() })
      });

      if (!response.ok) {
        throw new Error(`Unexpected status from analytics service: ${response.status}`);
      }

      const json = (await response.json()) as { data?: unknown; errors?: unknown };
      if (!json.data) {
        throw new Error('No introspection data returned from analytics service');
      }

      const runtimeSchema = buildClientSchema(json.data as any);
      const runtimeSDL = printSchema(runtimeSchema);

      expect(normalizeSDL(runtimeSDL)).toEqual(normalizeSDL(golden));
    } catch (err: any) {
      if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
        // Service not running; surface warning so drift is still detectable when the service is available.
        // eslint-disable-next-line no-console
        console.warn(`[contract] analytics service not reachable at ${endpoint}; skipping runtime comparison`);
        return;
      }
      throw err;
    }
  });
});
