import * as fs from 'fs';
import * as path from 'path';
import { GeoScore } from '../scoring/index.js';

export interface GeoReportEntry extends GeoScore {
    brandName: string;
    promptClass: string;
}

export class ReportBuilder {
    private scores: GeoReportEntry[] = [];
    private runId: string;

    constructor(runId: string) {
        this.runId = runId;
    }

    public addScore(brandName: string, promptClass: string, score: GeoScore) {
        this.scores.push({ ...score, brandName, promptClass });
    }

    public writeDeterministicReport(dirPath: string) {
        // Sort deterministically
        this.scores.sort((a, b) => a.brandName.localeCompare(b.brandName) || a.promptClass.localeCompare(b.promptClass));

        const report = {
            runId: this.runId,
            scores: this.scores
        };

        const metrics = {
            averageSelectionScore: this.scores.reduce((sum, s) => sum + s.selection, 0) / (this.scores.length || 1),
            averageAttributionScore: this.scores.reduce((sum, s) => sum + s.attribution, 0) / (this.scores.length || 1),
            averageCorrectedLift: this.scores.reduce((sum, s) => sum + s.correctedLift, 0) / (this.scores.length || 1)
        };

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // report.json and metrics.json MUST be deterministic (no timestamps)
        fs.writeFileSync(path.join(dirPath, 'report.json'), JSON.stringify(report, null, 2));
        fs.writeFileSync(path.join(dirPath, 'metrics.json'), JSON.stringify(metrics, null, 2));
    }

    public writeStamp(dirPath: string, engines: string[]) {
        const stamp = {
            timestamp: new Date().toISOString(),
            engines
        };
        fs.writeFileSync(path.join(dirPath, 'stamp.json'), JSON.stringify(stamp, null, 2));
    }
}
