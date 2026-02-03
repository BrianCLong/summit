import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { LeakSiteRecordSchema, ExposureFindingSchema } from './schema';
import { classifyNote } from './note_classifier';
import { calculatePressureScore } from './pressure_score';
import { generateEvidenceId, createDeterministicArtifact } from './artifacts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const baseDir = join(__dirname, '..');
  const artifactsDir = join(process.cwd(), 'artifacts/extortion');
  mkdirSync(artifactsDir, { recursive: true });

  const date = '2026-01-27';

  // 1. Load Leak Records
  const leakRecordsRaw = JSON.parse(readFileSync(join(baseDir, 'fixtures/leak_site_records.json'), 'utf8'));
  const leakRecords = leakRecordsRaw.map((r: any) => {
    const record = { ...r, evidence_id: generateEvidenceId('LEAK', date, r) };
    return LeakSiteRecordSchema.parse(record);
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
  const findings = simulatedFindingsRaw.map((f: any) => {
    const finding = { ...f, evidence_id: generateEvidenceId('EXPOSURE', date, f) };
    return ExposureFindingSchema.parse(finding);
  });

  // 3. Analyze Ransom Note
  const noteText = readFileSync(join(baseDir, 'fixtures/ransom_note.txt'), 'utf8');
  const analysis = classifyNote(noteText);
  const noteAnalysis = {
    ...analysis,
    evidence_id: generateEvidenceId('NOTE', date, { text: noteText }),
    summary: 'Automated analysis of ransom note tactics'
  };

  // 4. Calculate Pressure Score
  const score = calculatePressureScore(leakRecords, findings, noteAnalysis);
  const scoreArtifact = {
    ...score,
    evidence_id: generateEvidenceId('SCORE', date, score)
  };

  // 5. Write Artifacts
  const report = createDeterministicArtifact({
    leak_records: leakRecords,
    exposure_findings: findings,
    note_analysis: noteAnalysis,
    pressure_score: scoreArtifact
  });

  writeFileSync(
    join(artifactsDir, 'extortion_report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`Extortion report generated at ${join(artifactsDir, 'extortion_report.json')}`);
}

main().catch(console.error);
