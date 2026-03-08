import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { ReportBuilder } from '../../agentic_web_visibility/geo/src/reporting/report_builder.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('ReportBuilder generates deterministic reports', () => {
    const builder = new ReportBuilder('run-123');
    builder.addScore('HubSpot', 'recommendation', {
        eligibility: 0.9,
        selection: 1.0,
        attribution: 0.7,
        upstreamPrior: 0.8,
        correctedLift: 0.11
    });

    const outputDir = path.join(__dirname, 'output');
    builder.writeDeterministicReport(outputDir);
    builder.writeStamp(outputDir, ['gpt-4', 'claude-3']);

    const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'report.json'), 'utf8'));
    const metrics = JSON.parse(fs.readFileSync(path.join(outputDir, 'metrics.json'), 'utf8'));
    const stamp = JSON.parse(fs.readFileSync(path.join(outputDir, 'stamp.json'), 'utf8'));

    assert.strictEqual(report.runId, 'run-123');
    assert.strictEqual(report.scores.length, 1);

    assert.ok(Math.abs(metrics.averageCorrectedLift - 0.11) < 0.001);

    assert.ok(stamp.timestamp);
    assert.deepStrictEqual(stamp.engines, ['gpt-4', 'claude-3']);

    // Cleanup
    fs.rmSync(outputDir, { recursive: true, force: true });
});
