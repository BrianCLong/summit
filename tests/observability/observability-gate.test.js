"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ga_observability_gate_1 = require("../../scripts/observability/ga-observability-gate");
const fixtureConfigPath = node_path_1.default.resolve(__dirname, '../../config/slo.yaml');
describe('GA observability gate', () => {
    it('passes with the repository SLO source of truth', () => {
        const result = (0, ga_observability_gate_1.evaluateObservabilityGate)(fixtureConfigPath);
        expect(result.ok).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it('fails when a production-critical service is missing', () => {
        const tmpPath = node_path_1.default.join(__dirname, 'tmp-slo.json');
        const minimalConfig = {
            version: 1,
            error_budget_policy: {
                window_days: 30,
                fast_burn_rate: 6,
                slow_burn_rate: 1,
                actions: ['freeze'],
            },
            services: [
                {
                    name: 'api-gateway',
                    tier: 'critical',
                    metrics: {
                        availability: 'http_requests_total',
                        latency: 'http_request_duration_seconds',
                        errors: 'errors_total',
                    },
                    objectives: {
                        availability: 99.9,
                        latency_p95_ms: 500,
                        error_rate_percent: 0.5,
                    },
                },
            ],
        };
        node_fs_1.default.writeFileSync(tmpPath, JSON.stringify(minimalConfig, null, 2));
        try {
            const result = (0, ga_observability_gate_1.validateSloCoverage)(minimalConfig, [
                'api-gateway',
                'ingestion-pipeline',
            ]);
            expect(result.ok).toBe(false);
            expect(result.errors.join(' ')).toContain('ingestion-pipeline');
        }
        finally {
            node_fs_1.default.unlinkSync(tmpPath);
        }
    });
});
