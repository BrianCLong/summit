import { describe, it, expect } from 'vitest';
import { ServerDescriptor } from '../src/model/serverDescriptor';
import { RegistryStore } from '../src/api/listServers';
import { ToolDiscovery } from '../src/api/listTools';

describe('MCP Registry Store', () => {
  it('should validate and register a valid server descriptor', () => {
    const store = new RegistryStore();
    const server: ServerDescriptor = {
      serverId: 'summit-graphrag',
      tenantVisibility: ['tenant-a'],
      tools: [
        { name: 'search', capabilityTags: ['search.semantic'], description: 'Search the graph', riskTags: [] }
      ],
      resources: [],
      prompts: [],
      transport: 'stdio',
      authModel: 'bearer'
    };

    store.register(server);
    const result = store.listServers({ tenantId: 'tenant-a' });
    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].serverId).toBe('summit-graphrag');
  });

  it('should enforce deny-by-default tenant visibility', () => {
    const store = new RegistryStore();
    const server: ServerDescriptor = {
      serverId: 'summit-graphrag',
      tenantVisibility: ['tenant-a'],
      tools: [],
      resources: [],
      prompts: [],
    };

    store.register(server);
    const result = store.listServers({ tenantId: 'tenant-b' });
    expect(result.servers).toHaveLength(0);
  });

  it('should list tools deterministically', () => {
    const store = new RegistryStore();
    store.register({
      serverId: 'server-b',
      tenantVisibility: ['tenant-a'],
      tools: [{ name: 'tool-b', capabilityTags: [], description: '', riskTags: [] }],
      resources: [],
      prompts: [],
    });
    store.register({
      serverId: 'server-a',
      tenantVisibility: ['tenant-a'],
      tools: [{ name: 'tool-a', capabilityTags: [], description: '', riskTags: [] }],
      resources: [],
      prompts: [],
    });

    const discovery = new ToolDiscovery(store);
    const result = discovery.listTools({ tenantId: 'tenant-a' });

    expect(result.tools).toHaveLength(2);
    expect(result.tools[0].serverId).toBe('server-a');
    expect(result.tools[1].serverId).toBe('server-b');
  });
});
