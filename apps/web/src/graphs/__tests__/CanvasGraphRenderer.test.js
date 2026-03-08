"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const CanvasGraphRenderer_1 = require("../CanvasGraphRenderer");
// Mock Worker API for jsdom environment
class MockWorker {
    onmessage = null;
    postMessage = vitest_1.vi.fn();
    terminate = vitest_1.vi.fn();
}
const originalWorker = globalThis.Worker;
(0, vitest_1.beforeAll)(() => {
    globalThis.Worker = MockWorker;
});
(0, vitest_1.afterAll)(() => {
    globalThis.Worker = originalWorker;
});
// Mock Entity and Relationship data
const MOCK_ENTITIES = [
    { id: '1', name: 'Test', type: 'PERSON', confidence: 1, properties: {}, createdAt: '', updatedAt: '' }
];
const MOCK_RELATIONSHIPS = [];
const MOCK_LAYOUT = { type: 'force', settings: {} };
(0, vitest_1.describe)('CanvasGraphRenderer', () => {
    (0, vitest_1.it)('renders a canvas element', () => {
        const { container } = (0, react_2.render)(<CanvasGraphRenderer_1.CanvasGraphRenderer entities={MOCK_ENTITIES} relationships={MOCK_RELATIONSHIPS} layout={MOCK_LAYOUT}/>);
        (0, vitest_1.expect)(container.querySelector('canvas')).toBeDefined();
    });
});
