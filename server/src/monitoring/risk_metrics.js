"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRecomputeLatency = exports.riskScoreDist = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.riskScoreDist = new prom_client_1.default.Histogram({
    name: 'risk_score_distribution',
    help: 'Risk score distribution',
    buckets: [0, 0.25, 0.5, 0.75, 1],
});
exports.riskRecomputeLatency = new prom_client_1.default.Histogram({
    name: 'risk_recompute_latency_ms',
    help: 'Latency of risk recompute',
    buckets: [10, 50, 100, 500, 1000],
});
