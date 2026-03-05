import fs from 'fs';
import crypto from 'crypto';

export class RubricDriftDetector {
    static detect(reportPath: string, threshold: number = 0.05) {
        if (!fs.existsSync(reportPath)) {
            console.log(`Report not found: ${reportPath}`);
            return null;
        }

        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const totalCases = report.items?.length || 0;

        // Deterministic mock drift detection logic avoiding Math.random()
        const alignmentDrop = (totalCases % 10) * 0.01;
        const surfaceBiasFailureRate = (totalCases % 5) * 0.02;

        const driftMetric = {
            alignmentDrop,
            surfaceBiasFailureRate,
        };

        const alert = driftMetric.alignmentDrop > threshold;

        const result = {
            driftMetric,
            alert,
            stamp: crypto.createHash('sha256').update(JSON.stringify(driftMetric)).digest('hex')
        };

        return result;
    }
}
