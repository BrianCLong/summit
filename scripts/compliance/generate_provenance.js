"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const uuid_1 = require("uuid");
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const REPO_ROOT = node_path_1.default.resolve(__dirname, '../../');
/**
 * generate_provenance.ts
 * Generates a Summit Provenance Event ensuring Identity Lineage Enforcement.
 */
function calculateSha256(filePath) {
    if (!node_fs_1.default.existsSync(filePath))
        return "";
    const content = node_fs_1.default.readFileSync(filePath);
    return node_crypto_1.default.createHash('sha256').update(content).digest('hex');
}
async function main() {
    console.log("🔒 Starting Provenance Generation with Identity Enforcement...");
    // 1. Load Identity Registry
    const identitiesPath = node_path_1.default.join(REPO_ROOT, 'governance', 'identities.yaml');
    if (!node_fs_1.default.existsSync(identitiesPath)) {
        throw new Error(`Identity Registry not found at ${identitiesPath}`);
    }
    const identitiesRaw = node_fs_1.default.readFileSync(identitiesPath, 'utf8');
    const registry = js_yaml_1.default.load(identitiesRaw);
    // 2. Resolve Actor
    const actorId = process.env.GITHUB_ACTOR || 'local-user';
    const actorEntry = registry.identities.find(i => i.id === actorId);
    if (!actorEntry) {
        throw new Error(`❌ Lineage Identity Violation: Actor '${actorId}' is not registered in governance/identities.yaml. Cannot sign provenance.`);
    }
    console.log(`✅ Identity Verified: ${actorEntry.id} (${actorEntry.type})`);
    // 3. Prepare Subject (Build Artifact)
    const sbomPath = node_path_1.default.join(REPO_ROOT, '.evidence', 'sbom.json');
    let subjectId = process.env.GITHUB_SHA || 'local-build';
    // If SBPM exists, we can use its hash as part of the ID or metadata
    const sbomHash = calculateSha256(sbomPath);
    // 4. Construct Provenance Event
    const provenanceEvent = {
        id: `prov_${(0, uuid_1.v4)()}`,
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
    const schemaPath = node_path_1.default.join(REPO_ROOT, 'schemas', 'provenance-event.schema.json');
    const schemaRaw = node_fs_1.default.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaRaw);
    const ajv = new _2020_js_1.default({ strict: false }); // strict: false to allow unknown keywords if any (like $schema version)
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(provenanceEvent);
    if (!valid) {
        console.error('❌ Provenance Validation Failed:', validate.errors);
        throw new Error('Generated provenance event does not match authoritative schema.');
    }
    // 6. Write Output
    const outputDir = node_path_1.default.join(REPO_ROOT, '.evidence');
    if (!node_fs_1.default.existsSync(outputDir)) {
        node_fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = node_path_1.default.join(outputDir, 'provenance.json');
    node_fs_1.default.writeFileSync(outputPath, JSON.stringify(provenanceEvent, null, 2));
    console.log(`✅ Provenance Event generated and verified at ${outputPath}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
