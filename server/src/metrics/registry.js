"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
const prom_client_1 = require("prom-client");
const g = globalThis;
if (!g.__intelgraph_metrics_inited) {
    // Prefix your metrics to avoid collisions
    (0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register, prefix: 'intelgraph_' });
    g.__intelgraph_metrics_inited = true;
}
exports.registry = prom_client_1.register;
