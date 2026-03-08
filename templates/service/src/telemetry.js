"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const logger_js_1 = require("./utils/logger.js");
// Initialize OpenTelemetry SDK
const initTelemetry = (serviceName) => {
    // In a real scenario, you'd configure exporters here (e.g., OTLP)
    // For now, we just enable auto-instrumentation hooks
    const sdk = new sdk_node_1.NodeSDK({
        serviceName,
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    });
    sdk.start();
    logger_js_1.logger.info('OpenTelemetry initialized');
    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => logger_js_1.logger.info('Tracing terminated'))
            .catch((error) => logger_js_1.logger.error('Error terminating tracing', error))
            .finally(() => process.exit(0));
    });
};
exports.initTelemetry = initTelemetry;
