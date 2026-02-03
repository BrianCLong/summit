import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

/**
 * generate_provenance.ts
 * Generates a Summit Provenance Event ensuring Identity Lineage Enforcement.
 */

function calculateSha256(filePath: string): string {
    if (!fs.existsSync(filePath)) return "";
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
    console.log("🔒 Starting Provenance Generation with Identity Enforcement...");

    // 1. Load Identity Registry
    const identitiesPath = path.join(REPO_ROOT, 'governance', 'identities.yaml');
    if (!fs.existsSync(identitiesPath)) {
        throw new Error(`Identity Registry not found at ${identitiesPath}`);
    }
    const identitiesRaw = fs.readFileSync(identitiesPath, 'utf8');
    const registry = yaml.load(identitiesRaw) as { identities: { id: string; type: string; roles?: string[] }[] };

    // 2. Resolve Actor
    const actorId = process.env.GITHUB_ACTOR || 'local-user';
    const actorEntry = registry.identities.find(i => i.id === actorId);

    if (!actorEntry) {
        throw new Error(`❌ Lineage Identity Violation: Actor '${actorId}' is not registered in governance/identities.yaml. Cannot sign provenance.`);
    }

    console.log(`✅ Identity Verified: ${actorEntry.id} (${actorEntry.type})`);

    // 3. Prepare Subject (Build Artifact)
    const sbomPath = path.join(REPO_ROOT, '.evidence', 'sbom.json');
    let subjectId = process.env.GITHUB_SHA || 'local-build';

    // If SBPM exists, we can use its hash as part of the ID or metadata
    const sbomHash = calculateSha256(sbomPath);

    // 4. Construct Provenance Event
    const provenanceEvent = {
        id: `prov_${uuidv4()}`,
        timestamp: new Date().toISOString(),
        actor: {
            type: actorEntry.type,
            id: actorEntry.id,
            roles: actorEntry.roles || []
        },
        action: 'build',
        subject: {
            type: 'artifact',
            id: subjectId
        },
        context: {
            commit: process.env.GITHUB_SHA || 'HEAD',
            branch: process.env.GITHUB_REF_NAME || 'local',
            env: process.env.CI ? 'ci' : 'local',
            metadata: {
                sbom_sha256: sbomHash,
                runner: process.env.RUNNER_NAME || 'local-machine'
            }
        }
    };

    // 5. Validate against Schema
    const schemaPath = path.join(REPO_ROOT, 'schemas', 'provenance-event.schema.json');
    const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaRaw);

    const ajv = new Ajv({ strict: false }); // strict: false to allow unknown keywords if any (like $schema version)
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(provenanceEvent);

    if (!valid) {
        console.error('❌ Provenance Validation Failed:', validate.errors);
        throw new Error('Generated provenance event does not match authoritative schema.');
    }

    // 6. Write Output
    const outputDir = path.join(REPO_ROOT, '.evidence');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'provenance.json');
    fs.writeFileSync(outputPath, JSON.stringify(provenanceEvent, null, 2));

    console.log(`✅ Provenance Event generated and verified at ${outputPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
