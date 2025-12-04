export { PluginHostService, type PluginHostConfig } from './PluginHostService.js';
export { PluginHostAPI } from './api/PluginHostAPI.js';
export { createLogger, type Logger } from './types.js';

/**
 * Example usage:
 *
 * ```typescript
 * import { PluginHostService, PluginHostAPI, createLogger } from '@summit/plugin-host';
 *
 * const config = {
 *   platformVersion: '1.0.0',
 *   environment: 'development',
 *   security: { scanOnInstall: true, requireSignature: false },
 *   authorization: { provider: 'development' },
 *   monitoring: { healthCheckIntervalMs: 30000, autoDisableOnViolation: true },
 *   autoStart: { enabled: true, plugins: [] },
 * };
 *
 * const logger = createLogger('PluginHost');
 * const service = new PluginHostService(config, logger);
 * const api = new PluginHostAPI(service, logger);
 *
 * await service.start();
 * await api.start(3001);
 * ```
 */
