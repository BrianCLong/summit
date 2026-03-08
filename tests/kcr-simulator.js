"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../src/kcr/index");
const config = {
    defaultJurisdiction: 'US',
    sources: [
        {
            id: 'snapshot-global-2021',
            type: 'snapshot',
            knowledgeCutoff: new Date('2021-09-30T00:00:00Z'),
            validFrom: new Date('2020-01-01T00:00:00Z'),
            jurisdictions: ['*'],
            freshnessRisk: 'low',
        },
        {
            id: 'model-us-2023',
            type: 'model',
            knowledgeCutoff: new Date('2023-11-30T00:00:00Z'),
            validFrom: new Date('2023-01-01T00:00:00Z'),
            jurisdictions: ['US'],
            freshnessRisk: 'medium',
        },
        {
            id: 'snapshot-us-2024-safe',
            type: 'snapshot',
            knowledgeCutoff: new Date('2024-05-15T00:00:00Z'),
            validFrom: new Date('2023-08-01T00:00:00Z'),
            jurisdictions: ['US'],
            freshnessRisk: 'low',
        },
        {
            id: 'model-us-2024-fast',
            type: 'model',
            knowledgeCutoff: new Date('2024-06-01T00:00:00Z'),
            validFrom: new Date('2024-01-01T00:00:00Z'),
            jurisdictions: ['US'],
            freshnessRisk: 'high',
        },
        {
            id: 'model-us-2024-future',
            type: 'model',
            knowledgeCutoff: new Date('2024-09-01T00:00:00Z'),
            validFrom: new Date('2024-07-01T00:00:00Z'),
            jurisdictions: ['US'],
            freshnessRisk: 'medium',
        },
        {
            id: 'snapshot-eu-2024',
            type: 'snapshot',
            knowledgeCutoff: new Date('2024-01-10T00:00:00Z'),
            validFrom: new Date('2023-06-01T00:00:00Z'),
            jurisdictions: ['EU'],
            freshnessRisk: 'low',
        },
    ],
};
const router = new index_1.KnowledgeCutoffRouter(config);
const simulator = new index_1.RoutingSimulator(router);
const labeledQueries = [
    {
        id: 'q1',
        requestedDate: new Date('2024-03-01T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'model-us-2023',
    },
    {
        id: 'q2',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'snapshot-us-2024-safe',
    },
    {
        id: 'q3',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
        riskTolerance: 'high',
        expectedSourceId: 'model-us-2024-fast',
    },
    {
        id: 'q4',
        requestedDate: new Date('2024-02-01T00:00:00Z'),
        jurisdiction: 'EU',
        expectedSourceId: 'snapshot-eu-2024',
    },
    {
        id: 'q5',
        requestedDate: new Date('2021-11-01T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'snapshot-global-2021',
    },
];
const summary = simulator.run(labeledQueries);
strict_1.default.equal(summary.correct, 5, 'all labeled queries should match expected sources');
strict_1.default.equal(summary.incorrect, 0, 'no mismatches expected');
strict_1.default.equal(summary.total, labeledQueries.length, 'total count should match input size');
const fallbackDecision = router.route({
    requestedDate: new Date('2024-06-15T00:00:00Z'),
    jurisdiction: 'US',
});
strict_1.default.equal(fallbackDecision.source.id, 'snapshot-us-2024-safe', 'router should fall back to the freshest permissible snapshot when risk tolerance is medium');
strict_1.default.ok(fallbackDecision.source.knowledgeCutoff.getTime() <=
    new Date('2024-06-15T00:00:00Z').getTime(), 'router must never select knowledge after the requested date');
const deterministicFirst = simulator.run(labeledQueries);
const deterministicSecond = simulator.run(labeledQueries);
strict_1.default.deepEqual(deterministicFirst, deterministicSecond, 'simulator should be deterministic for identical inputs');
console.log('KCR simulator tests passed');
