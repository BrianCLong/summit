"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivePreview = void 0;
// @ts-nocheck - React 18/19 type compatibility
const react_1 = __importStar(require("react"));
const testing_1 = require("@apollo/client/testing");
const testing_2 = require("@apollo/client/testing");
const material_1 = require("@mui/material");
const QueryBuilderPreview_1 = __importStar(require("./QueryBuilderPreview"));
const meta = {
    title: 'Search/QueryBuilderPreview',
    component: QueryBuilderPreview_1.QueryBuilderPreview,
    parameters: {
        layout: 'fullscreen',
    },
};
exports.default = meta;
const baseChips = [
    { id: 'c1', field: 'type', operator: 'equals', value: 'Person', type: 'filter' },
    { id: 'c2', field: 'risk_score', operator: 'greater than', value: '0.7', type: 'filter' },
];
// Extract component to satisfy React Hooks rules
function LivePreviewComponent() {
    const subscriptionLink = (0, react_1.useMemo)(() => new testing_2.MockSubscriptionLink(), []);
    (0, react_1.useEffect)(() => {
        let secondTimer;
        const firstTimer = window.setTimeout(() => {
            subscriptionLink.simulateResult({
                result: {
                    data: {
                        graphQueryPreview: {
                            eventId: 'event-1',
                            partial: true,
                            progress: { completed: 1, total: 3, percentage: 33.3 },
                            statistics: { nodeCount: 2, edgeCount: 1 },
                            nodes: [
                                { id: 'n1', label: 'Alex Rivera', type: 'Person' },
                                { id: 'n2', label: 'Helios Labs', type: 'Organization' },
                            ],
                            edges: [
                                { id: 'e1', source: 'n1', target: 'n2', type: 'EMPLOYED_BY' },
                            ],
                            errors: null,
                        },
                    },
                },
            });
            secondTimer = window.setTimeout(() => {
                subscriptionLink.simulateResult({
                    result: {
                        data: {
                            graphQueryPreview: {
                                eventId: 'event-2',
                                partial: false,
                                progress: { completed: 3, total: 3, percentage: 100 },
                                statistics: { nodeCount: 4, edgeCount: 3 },
                                nodes: [
                                    { id: 'n1', label: 'Alex Rivera', type: 'Person' },
                                    { id: 'n2', label: 'Helios Labs', type: 'Organization' },
                                    { id: 'n3', label: 'Ivy Chen', type: 'Person' },
                                    { id: 'n4', label: 'Frontier Holdings', type: 'Organization' },
                                ],
                                edges: [
                                    { id: 'e1', source: 'n1', target: 'n2', type: 'EMPLOYED_BY' },
                                    { id: 'e2', source: 'n3', target: 'n4', type: 'CONSULTS_FOR' },
                                    { id: 'e3', source: 'n1', target: 'n3', type: 'KNOWS' },
                                ],
                                errors: null,
                            },
                        },
                    },
                });
            }, 1200);
        }, 400);
        return () => {
            window.clearTimeout(firstTimer);
            if (secondTimer) {
                window.clearTimeout(secondTimer);
            }
        };
    }, [subscriptionLink]);
    return (<testing_1.MockedProvider link={subscriptionLink}>
      <material_1.Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <QueryBuilderPreview_1.default initialChips={baseChips}/>
      </material_1.Box>
    </testing_1.MockedProvider>);
}
exports.LivePreview = {
    render: () => <LivePreviewComponent />,
};
