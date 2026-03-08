"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const LinkAnalysisCanvas_1 = require("../LinkAnalysisCanvas");
// Mock d3
vitest_1.vi.mock('d3', () => {
    // Helper must be inside or hoisted
    const createChainable = () => {
        const chain = () => chain;
        chain.attr = () => chain;
        chain.style = () => chain;
        chain.text = () => chain;
        chain.on = () => chain;
        chain.call = () => chain;
        chain.data = () => chain;
        chain.join = () => chain;
        chain.append = () => chain;
        chain.selectAll = () => chain;
        chain.remove = () => chain;
        return chain;
    };
    return {
        select: createChainable(),
        zoom: () => ({
            scaleExtent: () => ({
                on: () => { },
            }),
        }),
        zoomIdentity: {},
        forceSimulation: () => ({
            force: () => ({
                force: () => ({
                    force: () => ({
                        force: () => ({
                            on: () => { },
                            stop: () => { },
                        }),
                    }),
                }),
            }),
            alphaTarget: () => ({ restart: () => { } }),
        }),
        forceLink: () => ({
            id: () => ({
                distance: () => { },
            }),
        }),
        forceManyBody: () => ({
            strength: () => { },
        }),
        forceCenter: () => { },
        forceCollide: () => { },
        drag: () => ({
            on: () => ({
                on: () => ({
                    on: () => { },
                }),
            }),
        }),
    };
});
const mockEntities = [
    { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.9, properties: {}, createdAt: '', updatedAt: '' },
    { id: '2', name: 'Acme Corp', type: 'ORGANIZATION', confidence: 0.95, properties: {}, createdAt: '', updatedAt: '' }
];
const mockEdges = [
    { id: 'e1', sourceId: '1', targetId: '2', type: 'WORKS_FOR', confidence: 0.9, properties: {}, createdAt: '', direction: 'OUTGOING' },
];
(0, vitest_1.describe)('LinkAnalysisCanvas', () => {
    (0, vitest_1.it)('renders without crashing', () => {
        (0, react_2.render)(<LinkAnalysisCanvas_1.LinkAnalysisCanvas nodes={mockEntities} edges={mockEdges}/>);
    });
});
