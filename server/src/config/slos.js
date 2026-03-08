"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORE_SLOS = void 0;
exports.getSloByName = getSloByName;
exports.CORE_SLOS = [
    {
        name: 'api_search_latency',
        description: '99% of /api/v1/search requests complete in < 2s',
        target: 0.99,
        periodDays: 30,
        type: 'latency',
        threshold: 2000,
        filter: { route: '/api/v1/search' },
    },
    {
        name: 'maestro_run_success',
        description: '99.5% of Maestro runs complete successfully',
        target: 0.995,
        periodDays: 30,
        type: 'availability',
        filter: { service: 'maestro' },
    },
    {
        name: 'ingestion_pipeline_success',
        description: '99% of ingestion pipeline runs complete without failure',
        target: 0.99,
        periodDays: 30,
        type: 'availability',
        filter: { service: 'ingestion' },
    },
    {
        name: 'graph_query_latency',
        description: '95% of graph queries complete in < 500ms',
        target: 0.95,
        periodDays: 7,
        type: 'latency',
        threshold: 500,
        filter: { service: 'graph' },
    },
];
function getSloByName(name) {
    return exports.CORE_SLOS.find(s => s.name === name);
}
