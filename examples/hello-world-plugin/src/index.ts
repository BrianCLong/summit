/**
 * Hello World Plugin
 *
 * A minimal example plugin demonstrating Summit plugin architecture.
 * This plugin shows how to:
 * - Initialize a plugin with the PluginBuilder
 * - Handle lifecycle events (init, start, stop, destroy)
 * - Implement health checks
 * - Subscribe to platform events
 *
 * @module @summit-plugins/hello-world
 */

import { PluginBuilder } from "@intelgraph/plugin-sdk";
import type { PluginContext } from "@intelgraph/plugin-sdk";

// Store plugin context for use across lifecycle handlers
let ctx: PluginContext | null = null;

/**
 * Plugin configuration interface
 */
export interface HelloWorldConfig {
  greeting: string;
  enableEventLogging: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: HelloWorldConfig = {
  greeting: "Hello from Summit Plugin!",
  enableEventLogging: true,
};

/**
 * Create the Hello World plugin
 */
export function createHelloWorldPlugin(config: Partial<HelloWorldConfig> = {}) {
  const mergedConfig = { ...defaultConfig, ...config };

  return new PluginBuilder()
    .withMetadata({
      id: "hello-world",
      name: "Hello World Plugin",
      version: "1.0.0",
      description: "A minimal example plugin demonstrating Summit plugin architecture",
      author: { name: "Summit Team", email: "plugins@summit.io" },
      license: "MIT",
      category: "utility",
    })
    .requestPermissions("storage:read", "storage:write", "events:subscribe")
    .onInitialize(async (context: PluginContext) => {
      ctx = context;
      ctx.logger.info(mergedConfig.greeting);
      ctx.logger.info("Plugin initialized", { config: mergedConfig });

      // Store initialization timestamp
      await ctx.storage.set("initialized_at", new Date().toISOString());
    })
    .onStart(async () => {
      if (!ctx) return;

      ctx.logger.info("Plugin started");

      // Subscribe to platform events if enabled
      if (mergedConfig.enableEventLogging) {
        ctx.events.on("*", async (event: string, payload: unknown) => {
          ctx?.logger.debug("Event received", { event, payload });
        });
      }

      // Store start timestamp
      await ctx.storage.set("started_at", new Date().toISOString());
    })
    .onStop(async () => {
      if (!ctx) return;

      ctx.logger.info("Plugin stopping");
      await ctx.storage.set("stopped_at", new Date().toISOString());
    })
    .onDestroy(async () => {
      if (!ctx) return;

      ctx.logger.info("Plugin destroyed");
      ctx = null;
    })
    .onHealthCheck(async () => {
      const initTime = ctx ? await ctx.storage.get<string>("initialized_at") : null;
      const startTime = ctx ? await ctx.storage.get<string>("started_at") : null;

      return {
        healthy: ctx !== null,
        details: {
          initialized: !!initTime,
          started: !!startTime,
          uptime: startTime ? Date.now() - new Date(startTime).getTime() : 0,
        },
      };
    })
    .build();
}

// Export default plugin instance with default configuration
export default createHelloWorldPlugin();
