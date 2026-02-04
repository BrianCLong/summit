import { describe, expect, it, vi } from 'vitest';
import {
  buildSearchArgs,
  hashRequest,
  idempotencyMarker,
  redact,
  Things3TaskStore,
  TaskStoreConfig,
} from '../src/index.js';
import { MCPClient, MCPTool } from '../src/types.js';

const tools: MCPTool[] = [
  {
    name: 'things_search',
    description: 'Search todos and projects',
    inputSchema: { properties: { query: {}, limit: {} } },
  },
  {
    name: 'things_create',
    description: 'Create a todo',
    inputSchema: { properties: { title: {}, notes: {} } },
  },
  {
    name: 'things_update',
    description: 'Update a todo',
    inputSchema: { properties: { id: {}, notes: {} } },
  },
];

const makeClient = () => {
  const callTool = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'things_search') {
      if (String(args.query).includes('summit://task/abc')) {
        return [{ id: 'existing-1', title: 'Existing Task' }];
      }
      return [{ id: 'search-1', title: 'Search Result' }];
    }
    if (name === 'things_create') {
      return [{ id: 'created-1', title: args.title, notes: args.notes }];
    }
    if (name === 'things_update') {
      return [{ id: args.id, notes: args.notes ?? 'updated' }];
    }
    return [];
  });
  const client: MCPClient = {
    listTools: async () => ({ tools }),
    callTool,
  };
  return { client, callTool };
};

const baseConfig: TaskStoreConfig = {
  policy: { allowedOperations: ['search', 'create', 'update'], writeEnabled: true },
  evidence: { enabled: false },
};

describe('Things3TaskStore utilities', () => {
  it('hashes requests deterministically regardless of key order', () => {
    const first = hashRequest({ a: 1, b: 2 });
    const second = hashRequest({ b: 2, a: 1 });
    expect(first).toEqual(second);
  });

  it('redacts token-like keys recursively', () => {
    const payload = {
      token: 'secret',
      nested: { password: 'hidden', keep: 'ok' },
    };
    expect(redact(payload)).toEqual({
      token: '[REDACTED]',
      nested: { password: '[REDACTED]', keep: 'ok' },
    });
  });

  it('maps search args using tool schema', () => {
    const args = buildSearchArgs(tools[0], 'needle', { limit: 5 });
    expect(args).toEqual({ query: 'needle', limit: 5 });
  });
});

describe('Things3TaskStore integration with MCP client', () => {
  it('enforces idempotent create based on marker search', async () => {
    const { client, callTool } = makeClient();
    const store = await Things3TaskStore.create(client, baseConfig);
    const created = await store.createTask(
      { title: 'New Task', notes: 'hello' },
      'abc',
    );
    expect(created.id).toEqual('existing-1');
    expect(callTool).toHaveBeenCalledWith(
      'things_search',
      expect.objectContaining({ query: idempotencyMarker('abc') }),
    );
    expect(callTool).not.toHaveBeenCalledWith('things_create', expect.anything());
  });

  it('updates tasks through the update tool', async () => {
    const { client, callTool } = makeClient();
    const store = await Things3TaskStore.create(client, baseConfig);
    const updated = await store.updateTask(
      { id: 'task-1', status: 'open' },
      { notes: 'updated notes' },
      { expectedStatus: 'open', moveReason: 'adjusting scope' },
    );
    expect(updated.id).toEqual('task-1');
    expect(callTool).toHaveBeenCalledWith('things_update', {
      id: 'task-1',
      notes: 'updated notes',
    });
  });
});

describe('Policy gating', () => {
  it('blocks write operations when disabled', async () => {
    const { client } = makeClient();
    const store = await Things3TaskStore.create(client, {
      policy: { allowedOperations: ['search', 'create'], writeEnabled: false },
      evidence: { enabled: false },
    });
    await expect(
      store.createTask({ title: 'blocked' }, 'id-1'),
    ).rejects.toThrow('Write operations are disabled');
  });
});
