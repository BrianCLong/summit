import BusinessRulesEngine from '../index.js';

describe('BusinessRulesEngine - Security (ReDoS Mitigation)', () => {
    let engine: BusinessRulesEngine;

    beforeEach(() => {
        engine = new BusinessRulesEngine();
    });

    describe('Expression Parsing Regressions', () => {
        test('should parse simple arithmetic', () => {
            expect(engine.evaluateExpression('1 + 2', {})).toBe(3);
            expect(engine.evaluateExpression('10 * 5', {})).toBe(50);
            expect(engine.evaluateExpression('100 / 4', {})).toBe(25);
            expect(engine.evaluateExpression('50 - 20', {})).toBe(30);
        });

        test('should parse comparisons', () => {
            expect(engine.evaluateExpression('5 > 3', {})).toBe(true);
            expect(engine.evaluateExpression('10 <= 10', {})).toBe(true);
            expect(engine.evaluateExpression('"a" == "a"', {})).toBe(true);
            expect(engine.evaluateExpression('"a" != "b"', {})).toBe(true);
        });

        test('should parse complex expressions', () => {
            expect(engine.evaluateExpression('2 * 3 + 4', {})).toBe(10);
            expect(engine.evaluateExpression('10 / 2 - 1', {})).toBe(4);
        });
    });

    describe('ReDoS Mitigations', () => {
        test('should enforce maximum expression length', () => {
            const longExpr = '1'.repeat(2049);
            expect(() => engine.evaluateExpression(longExpr, {})).toThrow(/exceeds maximum length/);
        });

        test('should handle ambiguous arithmetic without hanging', () => {
            // This is a classic ReDoS pattern if implemented with ambiguous regex
            // In the previous version, /^(.+?)([*/])(.+)$/ might have struggled
            const ambiguousExpr = '1 * ' + '1 * '.repeat(50) + '1';
            const start = Date.now();
            const result = engine.evaluateExpression(ambiguousExpr, {});
            const duration = Date.now() - start;

            expect(result).toBe(1);
            expect(duration).toBeLessThan(100); // Should be near-instant
        });

        test('should handle ambiguous comparisons without hanging', () => {
            const ambiguousComp = '1' + ' == 1'.repeat(50);
            const start = Date.now();
            const result = engine.evaluateExpression(ambiguousComp, {});
            const duration = Date.now() - start;

            expect(result).toBe(true);
            expect(duration).toBeLessThan(100);
        });

        test('should protect against unsafe "matches" regex length', () => {
            const longRegex = 'a*'.repeat(150) + 'b';
            const condition = {
                field: 'test',
                operator: 'matches',
                value: longRegex
            };

            // We need to use evaluateRule which is private, or simulate via evaluateDecisionTable
            // Actually, BusinessRulesEngine has evaluateRule as well? Let's check.
            // If not, we can use a dummy decision table.

            const table = {
                name: 'TestTable',
                version: '1.0.0',
                hitPolicy: 'FIRST',
                inputs: [{ id: '1', name: 'test', label: 'Test', type: 'string' }],
                outputs: [{ id: '1', name: 'result', label: 'Result', type: 'string' }],
                rules: [{
                    id: '1',
                    description: 'Test Rule',
                    enabled: true,
                    conditions: [condition],
                    outputs: { result: 'matched' }
                }]
            };

            const registeredTable = engine.createDecisionTable(table);
            expect(() => engine.evaluateDecisionTable(registeredTable.id, { test: 'aaaaaaaaaaaaaaaaaaaaaaaa' }))
                .toThrow(/Regex pattern too long/);
        });
    });
});
