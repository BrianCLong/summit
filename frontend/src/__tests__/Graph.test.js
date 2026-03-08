"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const Graph_1 = __importDefault(require("../Graph"));
const cytoscape_1 = __importDefault(require("cytoscape"));
vitest_1.vi.mock('cytoscape');
const mockedCytoscape = cytoscape_1.default;
(0, vitest_1.describe)('Graph', () => {
    (0, vitest_1.it)('uses deception heatmap style', () => {
        mockedCytoscape.mockReturnValue({
            on: vitest_1.vi.fn(),
            startBatch: vitest_1.vi.fn(),
            endBatch: vitest_1.vi.fn(),
            zoom: vitest_1.vi.fn().mockReturnValue(1),
            nodes: vitest_1.vi.fn().mockReturnValue({ style: vitest_1.vi.fn() }),
            edges: vitest_1.vi.fn().mockReturnValue({ style: vitest_1.vi.fn() }),
            elements: vitest_1.vi.fn().mockReturnValue({
                addClass: vitest_1.vi.fn(),
                removeClass: vitest_1.vi.fn(),
            }),
            json: vitest_1.vi.fn().mockReturnValue({ elements: [] }),
            destroy: vitest_1.vi.fn(),
            removeListener: vitest_1.vi.fn(),
        });
        (0, react_1.render)(<Graph_1.default elements={{ nodes: [], edges: [] }} neighborhoodMode={false}/>);
        const style = mockedCytoscape.mock.calls[0][0].style.find((s) => s.selector === 'node');
        (0, vitest_1.expect)(style.style['background-color']).toContain('deception_score');
    });
});
