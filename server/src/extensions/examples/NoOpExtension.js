"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpExtensionCode = exports.NoOpExtensionManifest = void 0;
exports.NoOpExtensionManifest = {
    id: 'noop-extension',
    name: 'No-Op Extension',
    version: '1.0.0',
    description: 'An extension that does nothing.',
    permissions: [],
    entryPoint: 'internal://noop',
};
exports.NoOpExtensionCode = `
  console.log("No-Op extension initialized.");
`;
