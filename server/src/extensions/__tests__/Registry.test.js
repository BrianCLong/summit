"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const registry_js_1 = require("../registry.js");
const NoOpExtension_js_1 = require("../examples/NoOpExtension.js");
(0, globals_1.describe)('ExtensionRegistry', () => {
    (0, globals_1.beforeEach)(async () => {
        // Reset registry (using a hack or public method if available, but currently it's a singleton without reset)
        // The current implementation doesn't have a clear/reset method.
        // I should check if I can add one or if I have to uninstall.
        // I'll try uninstall if it exists.
        const list = await registry_js_1.extensionRegistry.list();
        for (const ext of list) {
            await registry_js_1.extensionRegistry.uninstall(ext.id);
        }
    });
    (0, globals_1.it)('should register an extension', async () => {
        await registry_js_1.extensionRegistry.register(NoOpExtension_js_1.NoOpExtensionManifest);
        const retrieved = await registry_js_1.extensionRegistry.get(NoOpExtension_js_1.NoOpExtensionManifest.id);
        (0, globals_1.expect)(retrieved).toEqual(NoOpExtension_js_1.NoOpExtensionManifest);
    });
    (0, globals_1.it)('should list extensions', async () => {
        await registry_js_1.extensionRegistry.register(NoOpExtension_js_1.NoOpExtensionManifest);
        const list = await registry_js_1.extensionRegistry.list();
        (0, globals_1.expect)(list).toHaveLength(1);
        (0, globals_1.expect)(list[0]).toEqual(NoOpExtension_js_1.NoOpExtensionManifest);
    });
    (0, globals_1.it)('should uninstall an extension', async () => {
        await registry_js_1.extensionRegistry.register(NoOpExtension_js_1.NoOpExtensionManifest);
        await registry_js_1.extensionRegistry.uninstall(NoOpExtension_js_1.NoOpExtensionManifest.id);
        const retrieved = await registry_js_1.extensionRegistry.get(NoOpExtension_js_1.NoOpExtensionManifest.id);
        (0, globals_1.expect)(retrieved).toBeNull();
    });
});
