"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = require("yaml");
const uuid_1 = require("uuid");
const schemas_js_1 = require("./schemas.js");
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const SEED_FILE = path_1.default.join(__dirname, '../seeds/initial_ecosystem.yaml');
// We'll write to root/evidence/ecosystem, so we need to go up from packages/agent-ecosystem/src
const OUTPUT_DIR = path_1.default.join(__dirname, '../../../evidence/ecosystem');
async function main() {
    console.log(`Reading seed file from ${SEED_FILE}...`);
    if (!fs_1.default.existsSync(SEED_FILE)) {
        console.error(`Seed file not found at ${SEED_FILE}`);
        process.exit(1);
    }
    const fileContent = fs_1.default.readFileSync(SEED_FILE, 'utf-8');
    const seeds = (0, yaml_1.parse)(fileContent);
    if (!Array.isArray(seeds)) {
        throw new Error('Seed file must contain an array of resources');
    }
    console.log(`Found ${seeds.length} entries.`);
    // Ensure output directory exists
    if (!fs_1.default.existsSync(OUTPUT_DIR)) {
        console.log(`Creating output directory ${OUTPUT_DIR}...`);
        fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    for (const seed of seeds) {
        const resourceId = (0, uuid_1.v4)();
        const bundleId = (0, uuid_1.v4)();
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
            const validBundle = schemas_js_1.AgentEvidenceBundleSchema.parse(bundle);
            const fileName = `${resource.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
            const filePath = path_1.default.join(OUTPUT_DIR, fileName);
            fs_1.default.writeFileSync(filePath, JSON.stringify(validBundle, null, 2));
            console.log(`Generated bundle for ${resource.name} at ${filePath}`);
        }
        catch (error) {
            console.error(`Validation failed for ${resource.name}:`, error);
            // Log detailed Zod error
            if (error && typeof error === 'object' && 'issues' in error) {
                console.error(JSON.stringify(error.issues, null, 2));
            }
            process.exit(1);
        }
    }
}
main().catch(console.error);
