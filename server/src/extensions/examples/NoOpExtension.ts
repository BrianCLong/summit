import { ExtensionManifest, ExtensionExecutionMode, ExtensionState } from '../types';

export const NoOpExtensionManifest: ExtensionManifest = {
  id: 'noop-extension',
  name: 'No-Op Extension',
  version: '1.0.0',
  description: 'An extension that does nothing.',
  permissions: [],
  scopes: [],
  executionMode: ExtensionExecutionMode.READ_ONLY_QUERY,
  resources: {
    memoryLimitMb: 128,
    timeoutMs: 1000,
    networkAccess: false,
  },
  entryPoint: 'internal://noop',
};

export const NoOpExtensionCode = `
  console.log("No-Op extension initialized.");
`;
