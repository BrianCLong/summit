const path = require('path');
const os = require('os');
const fs = require('fs');
const { runBench } = require('../src/run.js');

const tasksDir = path.join(process.cwd(), 'packages', 'agentic-bench', 'src', 'benchmarks');

describe('agentic bench runner', () => {
    it('runs with mock client and produces artifacts', async () => {
        const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-bench-'));
        const report = await runBench({ tasksDir, useMockClient: true, artifactDir });
        expect(report.results.length).toBeGreaterThan(0);
        const anyValid = report.results.some((r) => r.validation.valid);
        expect(anyValid).toBe(true);
        const subdirs = fs.readdirSync(artifactDir);
        expect(subdirs.length).toBe(1);
        const outputs = fs.readdirSync(path.join(artifactDir, subdirs[0]));
        expect(outputs).toEqual(expect.arrayContaining(['report.json', 'report.md']));
    }, 20000);
});
