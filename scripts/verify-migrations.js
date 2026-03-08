"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const glob_1 = require("glob");
const schema_fingerprint_js_1 = require("./schema-fingerprint.js");
const schema_registry_js_1 = require("./schema-registry.js");
function normalizePath(filePath) {
    return node_path_1.default.posix.normalize(filePath.replace(/\\/g, '/'));
}
function getChangedFiles(baseRef) {
    try {
        const output = (0, node_child_process_1.execSync)(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8' });
        return output
            .split('\n')
            .filter(Boolean)
            .map(normalizePath);
    }
    catch (error) {
        console.warn(`Unable to diff against ${baseRef}, falling back to HEAD~1. Details: ${String(error)}`);
        const fallback = (0, node_child_process_1.execSync)('git diff --name-only HEAD~1', { encoding: 'utf8' });
        return fallback
            .split('\n')
            .filter(Boolean)
            .map(normalizePath);
    }
}
async function collectFromRegistries(registries, key) {
    const set = new Set();
    for (const registry of registries) {
        for (const pattern of registry[key]) {
            const matches = await (0, glob_1.glob)(pattern, {
                ignore: schema_registry_js_1.DEFAULT_IGNORES,
                posix: true
            });
            matches.forEach((match) => set.add(normalizePath(match)));
        }
    }
    return set;
}
async function readStoredFingerprint(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        console.warn(`No stored fingerprint found at ${filePath}: ${String(error)}`);
        return undefined;
    }
}
async function verify(baseRef) {
    const registries = await (0, schema_registry_js_1.loadSchemaRegistries)();
    const changedFiles = getChangedFiles(baseRef);
    const schemaUniverse = await collectFromRegistries(registries, 'schemaGlobs');
    const migrationUniverse = await collectFromRegistries(registries, 'migrationGlobs');
    const schemaChanges = changedFiles.filter((file) => schemaUniverse.has(file));
    const migrationChanges = changedFiles.filter((file) => migrationUniverse.has(file));
    const targetFingerprintPath = node_path_1.default.resolve(process.cwd(), 'schema-fingerprints', 'latest.json');
    const storedFingerprint = await readStoredFingerprint(targetFingerprintPath);
    const currentFingerprint = await (0, schema_fingerprint_js_1.computeSchemaFingerprint)(process.cwd());
    const fingerprintChanged = storedFingerprint?.compositeHash !== currentFingerprint.compositeHash;
    if (fingerprintChanged) {
        await promises_1.default.mkdir(node_path_1.default.dirname(targetFingerprintPath), { recursive: true });
        await promises_1.default.writeFile(targetFingerprintPath, JSON.stringify(currentFingerprint, null, 2));
    }
    return { schemaChanges, migrationChanges, fingerprintChanged };
}
function assertConditions(result) {
    const failures = [];
    if (result.schemaChanges.length > 0 && result.migrationChanges.length === 0) {
        failures.push('Schema files changed without a corresponding migration. Use scripts/create-migration.ts to add one.');
    }
    if (result.fingerprintChanged) {
        failures.push('Schema fingerprint drift detected. Regenerate via scripts/schema-fingerprint.ts --write latest.');
    }
    if (failures.length > 0) {
        console.error('Schema governance checks failed:');
        failures.forEach((failure) => console.error(`- ${failure}`));
        process.exitCode = 1;
    }
    else {
        console.log('Schema governance checks passed.');
    }
}
async function main() {
    const baseRef = process.env.SCHEMA_DRIFT_BASE || 'origin/main';
    const result = await verify(baseRef);
    if (result.schemaChanges.length > 0) {
        console.log(`Detected schema-related changes: ${result.schemaChanges.join(', ')}`);
    }
    if (result.migrationChanges.length > 0) {
        console.log(`Detected migration changes: ${result.migrationChanges.join(', ')}`);
    }
    if (result.fingerprintChanged) {
        console.log('Schema fingerprint was updated to reflect current tree.');
    }
    assertConditions(result);
}
main().catch((error) => {
    console.error('Schema verification failed:', error);
    process.exitCode = 1;
});
