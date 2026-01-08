/**
 * Summit Plugin SDK
 *
 * Official SDK for building plugins for the Summit Platform.
 * Provides utilities for plugin development, testing, and publishing.
 *
 * @example
 * ```typescript
 * import { PluginBuilder, createTestHarness } from '@summit/plugin-sdk';
 *
 * // Build a plugin
 * const plugin = new PluginBuilder('my-plugin')
 *   .withVersion('1.0.0')
 *   .withHandler('onEvent', async (ctx, event) => {
 *     ctx.logger.info('Event received', { event });
 *   })
 *   .build();
 *
 * // Test the plugin
 * const harness = createTestHarness();
 * await harness.load(plugin);
 * await harness.initialize();
 * await harness.start();
 * ```
 *
 * @module @summit/plugin-sdk
 */

// Re-export types from plugin-system
export type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginAPI,
  PluginEventBus,
  PluginPermission,
  PluginState,
} from "@intelgraph/plugin-system";

export { PluginManifestSchema } from "@intelgraph/plugin-system";

// SDK utilities
export { PluginBuilder, createPlugin } from "./PluginBuilder.js";
export * from "./decorators.js";

// Testing utilities
export * from "./testing/PluginTestUtils.js";
export {
  PluginTestHarness,
  PluginTestSuite,
  createTestHarness,
  createTestSuite,
  type TestablePlugin,
  type PluginRequest,
  type PluginResponse,
  type MockPluginContext,
  type MockLogger,
  type MockStorage,
  type MockAPI,
  type MockEventBus,
  type MockSecrets,
  type MockMetrics,
  type LogEntry,
  type RequestHistoryEntry,
  type EmittedEvent,
  type MetricEntry,
  type TestResult,
  type TestSuiteResult,
  type HarnessOptions,
} from "./testing/PluginTestHarness.js";

// Template generators
export { generatePluginTemplate } from "./templates/PluginTemplate.js";
export { generateManifest } from "./templates/ManifestGenerator.js";
