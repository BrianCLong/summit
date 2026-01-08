/* eslint-disable require-await, @typescript-eslint/no-non-null-assertion */
import {
  Plugin,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginAPI,
} from "@intelgraph/plugin-system";

/**
 * Create a mock plugin context for testing
 */
export function createMockContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    pluginId: "test-plugin",
    version: "1.0.0",
    config: {},
    logger: createMockLogger(),
    storage: createMockStorage(),
    api: createMockAPI(),
    events: createMockEventBus() as PluginContext["events"],
    ...overrides,
  };
}

/**
 * Create a mock logger
 */
export function createMockLogger(): PluginLogger {
  const logs: Array<{ level: string; message: string; meta?: unknown; error?: unknown }> = [];

  return {
    debug: (message: string, meta?: unknown) => logs.push({ level: "debug", message, meta }),
    info: (message: string, meta?: unknown) => logs.push({ level: "info", message, meta }),
    warn: (message: string, meta?: unknown) => logs.push({ level: "warn", message, meta }),
    error: (message: string, error?: unknown, meta?: unknown) =>
      logs.push({ level: "error", message, error, meta }),
  };
}

/**
 * Create a mock storage
 */
export function createMockStorage(): PluginStorage {
  const store = new Map<string, unknown>();

  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    has: async (key: string) => store.has(key),
    keys: async () => Array.from(store.keys()),
    clear: async () => {
      store.clear();
    },
  };
}

/**
 * Create a mock API client
 */
export function createMockAPI(): PluginAPI {
  return {
    request: async (_endpoint: string, _options?: unknown) => {
      return { success: true, data: {} } as unknown;
    },
    graphql: async (_query: string, _variables?: unknown) => {
      return { data: {} } as unknown;
    },
  };
}

type EventHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * Create a mock event bus
 */
export function createMockEventBus(): {
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  emit: (event: string, ...args: unknown[]) => Promise<void>;
  once: (event: string, handler: EventHandler) => void;
} {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    on: (event: string, handler: EventHandler) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off: (event: string, handler: EventHandler) => {
      handlers.get(event)?.delete(handler);
    },
    emit: async (event: string, ...args: unknown[]) => {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          await handler(...args);
        }
      }
    },
    once: (event: string, handler: EventHandler) => {
      const wrappedHandler = (...args: unknown[]) => {
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
      throw new Error("Plugin health check failed");
    }
  }

  // Test stop
  await plugin.stop();

  // Test destroy
  await plugin.destroy();
}
