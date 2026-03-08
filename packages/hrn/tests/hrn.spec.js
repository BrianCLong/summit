"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
describe('HRN', () => {
    const nodes = [
        { id: 'node1', publicKey: 'pub1', weight: 1 },
        { id: 'node2', publicKey: 'pub2', weight: 1 },
        { id: 'node3', publicKey: 'pub3', weight: 1 },
    ];
    test('should issue and verify HIT with enough signatures', () => {
        const signatures = ['sig1', 'sig2']; // 2/3 of nodes
        const hit = (0, src_1.issueHIT)('subject1', nodes, signatures);
        expect(hit).toBeDefined();
        expect((0, src_1.verifyHIT)(hit, nodes)).toBe(true);
    });
    test('should throw error if not enough signatures', () => {
        const signatures = ['sig1']; // Less than 2/3
        expect(() => (0, src_1.issueHIT)('subject1', nodes, signatures)).toThrow('Not enough weighted signatures to issue HIT');
    });
});
