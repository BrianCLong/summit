"use strict";
/**
 * Tests for InferenceEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const InferenceEngine_1 = require("../src/engine/InferenceEngine");
describe('InferenceEngine', () => {
    let engine;
    let mockDriver;
    let mockSession;
    beforeEach(() => {
        mockSession = {
            run: jest.fn().mockResolvedValue({ records: [] }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        mockDriver = {
            session: jest.fn().mockReturnValue(mockSession),
        };
        engine = new InferenceEngine_1.InferenceEngine(mockDriver);
    });
    describe('createRule', () => {
        it('should create a transitive inference rule', async () => {
            const rule = await engine.createRule({
                name: 'Transitive Friendship',
                ruleType: 'transitive',
                pattern: '()-[:KNOWS]->()',
                conclusion: '()-[:KNOWS]->()',
                confidence: 0.8,
                enabled: true,
                priority: 10,
            });
            expect(rule.id).toBeDefined();
            expect(rule.name).toBe('Transitive Friendship');
            expect(rule.ruleType).toBe('transitive');
        });
    });
    describe('applyRule', () => {
        it('should apply transitive rule', async () => {
            const rule = {
                id: 'rule-1',
                name: 'Test Rule',
                ruleType: 'transitive',
                pattern: '()-[:KNOWS]->()',
                conclusion: '()-[:KNOWS]->()',
                confidence: 0.8,
                enabled: true,
                priority: 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            mockSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'sourceId')
                                return 'entity1';
                            if (key === 'targetId')
                                return 'entity2';
                            if (key === 'relId')
                                return 'rel-1';
                            return null;
                        },
                    },
                ],
            });
            const facts = await engine.applyRule(rule);
            expect(facts.length).toBeGreaterThan(0);
            expect(facts[0].factType).toBe('relationship');
        });
    });
});
