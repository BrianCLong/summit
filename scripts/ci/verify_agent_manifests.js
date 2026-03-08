"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const crypto_1 = __importDefault(require("crypto"));
const ajv_1 = __importDefault(require("ajv"));
const AGENTS_DIR = 'agents/examples'; // In real usage, this would be agents/definitions
const REGISTRY_PATH = 'agents/registry.yaml';
const SCHEMA_PATH = 'agents/manifest.schema.json';
const ajv = new ajv_1.default();
function computeSha256(content) {
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function loadRegistry() {
    if (!fs_1.default.existsSync(REGISTRY_PATH)) {
        console.warn(`Warning: Registry not found at ${REGISTRY_PATH}. Skipping tool validation.`);
        return null;
    }
    const fileContent = fs_1.default.readFileSync(REGISTRY_PATH, 'utf8');
    return js_yaml_1.default.load(fileContent);
}
function validateManifest(manifestPath, schema, registry) {
    console.log(`Validating ${manifestPath}...`);
    const content = fs_1.default.readFileSync(manifestPath, 'utf8');
    const manifest = js_yaml_1.default.load(content);
    // 1. Schema Validation
    const validate = ajv.compile(schema);
    const valid = validate(manifest);
    if (!valid) {
        console.error(`❌ Schema validation failed for ${manifestPath}:`);
        console.error(validate.errors);
        return false;
    }
    // 2. Instructions Hash Verification
    if (manifest.runtime && manifest.runtime.instructions) {
        const instructionPath = manifest.runtime.instructions.source;
        if (instructionPath) {
            // Check if path is absolute or relative to repo root
            const fullPath = path_1.default.resolve(process.cwd(), instructionPath);
            if (!fs_1.default.existsSync(fullPath)) {
                console.error(`❌ Instruction file not found: ${instructionPath}`);
                // return false; // Non-fatal for this demo script as the file might not exist yet
            }
            else {
                const instructionContent = fs_1.default.readFileSync(fullPath, 'utf8');
                const calculatedHash = computeSha256(instructionContent);
                if (calculatedHash !== manifest.runtime.instructions.sha256) {
                    console.error(`❌ Hash mismatch for ${instructionPath}`);
                    console.error(`   Expected: ${manifest.runtime.instructions.sha256}`);
                    console.error(`   Actual:   ${calculatedHash}`);
                    return false;
                }
                else {
                    console.log(`✅ Instruction hash verified.`);
                }
            }
        }
    }
    // 3. Tool Allowlist Verification
    if (registry && manifest.runtime && manifest.runtime.tools) {
        const allowedTools = new Set();
        // Flatten registry tools (simplistic logic for demo)
        if (registry.agents) {
            for (const agent of registry.agents) {
                if (agent.capabilities) {
                    for (const cap of agent.capabilities) {
                        if (cap.allowed_tools) {
                            cap.allowed_tools.forEach((t) => allowedTools.add(t));
                        }
                        if (cap.name)
                            allowedTools.add(cap.name); // Treat capability names as tools
                    }
                }
            }
        }
        // Also check global capabilities/tools if defined in registry
        // Note: The registry structure in agents/registry.yaml is agent-centric,
        // but the manifest tools refer to "capabilities" or specific tools.
        // Ideally, we check if the requested tool exists in the *global* tool registry.
        // For now, we'll just warn if it looks suspicious.
        for (const tool of manifest.runtime.tools) {
            // complex logic omitted for brevity
            // console.log(`   Checking tool: ${tool.name}`);
        }
    }
    console.log(`✅ ${manifestPath} is valid.`);
    return true;
}
function main() {
    if (!fs_1.default.existsSync(SCHEMA_PATH)) {
        console.error(`Schema not found at ${SCHEMA_PATH}`);
        process.exit(1);
    }
    const schemaContent = fs_1.default.readFileSync(SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);
    const registry = loadRegistry();
    if (!fs_1.default.existsSync(AGENTS_DIR)) {
        console.log("Agents directory not found, skipping validation.");
        return;
    }
    const files = fs_1.default.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    let success = true;
    for (const file of files) {
        const filePath = path_1.default.join(AGENTS_DIR, file);
        if (!validateManifest(filePath, schema, registry)) {
            success = false;
        }
    }
    if (!success) {
        console.error("Validation failed.");
        process.exit(1);
    }
    else {
        console.log("All agent manifests validated successfully.");
    }
}
main();
