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
exports.neo4jIdleConnections = exports.neo4jActiveConnections = exports.neo4jConnectivityUp = exports.neo4jQueryLatencyMs = exports.neo4jQueryErrorsTotal = exports.neo4jQueryTotal = void 0;
const promClient = __importStar(require("prom-client"));
const metrics_js_1 = require("../monitoring/metrics.js");
const client = promClient.default || promClient;
function createHistogram(config) {
    try {
        return new client.Histogram(config);
    }
    catch (e) {
        return {
            observe: () => { },
            startTimer: () => () => { },
            labels: () => ({ observe: () => { } }),
            reset: () => { }
        };
    }
}
function createCounter(config) {
    try {
        return new client.Counter(config);
    }
    catch (e) {
        return {
            inc: () => { },
            labels: () => ({ inc: () => { } }),
            reset: () => { }
        };
    }
}
function createGauge(config) {
    try {
        return new client.Gauge(config);
    }
    catch (e) {
        return {
            inc: () => { },
            dec: () => { },
            set: () => { },
            labels: () => ({ inc: () => { }, dec: () => { }, set: () => { } }),
            reset: () => { }
        };
    }
}
exports.neo4jQueryTotal = createCounter({
    name: 'neo4j_query_total',
    help: 'Total number of Neo4j queries executed',
    labelNames: ['operation', 'label', 'tenant_id'],
});
exports.neo4jQueryErrorsTotal = createCounter({
    name: 'neo4j_query_errors_total',
    help: 'Total number of Neo4j query errors',
    labelNames: ['operation', 'label', 'tenant_id'],
});
exports.neo4jQueryLatencyMs = createHistogram({
    name: 'neo4j_query_latency_ms',
    help: 'Latency of Neo4j queries in milliseconds',
    labelNames: ['operation', 'label', 'tenant_id'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});
exports.neo4jConnectivityUp = createGauge({
    name: 'neo4j_connectivity_up',
    help: 'Neo4j connectivity status (1=up, 0=down)',
});
exports.neo4jActiveConnections = createGauge({
    name: 'neo4j_active_connections',
    help: 'Number of active connections in the Neo4j pool',
});
exports.neo4jIdleConnections = createGauge({
    name: 'neo4j_idle_connections',
    help: 'Number of idle connections in the Neo4j pool',
});
try {
    metrics_js_1.register.registerMetric(exports.neo4jQueryTotal);
    metrics_js_1.register.registerMetric(exports.neo4jQueryErrorsTotal);
    metrics_js_1.register.registerMetric(exports.neo4jQueryLatencyMs);
    metrics_js_1.register.registerMetric(exports.neo4jConnectivityUp);
    metrics_js_1.register.registerMetric(exports.neo4jActiveConnections);
    metrics_js_1.register.registerMetric(exports.neo4jIdleConnections);
}
catch (e) { }
