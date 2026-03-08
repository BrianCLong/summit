"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paletteCandidateHistogram = exports.paletteSelectionLatency = exports.paletteUsedTotal = void 0;
const prom_client_1 = require("prom-client");
exports.paletteUsedTotal = new prom_client_1.Counter({
    name: 'palette_used_total',
    help: 'Total times a reasoning palette was applied',
    labelNames: ['paletteId'],
});
exports.paletteSelectionLatency = new prom_client_1.Histogram({
    name: 'palette_selection_latency_ms',
    help: 'Latency of palette selection in milliseconds',
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});
exports.paletteCandidateHistogram = new prom_client_1.Histogram({
    name: 'palette_k_candidates',
    help: 'Histogram of palette candidate counts when k>1',
    buckets: [1, 2, 3, 4, 5, 10],
});
