import { describe, it, expect } from '@jest/globals';
import { ExportService } from '../ExportService.js';

describe('ExportService', () => {
    const service = new ExportService({ kAnonymityThreshold: 3 });

    it('should export CSV with safe data', () => {
        const data = [
            { group: 'A', count: 10 },
            { group: 'B', count: 5 }
        ];
        const csv = service.exportToCSV(data);
        // Header is sorted: count, group
        // So rows are: 10,"A" and 5,"B"
        expect(csv).toContain('10,"A"');
        expect(csv).toContain('5,"B"');
        expect(csv).toContain('count,group'); // Header sorted
    });

    it('should suppress small groups', () => {
        const data = [
            { group: 'A', count: 10 },
            { group: 'C', count: 1 } // Should be dropped (1 < 3)
        ];
        const csv = service.exportToCSV(data);
        expect(csv).toContain('A');
        expect(csv).not.toContain('C');
    });
});
