"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dwell = exports.clicks = exports.impressions = void 0;
exports.logImpression = logImpression;
exports.logClick = logClick;
exports.logDwell = logDwell;
const prom_client_1 = require("prom-client");
exports.impressions = new prom_client_1.Counter({
    name: 'search_impressions_total',
    help: 'impressions',
    labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
exports.clicks = new prom_client_1.Counter({
    name: 'search_clicks_total',
    help: 'clicks',
    labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
exports.dwell = new prom_client_1.Histogram({
    name: 'search_dwell_seconds',
    help: 'dwell',
    labelNames: ['tenant', 'qhash', 'rank', 'doc'],
    buckets: [1, 3, 5, 10, 30, 60, 120],
});
function logImpression(tenant, qhash, rank, doc) {
    exports.impressions.inc({ tenant, qhash, rank, doc });
}
function logClick(tenant, qhash, rank, doc) {
    exports.clicks.inc({ tenant, qhash, rank, doc });
}
function logDwell(tenant, qhash, rank, doc, sec) {
    exports.dwell.observe({ tenant, qhash, rank, doc }, sec);
}
