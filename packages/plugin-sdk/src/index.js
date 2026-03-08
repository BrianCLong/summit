"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = exports.generatePluginTemplate = exports.createTestSuite = exports.createTestHarness = exports.PluginTestSuite = exports.PluginTestHarness = exports.createPlugin = exports.PluginBuilder = exports.PluginManifestSchema = void 0;
var plugin_system_1 = require("@intelgraph/plugin-system");
Object.defineProperty(exports, "PluginManifestSchema", { enumerable: true, get: function () { return plugin_system_1.PluginManifestSchema; } });
// SDK utilities
var PluginBuilder_js_1 = require("./PluginBuilder.js");
Object.defineProperty(exports, "PluginBuilder", { enumerable: true, get: function () { return PluginBuilder_js_1.PluginBuilder; } });
Object.defineProperty(exports, "createPlugin", { enumerable: true, get: function () { return PluginBuilder_js_1.createPlugin; } });
__exportStar(require("./decorators.js"), exports);
// Testing utilities
__exportStar(require("./testing/PluginTestUtils.js"), exports);
var PluginTestHarness_js_1 = require("./testing/PluginTestHarness.js");
Object.defineProperty(exports, "PluginTestHarness", { enumerable: true, get: function () { return PluginTestHarness_js_1.PluginTestHarness; } });
Object.defineProperty(exports, "PluginTestSuite", { enumerable: true, get: function () { return PluginTestHarness_js_1.PluginTestSuite; } });
Object.defineProperty(exports, "createTestHarness", { enumerable: true, get: function () { return PluginTestHarness_js_1.createTestHarness; } });
Object.defineProperty(exports, "createTestSuite", { enumerable: true, get: function () { return PluginTestHarness_js_1.createTestSuite; } });
// Template generators
var PluginTemplate_js_1 = require("./templates/PluginTemplate.js");
Object.defineProperty(exports, "generatePluginTemplate", { enumerable: true, get: function () { return PluginTemplate_js_1.generatePluginTemplate; } });
var ManifestGenerator_js_1 = require("./templates/ManifestGenerator.js");
Object.defineProperty(exports, "generateManifest", { enumerable: true, get: function () { return ManifestGenerator_js_1.generateManifest; } });
