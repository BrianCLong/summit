"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.PluginHostAPI = exports.PluginHostService = void 0;
var PluginHostService_js_1 = require("./PluginHostService.js");
Object.defineProperty(exports, "PluginHostService", { enumerable: true, get: function () { return PluginHostService_js_1.PluginHostService; } });
var PluginHostAPI_js_1 = require("./api/PluginHostAPI.js");
Object.defineProperty(exports, "PluginHostAPI", { enumerable: true, get: function () { return PluginHostAPI_js_1.PluginHostAPI; } });
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return types_js_1.createLogger; } });
/**
 * Example usage:
 *
 * ```typescript
 * import { PluginHostService, PluginHostAPI, createLogger } from '@intelgraph/plugin-host';
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
