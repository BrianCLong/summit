"use strict";
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
exports.doclingQuality = exports.doclingCacheGauge = exports.doclingSuccess = exports.doclingCost = exports.doclingChars = exports.doclingLatency = exports.register = void 0;
const prom_client_1 = __importStar(require("prom-client"));
exports.register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
exports.doclingLatency = new prom_client_1.Histogram({
    name: 'docling_inference_latency_seconds',
    help: 'Latency of granite-docling requests',
    labelNames: ['operation', 'tenant_id', 'purpose'],
    registers: [exports.register],
    buckets: [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1, 1.5, 2, 3],
});
exports.doclingChars = new prom_client_1.Counter({
    name: 'docling_processed_characters_total',
    help: 'Characters processed by operation',
    labelNames: ['operation', 'tenant_id'],
    registers: [exports.register],
});
exports.doclingCost = new prom_client_1.Counter({
    name: 'docling_cost_usd_total',
    help: 'USD cost accrued per tenant',
    labelNames: ['tenant_id', 'purpose'],
    registers: [exports.register],
});
exports.doclingSuccess = new prom_client_1.Counter({
    name: 'docling_requests_total',
    help: 'Request count by outcome',
    labelNames: ['operation', 'status'],
    registers: [exports.register],
});
exports.doclingCacheGauge = new prom_client_1.Gauge({
    name: 'docling_cache_entries',
    help: 'Number of entries in request cache',
    registers: [exports.register],
});
exports.doclingQuality = new prom_client_1.Histogram({
    name: 'docling_quality_signal',
    help: 'Quality signal distribution (0-1)',
    labelNames: ['signal'],
    registers: [exports.register],
    buckets: [0.1, 0.25, 0.4, 0.5, 0.65, 0.8, 0.9, 1],
});
