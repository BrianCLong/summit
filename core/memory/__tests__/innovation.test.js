"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const forgetting_1 = require("../forgetting");
const pack_1 = require("../portability/pack");
const verify_1 = require("../portability/verify");
describe('Innovation Features', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    describe('Mutual Forgetting (Decay)', () => {
        const record = {
            userId: 'u1',
            id: 'r1',
            content: 'test',
            facets: {},
            purpose: 'assist',
            contextSpace: 'personal',
            sources: [],
            createdAt: Date.now() - (1000 * 60 * 60 * 10), // 10 hours ago
            expiresAt: Date.now() + 100000,
            visibility: 'user'
        };
        test('should return 1.0 when flag is OFF', () => {
            process.env.MEMORY_FORGETTING_ENABLED = 'false';
            expect((0, forgetting_1.calculateRelevance)(record)).toBe(1.0);
        });
        test('should return < 1.0 when flag is ON', () => {
            process.env.MEMORY_FORGETTING_ENABLED = 'true';
            expect((0, forgetting_1.calculateRelevance)(record)).toBeLessThan(1.0);
        });
    });
    describe('Portability', () => {
        const memories = [];
        test('should throw if flag is OFF', () => {
            process.env.MEMORY_PORTABILITY_ENABLED = 'false';
            expect(() => (0, pack_1.pack)('u1', 'personal', memories)).toThrow(/disabled/);
        });
        test('should pack and verify if flag is ON', () => {
            process.env.MEMORY_PORTABILITY_ENABLED = 'true';
            const bundle = (0, pack_1.pack)('u1', 'personal', memories);
            expect(bundle.signature).toBeDefined();
            expect((0, verify_1.verify)(bundle)).toBe(true);
        });
    });
});
