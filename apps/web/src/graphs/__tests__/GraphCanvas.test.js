"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const GraphCanvas_1 = require("../GraphCanvas");
// Mock D3 modules to avoid JSDOM issues with SVG methods if necessary,
// but for now let's see if it mounts with basic stubs.
// Actually, d3-force simulation runs a timer which might need cleanup or mocking.
const MOCK_ENTITIES = [
    { id: '1', name: 'Test', type: 'PERSON', confidence: 1, properties: {}, createdAt: '', updatedAt: '' }
];
const MOCK_RELATIONSHIPS = [];
const MOCK_LAYOUT = { type: 'force', settings: {} };
(0, vitest_1.describe)('GraphCanvas', () => {
    (0, vitest_1.it)('renders without crashing', () => {
        const { container } = (0, react_2.render)(<GraphCanvas_1.GraphCanvas entities={MOCK_ENTITIES} relationships={MOCK_RELATIONSHIPS} layout={MOCK_LAYOUT}/>);
        (0, vitest_1.expect)(container.querySelector('svg')).toBeDefined();
    });
});
