import { loadDisarmTaxonomy } from '../src/index.ts';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for deterministic stringify
function deterministicStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => `"${key}":${deterministicStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

function generateEvidence() {
  try {
    const taxonomy = loadDisarmTaxonomy();
    const canonicalJson = deterministicStringify(taxonomy);
    const hash = crypto.createHash('sha256').update(canonicalJson).digest('hex');
    const evidenceId = crypto.randomUUID();

    const evidence = {
      evidence_id: evidenceId,
      timestamp: new Date().toISOString(),
      artifact_type: 'disarm_taxonomy',
      schema_version: taxonomy.version,
      content_hash: hash,
      content: taxonomy,
    };

    const outputDir = path.resolve(__dirname, '../../../docs/evidence/moat');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'PR-0-disarm-taxonomy.evidence.json');
    fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));

    console.log(`Evidence generated at: ${outputPath}`);
    console.log(`Evidence ID: ${evidenceId}`);
    console.log(`Content Hash: ${hash}`);
  } catch (error) {
    console.error('Failed to generate evidence:', error);
    process.exit(1);
  }
}

generateEvidence();
