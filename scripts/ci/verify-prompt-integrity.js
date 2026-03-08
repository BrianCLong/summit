"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const prompt_registry_1 = require("./lib/prompt-registry");
function usage() {
    // eslint-disable-next-line no-console
    console.error('Usage: ts-node scripts/ci/verify-prompt-integrity.ts --prompt-hash <hash> [--registry <path>] [--diff-base <ref>]');
    process.exit(1);
}
function parseArgs() {
    const args = process.argv.slice(2);
    let promptHash = process.env.PROMPT_HASH ?? '';
    let registryPath = process.env.PROMPT_REGISTRY;
    let diffBase = process.env.DIFF_BASE;
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--prompt-hash') {
            promptHash = args[i + 1];
            i += 1;
        }
        else if (arg === '--registry') {
            registryPath = args[i + 1];
            i += 1;
        }
        else if (arg === '--diff-base') {
            diffBase = args[i + 1];
            i += 1;
        }
    }
    if (!promptHash) {
        usage();
    }
    return { promptHash, registryPath, diffBase };
}
function main() {
    const { promptHash, registryPath, diffBase } = parseArgs();
    const registry = (0, prompt_registry_1.loadPromptRegistry)(registryPath ?? node_path_1.default.join('prompts', 'registry.yaml'));
    const prompt = (0, prompt_registry_1.getPromptByHash)(registry, promptHash);
    if (!prompt) {
        throw new Error(`Prompt hash ${promptHash} not found in registry.`);
    }
    (0, prompt_registry_1.ensureHashMatches)(prompt);
    const changedFiles = (0, prompt_registry_1.getChangedFiles)(diffBase);
    (0, prompt_registry_1.assertScopeCompliance)(prompt, changedFiles);
    // eslint-disable-next-line no-console
    console.log(`Prompt integrity verified for ${prompt.id} with ${changedFiles.length} changed file(s).`);
}
main();
