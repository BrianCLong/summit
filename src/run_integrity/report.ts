import * as fs from 'fs';
import * as path from 'path';
import { IntegrityReport } from './types';

export function writeReportArtifacts(outDir: string, report: IntegrityReport) {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. report.json
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    // 2. evidence_delta.json (only mismatches)
    if (report.mismatches.length > 0) {
        fs.writeFileSync(path.join(outDir, 'evidence_delta.json'), JSON.stringify(report.mismatches, null, 2));
    }

    // 3. stamp.json (volatile)
    const stamp = {
        runId: report.runId,
        generatedAt: new Date().toISOString(),
        runner: process.env.HOSTNAME || 'unknown',
        workflowId: process.env.GITHUB_RUN_ID || 'unknown'
    };
    fs.writeFileSync(path.join(outDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
}
