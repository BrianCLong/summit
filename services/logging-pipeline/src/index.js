"use strict";
/**
 * Logging Pipeline
 *
 * Unified audit event ingestion pipeline with backpressure handling.
 * Provides adapters for services to send normalized audit events.
 *
 * Features:
 * - Non-blocking event submission
 * - Backpressure signaling via Redis pub/sub
 * - Service adapters for common event patterns
 * - Event validation and normalization
 * - Dead letter queue for failed events
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAuditAdapter = exports.DEFAULT_SINK_CONFIG = exports.AuditSink = void 0;
exports.createAuditSink = createAuditSink;
exports.createServiceAdapter = createServiceAdapter;
// Re-export sink components
var audit_sink_js_1 = require("./sink/audit-sink.js");
Object.defineProperty(exports, "AuditSink", { enumerable: true, get: function () { return audit_sink_js_1.AuditSink; } });
Object.defineProperty(exports, "DEFAULT_SINK_CONFIG", { enumerable: true, get: function () { return audit_sink_js_1.DEFAULT_SINK_CONFIG; } });
// Re-export adapter components
var service_adapter_js_1 = require("./adapters/service-adapter.js");
Object.defineProperty(exports, "ServiceAuditAdapter", { enumerable: true, get: function () { return service_adapter_js_1.ServiceAuditAdapter; } });
/**
 * Create a configured audit sink
 */
async function createAuditSink(config) {
    const { AuditSink, DEFAULT_SINK_CONFIG } = await Promise.resolve().then(() => __importStar(require('./sink/audit-sink.js')));
    const sink = new AuditSink({
        redis: config.redis,
        queueName: config.queueName || DEFAULT_SINK_CONFIG.queueName,
        deadLetterQueueName: `${config.queueName || DEFAULT_SINK_CONFIG.queueName}:dlq`,
        maxRetries: DEFAULT_SINK_CONFIG.maxRetries,
        retryDelayMs: DEFAULT_SINK_CONFIG.retryDelayMs,
        backpressureChannel: DEFAULT_SINK_CONFIG.backpressureChannel,
        maxQueueSize: config.maxQueueSize || DEFAULT_SINK_CONFIG.maxQueueSize,
    });
    await sink.initialize();
    return sink;
}
/**
 * Create a service adapter
 */
function createServiceAdapter(config) {
    const { ServiceAuditAdapter } = require('./adapters/service-adapter.js');
    return new ServiceAuditAdapter({
        serviceId: config.serviceId,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        environment: config.environment,
        tenantId: config.tenantId,
        defaultTags: config.defaultTags,
        sink: config.sink,
    });
}
