"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolHeartbeats = exports.poolEgressUsd = exports.poolGbUsd = exports.poolCpuUsd = exports.poolInfo = void 0;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("./registry.js");
exports.poolInfo = new prom_client_1.Gauge({
    name: 'maestro_pool_info',
    help: 'Registered pools (labels only)',
    labelNames: ['pool', 'region'],
    registers: [registry_js_1.registry],
});
exports.poolCpuUsd = new prom_client_1.Gauge({
    name: 'maestro_pool_cpu_sec_usd',
    help: 'CPU-second price by pool',
    labelNames: ['pool'],
    registers: [registry_js_1.registry],
});
exports.poolGbUsd = new prom_client_1.Gauge({
    name: 'maestro_pool_gb_sec_usd',
    help: 'GB-second price by pool',
    labelNames: ['pool'],
    registers: [registry_js_1.registry],
});
exports.poolEgressUsd = new prom_client_1.Gauge({
    name: 'maestro_pool_egress_gb_usd',
    help: 'Egress GB price by pool',
    labelNames: ['pool'],
    registers: [registry_js_1.registry],
});
exports.poolHeartbeats = new prom_client_1.Counter({
    name: 'maestro_pool_heartbeats_total',
    help: 'Pool heartbeat counter',
    labelNames: ['pool'],
    registers: [registry_js_1.registry],
});
