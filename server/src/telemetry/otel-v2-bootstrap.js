"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = void 0;
exports.initializeOTelV2 = initializeOTelV2;
exports.shutdownOTel = shutdownOTel;
/**
 * No-op OpenTelemetry v2 Bootstrap (API-compatible)
 */
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// No-op placeholders
const resource = { attributes: {} };
const traceExporter = {};
const metricReader = {};
// No-op SDK
const sdk = {
    start: async () => { },
    shutdown: async () => { },
};
exports.sdk = sdk;
// Initialize OpenTelemetry v2
function initializeOTelV2() {
    try {
        logger_js_1.default.info('OTel v2 disabled (no-op).');
        sdk.start();
    }
    catch (error) {
        logger_js_1.default.warn('Failed to initialize OTel v2 (no-op path)', { error: error.message });
    }
}
// Graceful shutdown
function shutdownOTel() { return sdk.shutdown(); }
// Process signal handlers
process.on('SIGTERM', () => {
    sdk.shutdown().finally(() => process.exit(0));
});
