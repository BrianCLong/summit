import {
  Plugin,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginAPI,
  IPluginEventBus,
} from '@intelgraph/plugin-system';

/**
 * Create a mock plugin context for testing
 */
export function createMockContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    pluginId: 'test-plugin',
    version: '1.0.0',
    config: {},
    logger: createMockLogger(),
    storage: createMockStorage(),
    api: createMockAPI(),
    events: createMockEventBus() as any,
    ...overrides,
  };
}

/**
 * Create a mock logger
 */
export function createMockLogger(): PluginLogger {
  const logs: any[] = [];

  return {
    debug: (message, meta) => logs.push({ level: 'debug', message, meta }),
    info: (message, meta) => logs.push({ level: 'info', message, meta }),
    warn: (message, meta) => logs.push({ level: 'warn', message, meta }),
    error: (message, error, meta) => logs.push({ level: 'error', message, error, meta }),
  };
}

/**
 * Create a mock storage
 */
export function createMockStorage(): PluginStorage {
  const store = new Map<string, any>();

  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => { store.set(key, value); },
    delete: async (key) => { store.delete(key); },
    has: async (key) => store.has(key),
    keys: async () => Array.from(store.keys()),
    clear: async () => { store.clear(); },
  };
}

/**
 * Create a mock API client
 */
export function createMockAPI(): PluginAPI {
  return {
    request: async (endpoint: string, options?: any) => {
      return { success: true, data: {} } as any;
    },
    graphql: async (query: string, variables?: any) => {
      return { data: {} } as any;
    },
  };
}

/**
 * Create a mock event bus
 */
export function createMockEventBus(): any {
  const handlers = new Map<string, Set<Function>>();

  return {
    on: (event: string, handler: any) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off: (event: string, handler: any) => {
      handlers.get(event)?.delete(handler);
    },
    emit: async (event: string, ...args: any[]) => {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          await handler(...args);
        }
      }
    },
    once: (event: string, handler: any) => {
      const wrappedHandler = (...args: any[]) => {
        handler(...args);
        handlers.get(event)?.delete(wrappedHandler);
      };
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(wrappedHandler);
    },
  };
}

/**
 * Test plugin lifecycle
 */
export async function testPluginLifecycle(plugin: Plugin): Promise<void> {
  const context = createMockContext();

  // Test initialization
  await plugin.initialize(context);

  // Test start
  await plugin.start();

  // Test health check if available
  if (plugin.healthCheck) {
    const health = await plugin.healthCheck();
    if (!health.healthy) {
      throw new Error('Plugin health check failed');
    }
  }

  // Test stop
  await plugin.stop();

  // Test destroy
  await plugin.destroy();
}
