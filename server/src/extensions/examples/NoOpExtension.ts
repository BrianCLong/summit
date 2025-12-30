// @ts-nocheck
import { ExtensionManifest } from '../types.js';

export const NoOpExtensionManifest: ExtensionManifest = {
  id: 'noop-extension',
  name: 'No-Op Extension',
  version: '1.0.0',
  description: 'An extension that does nothing.',
  permissions: [],
  entryPoint: 'internal://noop',
};

export const NoOpExtensionCode = `
  console.log("No-Op extension initialized.");
`;
