import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { normalizeFixtures } from './normalize-ai-influence-campaign';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function emitArtifacts() {
  const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');
  const artifactsDir = path.join(__dirname, '../../artifacts/ontology/ai-influence-campaign');
  const schemaPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/ontology.schema.json');

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
  const fixturePaths = fixtureFiles.map(f => path.join(fixturesDir, f));

  const start = process.hrtime();
  const normalizedData = normalizeFixtures(fixturePaths);
  const end = process.hrtime(start);

  // Write report.json
  const reportPath = path.join(artifactsDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(normalizedData, null, 2));

  // Write metrics.json
  const processTimeMs = end[0] * 1000 + end[1] / 1000000;
  const metrics = {
    processed_campaigns: normalizedData.length,
    processing_time_ms: processTimeMs,
    memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024
  };
  fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

  // Generate a hash of the schema to put in stamp
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schemaHash = crypto.createHash('sha256').update(schemaContent).digest('hex');

  // Generate stamp.json
  const stamp = {
    ontology_version: "v0",
    schema_hash: schemaHash,
    fixture_ids: normalizedData.map(d => d.campaign_id),
    generator_version: "1"
  };
  fs.writeFileSync(path.join(artifactsDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  console.log(`Artifacts emitted successfully in ${processTimeMs.toFixed(2)}ms`);
}

// Execute directly if it is the main module run
if (import.meta.url === `file://${process.argv[1]}`) {
  emitArtifacts();
}
