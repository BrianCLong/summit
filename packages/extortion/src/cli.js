"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const path_2 = require("path");
const schema_1 = require("./schema");
const note_classifier_1 = require("./note_classifier");
const pressure_score_1 = require("./pressure_score");
const artifacts_1 = require("./artifacts");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_2.dirname)(__filename);
async function main() {
    const baseDir = (0, path_1.join)(__dirname, '..');
    const artifactsDir = (0, path_1.join)(process.cwd(), 'artifacts/extortion');
    (0, fs_1.mkdirSync)(artifactsDir, { recursive: true });
    const date = '2026-01-27';
    // 1. Load Leak Records
    const leakRecordsRaw = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(baseDir, 'fixtures/leak_site_records.json'), 'utf8'));
    const leakRecords = leakRecordsRaw.map((r) => {
        const record = { ...r, evidence_id: (0, artifacts_1.generateEvidenceId)('LEAK', date, r) };
        return schema_1.LeakSiteRecordSchema.parse(record);
    });
    // 2. Load Findings (Simulated for MWS)
    const simulatedFindingsRaw = [
        {
            finding_type: 'MISCONFIG',
            description: 'Internet-exposed MongoDB with no authentication (ITEM:CLAIM-07)',
            severity: 'CRITICAL',
            affected_asset: 'mongodb://ext-db-01.internal.corp'
        }
    ];
    const findings = simulatedFindingsRaw.map((f) => {
        const finding = { ...f, evidence_id: (0, artifacts_1.generateEvidenceId)('EXPOSURE', date, f) };
        return schema_1.ExposureFindingSchema.parse(finding);
    });
    // 3. Analyze Ransom Note
    const noteText = (0, fs_1.readFileSync)((0, path_1.join)(baseDir, 'fixtures/ransom_note.txt'), 'utf8');
    const analysis = (0, note_classifier_1.classifyNote)(noteText);
    const noteAnalysis = {
        ...analysis,
        evidence_id: (0, artifacts_1.generateEvidenceId)('NOTE', date, { text: noteText }),
        summary: 'Automated analysis of ransom note tactics'
    };
    // 4. Calculate Pressure Score
    const score = (0, pressure_score_1.calculatePressureScore)(leakRecords, findings, noteAnalysis);
    const scoreArtifact = {
        ...score,
        evidence_id: (0, artifacts_1.generateEvidenceId)('SCORE', date, score)
    };
    // 5. Write Artifacts
    const report = (0, artifacts_1.createDeterministicArtifact)({
        leak_records: leakRecords,
        exposure_findings: findings,
        note_analysis: noteAnalysis,
        pressure_score: scoreArtifact
    });
    (0, fs_1.writeFileSync)((0, path_1.join)(artifactsDir, 'extortion_report.json'), JSON.stringify(report, null, 2));
    console.log(`Extortion report generated at ${(0, path_1.join)(artifactsDir, 'extortion_report.json')}`);
}
main().catch(console.error);
