"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const merge_js_1 = require("../src/prov/merge.js");
describe('Graph invariants', () => {
    it('no dangling edges after add/remove cycles', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.record({ from: fast_check_1.default.uuid(), to: fast_check_1.default.uuid() }), {
            minLength: 1,
            maxLength: 30,
        }), (edges) => {
            const nodes = new Set();
            edges.forEach((e) => {
                nodes.add(e.from);
                nodes.add(e.to);
            });
            const g = [...nodes].reduce((acc, id) => (0, merge_js_1.addNode)(acc, id), {
                nodes: [],
                edges: [],
            });
            const g2 = edges.reduce((acc, e) => (0, merge_js_1.addEdge)(acc, e.from, e.to), g);
            const ids = new Set(g2.nodes.map((n) => n.id));
            expect(g2.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
        }), { numRuns: 200 });
    });
    it('Merkle root stable over permutation', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.string(), { minLength: 1, maxLength: 50 }), (arr) => {
            const a = (0, merge_js_1.computeMerkleRoot)(arr);
            const b = (0, merge_js_1.computeMerkleRoot)(fast_check_1.default.sample(fast_check_1.default.shuffledSubarray(arr, {
                minLength: arr.length,
                maxLength: arr.length,
            }))[0]);
            expect(a).toEqual(b);
        }));
    });
});
