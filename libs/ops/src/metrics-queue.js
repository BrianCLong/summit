"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiss = exports.cacheHits = exports.queueProcessingDuration = exports.queueProcessed = exports.queueDepth = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.queueDepth = new prom_client_1.default.Gauge({
    name: 'queue_depth',
    help: 'pending jobs'
});
exports.queueProcessed = new prom_client_1.default.Counter({
    name: 'queue_processed_total',
    help: 'total jobs processed by the worker',
    labelNames: ['status', 'type']
});
exports.queueProcessingDuration = new prom_client_1.default.Histogram({
    name: 'queue_processing_seconds',
    help: 'job processing duration',
    labelNames: ['type'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
exports.cacheHits = new prom_client_1.default.Counter({
    name: 'cache_hits_total',
    help: 'cache hits'
});
exports.cacheMiss = new prom_client_1.default.Counter({
    name: 'cache_misses_total',
    help: 'cache misses'
});
