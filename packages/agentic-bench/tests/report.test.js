const path = require('path');
const fs = require('fs');
const os = require('os');
const { writeReport } = require('../src/report.js');

const sampleReport = {
    generatedAt: '2026-01-03T00:00:00Z',
    results: [
        {
            task: {
                id: 't1',
                type: 'code',
                name: 'demo',
                description: 'demo task',
                repoPath: '.',
                issue: 'fix bug',
                expectedSummary: 'fixed',
                tests: []
            },
            pass: true,
            validation: { valid: true, errors: [] },
            notes: [],
            trajectory: {
                id: 't1',
                meta: { schema_version: '1.0.0', generator_version: '0.1.0' },
                turns: []
            }
        }
    ],
    metrics: { total: 1, passed: 1, reflectionRate: 1, averageToolCalls: 0 }
};

describe('report writer', () => {
    it('writes json and markdown summaries', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-report-'));
        const output = writeReport(sampleReport, dir);
        expect(fs.existsSync(path.join(output, 'report.json'))).toBe(true);
        expect(fs.existsSync(path.join(output, 'report.md'))).toBe(true);
        const md = fs.readFileSync(path.join(output, 'report.md'), 'utf-8');
        expect(md).toContain('Agentic Bench Report');
        expect(md).toContain('demo');
    });
});
