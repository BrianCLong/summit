"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const server_1 = require("react-dom/server");
const vitest_1 = require("vitest");
const LineageDashboard_js_1 = require("./LineageDashboard.js");
const nodes = [
    {
        id: 'service:svc-api',
        type: 'service',
        data: {},
        provenance: {
            source: 'cmdb',
            ingress: 'database',
            observedAt: '2024-03-15T00:00:00Z',
            checksum: 'svc-api-checksum',
            traceId: 'trace-1',
        },
    },
    {
        id: 'service:svc-db',
        type: 'service',
        data: {},
    },
];
const edges = [
    {
        id: 'service:svc-api:DEPENDS_ON:service:svc-db',
        from: 'service:svc-api',
        to: 'service:svc-db',
        type: 'DEPENDS_ON',
        provenance: {
            source: 'graph-builder',
            ingress: 'ingestion',
            observedAt: '2024-03-20T00:00:00Z',
            checksum: 'edge-checksum',
        },
    },
];
(0, vitest_1.describe)('LineageDashboard', () => {
    (0, vitest_1.it)('renders lineage coverage and recent provenance', () => {
        const html = (0, server_1.renderToString)(<LineageDashboard_js_1.LineageDashboard nodes={nodes} edges={edges} lineage={{
                nodesWithProvenance: 1,
                edgesWithProvenance: 1,
                missingNodes: ['service:svc-db'],
                missingEdges: [],
            }}/>);
        (0, vitest_1.expect)(html).toContain('Lineage Coverage');
        (0, vitest_1.expect)(html).toContain('service:svc-db');
        (0, vitest_1.expect)(html).toContain('hash svc-api-c');
    });
});
