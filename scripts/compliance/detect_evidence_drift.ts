import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';

const MAP_PATH = path.join(process.cwd(), 'docs/compliance/control_evidence_map.yml');
const DRIFT_OUTPUT_DIR = path.join(process.cwd(), 'artifacts/compliance');

// Ensure output directory exists
if (!fs.existsSync(DRIFT_OUTPUT_DIR)) {
  fs.mkdirSync(DRIFT_OUTPUT_DIR, { recursive: true });
}

interface EvidenceMap {
  mappings: Array<{
    control_id: string;
    checks?: string[];
    artifacts?: string[];
    docs?: string[];
  }>;
}

function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function detectDrift() {
  try {
    const mapContent = fs.readFileSync(MAP_PATH, 'utf8');
    const currentMap = yaml.load(mapContent) as EvidenceMap;

    // In a real scenario, we would compare against a "last known good" state stored elsewhere or fetch actual file existence.
    // For this task, we will verify that the referenced artifacts/docs actually exist in the repo.

    const missingItems: string[] = [];

    for (const mapping of currentMap.mappings) {
      if (mapping.artifacts) {
        for (const artifact of mapping.artifacts) {
          const artifactPath = path.join(process.cwd(), artifact);
          if (!fs.existsSync(artifactPath)) {
            missingItems.push(`Control ${mapping.control_id}: Artifact not found: ${artifact}`);
          }
        }
      }
      if (mapping.docs) {
        for (const doc of mapping.docs) {
          const docPath = path.join(process.cwd(), doc);
           if (!fs.existsSync(docPath)) {
            missingItems.push(`Control ${mapping.control_id}: Doc not found: ${doc}`);
          }
        }
      }
    }

    const sha = process.env.GITHUB_SHA || 'local-sha';
    const driftReport = {
      timestamp: new Date().toISOString(),
      sha,
      mapChecksum: calculateChecksum(mapContent),
      missingItems,
      hasDrift: missingItems.length > 0
    };

    const outputPath = path.join(DRIFT_OUTPUT_DIR, sha, 'evidence-drift.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(driftReport, null, 2));
    console.log(`Drift report generated at ${outputPath}`);

    if (driftReport.hasDrift) {
      console.error('❌ Evidence Drift Detected:');
      driftReport.missingItems.forEach(item => console.error(`  - ${item}`));
      // In strict mode this should exit 1, but for now we just report.
      process.exit(1);
    } else {
      console.log('✅ No evidence drift detected.');
    }

  } catch (error) {
    console.error('❌ Error detecting drift:', error);
    process.exit(1);
  }
}

detectDrift();
