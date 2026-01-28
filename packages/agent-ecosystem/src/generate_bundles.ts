import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvidenceBundleSchema } from './schemas.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_FILE = path.join(__dirname, '../seeds/initial_ecosystem.yaml');
// We'll write to root/evidence/ecosystem, so we need to go up from packages/agent-ecosystem/src
const OUTPUT_DIR = path.join(__dirname, '../../../evidence/ecosystem');

async function main() {
  console.log(`Reading seed file from ${SEED_FILE}...`);
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`Seed file not found at ${SEED_FILE}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(SEED_FILE, 'utf-8');
  const seeds = parse(fileContent);

  if (!Array.isArray(seeds)) {
    throw new Error('Seed file must contain an array of resources');
  }

  console.log(`Found ${seeds.length} entries.`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`Creating output directory ${OUTPUT_DIR}...`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const seed of seeds) {
    const resourceId = uuidv4();
    const bundleId = uuidv4();
    const now = new Date().toISOString();

    // Assign ID to resource
    const resource = {
        ...seed,
        id: resourceId
    };

    // Construct Bundle
    const bundle = {
      id: bundleId,
      resource_id: resourceId,
      timestamp: now,
      primaryArtifact: resource,
      provenance: {
        source: 'initial_ecosystem.yaml',
        method: 'seed',
        actor: 'summit-agent-indexer'
      },
      verification: {
        status: 'unverified',
        tests_run: [],
        results: {}
      },
      claims: []
    };

    // Validate
    try {
        const validBundle = AgentEvidenceBundleSchema.parse(bundle);
        const fileName = `${resource.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        fs.writeFileSync(filePath, JSON.stringify(validBundle, null, 2));
        console.log(`Generated bundle for ${resource.name} at ${filePath}`);
    } catch (error) {
        console.error(`Validation failed for ${resource.name}:`, error);
        // Log detailed Zod error
        if (error && typeof error === 'object' && 'issues' in error) {
             console.error(JSON.stringify((error as any).issues, null, 2));
        }
        process.exit(1);
    }
  }
}

main().catch(console.error);
