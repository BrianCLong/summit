"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ExportService_js_1 = require("../ExportService.js");
(0, globals_1.describe)('ExportService', () => {
    const service = new ExportService_js_1.ExportService({ kAnonymityThreshold: 3 });
    (0, globals_1.it)('should export CSV with safe data', () => {
        const data = [
            { group: 'A', count: 10 },
            { group: 'B', count: 5 }
        ];
        const csv = service.exportToCSV(data);
        // Header is sorted: count, group
        // So rows are: 10,"A" and 5,"B"
        (0, globals_1.expect)(csv).toContain('10,"A"');
        (0, globals_1.expect)(csv).toContain('5,"B"');
        (0, globals_1.expect)(csv).toContain('count,group'); // Header sorted
    });
    (0, globals_1.it)('should suppress small groups', () => {
        const data = [
            { group: 'A', count: 10 },
            { group: 'C', count: 1 } // Should be dropped (1 < 3)
        ];
        const csv = service.exportToCSV(data);
        (0, globals_1.expect)(csv).toContain('A');
        (0, globals_1.expect)(csv).not.toContain('C');
    });
});
