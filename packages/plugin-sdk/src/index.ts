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
} from '@summit/plugin-system';

// SDK utilities
export { PluginBuilder, createPlugin } from './PluginBuilder.js';
export * from './decorators.js';
export * from './testing/PluginTestUtils.js';

// Template generators
export { generatePluginTemplate } from './templates/PluginTemplate.js';
export { generateManifest } from './templates/ManifestGenerator.js';
