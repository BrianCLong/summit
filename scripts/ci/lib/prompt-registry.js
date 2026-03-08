"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPromptRegistry = loadPromptRegistry;
exports.getPromptByHash = getPromptByHash;
exports.computeFileSha256 = computeFileSha256;
exports.getChangedFiles = getChangedFiles;
exports.assertScopeCompliance = assertScopeCompliance;
exports.ensureHashMatches = ensureHashMatches;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
function loadPromptRegistry(registryPath = 'prompts/registry.yaml') {
    const absolutePath = node_path_1.default.resolve(registryPath);
    if (!node_fs_1.default.existsSync(absolutePath)) {
        throw new Error(`Prompt registry not found at ${absolutePath}`);
    }
    const content = node_fs_1.default.readFileSync(absolutePath, 'utf8');
    const parsed = js_yaml_1.default.load(content);
    if (!parsed || !Array.isArray(parsed.prompts)) {
        throw new Error('Prompt registry is missing required "prompts" array.');
    }
    return parsed;
}
function getPromptByHash(registry, hash) {
    return registry.prompts.find((prompt) => prompt.sha256 === hash);
}
function computeFileSha256(filePath) {
    const absolutePath = node_path_1.default.resolve(filePath);
    if (!node_fs_1.default.existsSync(absolutePath)) {
        throw new Error(`Prompt file not found: ${absolutePath}`);
    }
    const buffer = node_fs_1.default.readFileSync(absolutePath);
    return node_crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
function getChangedFiles(baseRef) {
    const diffBase = baseRef ?? process.env.DIFF_BASE ?? process.env.GITHUB_BASE_REF ?? 'origin/main';
    const args = `${diffBase}...HEAD`;
    try {
        const output = (0, node_child_process_1.execSync)(`git diff --name-only ${args}`, { encoding: 'utf8' });
        return output.split('\n').map((line) => line.trim()).filter(Boolean);
    }
    catch (error) {
        const fallback = (0, node_child_process_1.execSync)('git diff --name-only --cached', { encoding: 'utf8' });
        return fallback.split('\n').map((line) => line.trim()).filter(Boolean);
    }
}
function assertScopeCompliance(prompt, changedFiles) {
    const allowedPaths = prompt.scope?.paths ?? [];
    if (allowedPaths.length === 0) {
        throw new Error(`Prompt ${prompt.id} does not declare any scope paths.`);
    }
    const violations = changedFiles.filter((file) => !allowedPaths.some((allowed) => file.startsWith(allowed)));
    if (violations.length > 0) {
        const message = violations.map((file) => `- ${file}`).join('\n');
        throw new Error(`Scope violation detected for prompt ${prompt.id}:\n${message}`);
    }
}
function ensureHashMatches(prompt) {
    const actualHash = computeFileSha256(prompt.path);
    if (actualHash !== prompt.sha256) {
        throw new Error(`Hash mismatch for prompt ${prompt.id}. Expected ${prompt.sha256} but got ${actualHash}`);
    }
}
