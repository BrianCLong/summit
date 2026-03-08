"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const scanner_js_1 = require("../../src/pii/scanner.js");
class NoopClassificationEngine {
    async classify() {
        return { entities: [], summary: { entities: 0, byType: {} }, stats: {} };
    }
}
(0, globals_1.describe)('BulkScanner walk handling', () => {
    (0, globals_1.it)('handles deeply nested records without recursion blowup', async () => {
        let value = 'leaf-value';
        for (let i = 0; i < 1500; i += 1) {
            value = { [`level-${i}`]: value };
        }
        const scanner = new scanner_js_1.BulkScanner(new NoopClassificationEngine());
        const report = await scanner.scan([
            {
                id: 'deep',
                value,
                tableName: 'deep_record',
                schema: { name: 'deep', fields: [] },
            },
        ], { includeUnchanged: true });
        (0, globals_1.expect)(report.results).toHaveLength(1);
        (0, globals_1.expect)(report.results[0].detected).toHaveLength(0);
        (0, globals_1.expect)(report.results[0].changed).toBe(true);
    });
});
