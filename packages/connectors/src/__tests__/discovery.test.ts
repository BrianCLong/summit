import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  ConnectorConfig,
  ConnectorDiscoveryApi,
  ConnectorOperation,
  ConnectorRegistry,
  RestAPIConnector,
} from '../index';

function stubHttp(connector: RestAPIConnector, payload: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (connector as any).httpClient = {
    request: vi.fn(async () => ({
      data: payload,
      status: 200,
      config: { url: '/mock', method: 'GET' },
    })),
  };
}

function buildSearchConnector(registry: ConnectorRegistry) {
  const operations: ConnectorOperation[] = [
    {
      id: 'search',
      name: 'search',
      method: 'GET',
      endpoint: '/search',
      description: 'Search catalog entries',
      parameters: [
        { name: 'query', type: 'query', dataType: 'string', required: true },
        { name: 'limit', type: 'query', dataType: 'number', required: false },
      ],
      requestSchema: {
        type: 'object',
        properties: { query: { type: 'string' }, limit: { type: 'number' } },
      },
      responseSchema: {
        type: 'object',
        properties: { results: { type: 'array' } },
      },
      capabilities: ['query'],
      stability: 'ga',
    },
    {
      id: 'ingest',
      name: 'ingest',
      method: 'POST',
      endpoint: '/records',
      description: 'Ingest batch records',
      parameters: [
        { name: 'records', type: 'body', dataType: 'array', required: true },
      ],
      requestSchema: {
        type: 'object',
        properties: { records: { type: 'array' } },
        required: ['records'],
      },
      responseSchema: { type: 'object', properties: { accepted: { type: 'number' } } },
      capabilities: ['batch', 'pull'],
      stability: 'beta',
    },
  ];

  const config: ConnectorConfig = {
    id: 'search-api',
    name: 'Search API',
    type: 'rest_api',
    authentication: { type: 'api_key', credentials: { apiKey: 'secret' } },
    capabilities: ['query', 'pull'],
    reliabilityScore: 0.92,
    tags: ['search', 'catalog'],
    metadata: { owner: 'search-team' },
  };

  const connector = new RestAPIConnector(config, operations);
  stubHttp(connector, { ok: true });
  registry.registerInstance(connector);
}

function buildAnalyticsConnector(registry: ConnectorRegistry) {
  const operations: ConnectorOperation[] = [
    {
      id: 'aggregate',
      name: 'aggregate',
      method: 'POST',
      endpoint: '/aggregate',
      description: 'Aggregate signals',
      parameters: [
        { name: 'signal', type: 'body', dataType: 'object', required: true },
      ],
      requestSchema: { type: 'object', properties: { signal: { type: 'object' } } },
      responseSchema: { type: 'object', properties: { score: { type: 'number' } } },
      capabilities: ['analyze', 'query'],
    },
  ];

  const config: ConnectorConfig = {
    id: 'analytics',
    name: 'Analytics',
    type: 'rest_api',
    authentication: { type: 'bearer', credentials: { token: 'token' } },
    tags: ['analytics'],
    reliabilityScore: 0.7,
  };

  const connector = registry.registerConnector(config, { operations }) as RestAPIConnector;
  stubHttp(connector, { score: 0.9 });
}

describe('ConnectorDiscoveryApi', () => {
  let registry: ConnectorRegistry;
  let discovery: ConnectorDiscoveryApi;

  beforeEach(() => {
    registry = new ConnectorRegistry();
    buildSearchConnector(registry);
    buildAnalyticsConnector(registry);
    discovery = new ConnectorDiscoveryApi(registry);
  });

  it('discovers connectors with capability and tag filters', () => {
    const results = discovery.discover({ capabilities: ['query'], tags: ['search'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('search-api');
    expect(results[0].operations[0].capabilities).toContain('query');
  });

  it('negotiates capabilities and ranks strongest match first', () => {
    const matches = discovery.negotiateCapabilities({
      required: ['query'],
      preferred: ['batch'],
      authTypes: ['api_key'],
    });

    expect(matches[0].connector.id).toBe('search-api');
    expect(matches[0].matched).toContain('query');
    expect(matches[0].score).toBeGreaterThan(matches[1]?.score ?? 0);
  });

  it('introspects schemas for dynamic documentation', () => {
    const introspection = discovery.introspectSchema('search-api');
    const searchOperation = introspection.operations.find(
      (operation) => operation.name === 'search',
    );

    expect(introspection.connector.capabilities).toContain('query');
    expect(searchOperation?.requestSchema?.properties?.query).toBeDefined();
    expect(searchOperation?.stability).toBe('ga');
  });

  it('generates adapters that validate parameters before execution', async () => {
    const adapter = discovery.generateAdapter('search-api', 'search');

    await expect(adapter.invoke({ query: 'threats', limit: 5 })).resolves.toMatchObject({
      success: true,
    });
    await expect(adapter.invoke({})).rejects.toThrow(/Missing required parameters/);
  });
});
