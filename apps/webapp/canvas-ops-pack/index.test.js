"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('canvas ops', () => {
    const graph = {
        nodes: [
            { id: 'a', time: 1, region: 'x' },
            { id: 'b', time: 2, region: 'y' },
            { id: 'c', time: 3, region: 'x' },
        ],
        edges: [
            { source: 'a', target: 'b' },
            { source: 'b', target: 'c' },
        ],
    };
    it('pivots to connected nodes', () => {
        expect((0, index_1.pivot)(graph, 'a').map((n) => n.id)).toEqual(['b']);
    });
    it('expands multiple nodes', () => {
        expect((0, index_1.expand)(graph, ['a']).map((n) => n.id)).toEqual(['b']);
    });
    it('filters by time', () => {
        expect((0, index_1.filterByTime)(graph.nodes, 2, 3).map((n) => n.id)).toEqual([
            'b',
            'c',
        ]);
    });
    it('filters by space', () => {
        expect((0, index_1.filterBySpace)(graph.nodes, 'x').map((n) => n.id)).toEqual([
            'a',
            'c',
        ]);
    });
    it('manages pinboard annotations', () => {
        const board = (0, index_1.createPinboard)('test', [graph.nodes[0]]);
        (0, index_1.addAnnotation)(board, 'note');
        expect(board.annotations).toEqual(['note']);
    });
});
