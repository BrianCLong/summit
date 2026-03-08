"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retractionsSlaBreaches = exports.retractionsDuration = exports.retractionsProcessed = void 0;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("./registry.js");
exports.retractionsProcessed = new prom_client_1.Counter({
    name: 'retractions_processed_total',
    help: 'Retraction jobs processed',
    labelNames: ['status'],
    registers: [registry_js_1.registry],
});
exports.retractionsDuration = new prom_client_1.Histogram({
    name: 'retractions_processing_seconds',
    help: 'Time from creation to processed',
    buckets: [60, 300, 1800, 3600, 86400, 259200],
    registers: [registry_js_1.registry],
});
exports.retractionsSlaBreaches = new prom_client_1.Counter({
    name: 'retractions_sla_breach_total',
    help: 'Retractions exceeding SLA window',
    registers: [registry_js_1.registry],
});
