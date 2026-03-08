"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = generateManifest;
/**
 * Generate plugin.json manifest
 */
function generateManifest(config) {
    const manifest = {
        id: config.id,
        name: config.name,
        version: config.version,
        description: config.description,
        author: {
            name: config.author,
        },
        license: 'MIT',
        category: config.category,
        main: './dist/index.js',
        engineVersion: '>=1.0.0',
        permissions: ['read:data', 'write:data'],
        resources: {
            maxMemoryMB: 256,
            maxCpuPercent: 50,
            maxStorageMB: 100,
            maxNetworkMbps: 10,
        },
    };
    return JSON.stringify(manifest, null, 2);
}
