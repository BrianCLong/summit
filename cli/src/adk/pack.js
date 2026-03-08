"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packAgent = packAgent;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const hash_js_1 = require("./hash.js");
const manifest_js_1 = require("./manifest.js");
const SECRET_PATTERN = /(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)/i;
async function scanForSecrets(targetDir) {
    const violations = [];
    const entries = await promises_1.default.readdir(targetDir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = node_path_1.default.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await scanForSecrets(entryPath);
            violations.push(...nested);
        }
        else if (entry.isFile()) {
            if (entry.name.startsWith('.env')) {
                violations.push(entryPath);
                continue;
            }
            const contents = await promises_1.default.readFile(entryPath, 'utf-8');
            if (SECRET_PATTERN.test(contents)) {
                violations.push(entryPath);
            }
        }
    }
    return violations;
}
async function packAgent(agentDir, outputPath) {
    const manifestPath = node_path_1.default.join(agentDir, 'agent.yaml');
    const { raw: manifestRaw } = await (0, manifest_js_1.readManifestFile)(manifestPath);
    const manifestDigest = (0, hash_js_1.hashBytes)(Buffer.from(manifestRaw));
    const violations = await scanForSecrets(agentDir);
    if (violations.length > 0) {
        const list = violations.map((item) => `- ${item}`).join('\n');
        throw new Error(`Secret material detected in pack input:\n${list}`);
    }
    const archiveName = outputPath ?? `${node_path_1.default.basename(agentDir)}.sadk.tgz`;
    const tarArgs = [
        '--sort=name',
        '--mtime=UTC 1970-01-01',
        '--owner=0',
        '--group=0',
        '--numeric-owner',
        '-czf',
        archiveName,
        '-C',
        agentDir,
        '.',
    ];
    const tarResult = (0, node_child_process_1.spawnSync)('tar', tarArgs, { encoding: 'utf-8' });
    if (tarResult.status !== 0) {
        throw new Error(`tar failed: ${tarResult.stderr || tarResult.stdout}`);
    }
    const report = {
        ok: true,
        agent_dir: agentDir,
        archive: archiveName,
        manifest_digest: manifestDigest,
    };
    await (0, manifest_js_1.writeDeterministicJson)(`${archiveName}.report.json`, report);
    return archiveName;
}
