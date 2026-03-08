"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceBundleWriter = void 0;
exports.stableStringify = stableStringify;
exports.stableStringifyLine = stableStringifyLine;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
class EvidenceBundleWriter {
    plan;
    config;
    bundleDir;
    tracePath;
    planPath;
    artifactsDir;
    now;
    createdAt;
    constructor(plan, config) {
        this.plan = plan;
        this.config = config;
        this.now = config.now ?? (() => new Date());
        const bundleId = config.bundleId ?? `${plan.run_id}-${plan.plan_id}`;
        this.bundleDir = node_path_1.default.join(config.bundlesDir, bundleId);
        this.tracePath = node_path_1.default.join(this.bundleDir, 'trace.ndjson');
        this.planPath = node_path_1.default.join(this.bundleDir, 'plan.json');
        this.artifactsDir = node_path_1.default.join(this.bundleDir, 'artifacts');
    }
    getBundleDir() {
        return this.bundleDir;
    }
    async initialize() {
        this.createdAt = this.now().toISOString();
        await node_fs_1.promises.mkdir(this.artifactsDir, { recursive: true });
        await node_fs_1.promises.writeFile(this.planPath, stableStringify(this.plan), 'utf8');
        await node_fs_1.promises.writeFile(this.tracePath, '', 'utf8');
    }
    async record(event) {
        const line = `${stableStringifyLine(event)}\n`;
        await node_fs_1.promises.appendFile(this.tracePath, line, 'utf8');
    }
    async finalize() {
        const createdAt = this.createdAt ?? this.now().toISOString();
        const files = await collectFiles(this.bundleDir);
        const manifest = {
            bundle_version: this.config.bundleVersion ?? '1.0',
            plan_id: this.plan.plan_id,
            run_id: this.plan.run_id,
            created_at: createdAt,
            finalized_at: this.now().toISOString(),
            git_sha: resolveGitSha(),
            config_flags: this.config.configFlags ?? {},
            files,
        };
        const manifestPath = node_path_1.default.join(this.bundleDir, 'manifest.json');
        await node_fs_1.promises.writeFile(manifestPath, stableStringify(manifest), 'utf8');
        return manifest;
    }
}
exports.EvidenceBundleWriter = EvidenceBundleWriter;
async function collectFiles(bundleDir) {
    const entries = [];
    const walk = async (dir) => {
        const items = await node_fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = node_path_1.default.join(dir, item.name);
            if (item.isDirectory()) {
                await walk(fullPath);
            }
            else {
                const relPath = node_path_1.default.relative(bundleDir, fullPath);
                if (relPath === 'manifest.json') {
                    continue;
                }
                const bytes = (await node_fs_1.promises.stat(fullPath)).size;
                const sha256 = await hashFile(fullPath);
                entries.push({ path: relPath, sha256, bytes });
            }
        }
    };
    await walk(bundleDir);
    return entries.sort((a, b) => a.path.localeCompare(b.path));
}
async function hashFile(filePath) {
    const data = await node_fs_1.promises.readFile(filePath);
    return (0, node_crypto_1.createHash)('sha256').update(data).digest('hex');
}
function resolveGitSha() {
    return (process.env.GIT_SHA ||
        process.env.GITHUB_SHA ||
        process.env.CI_COMMIT_SHA ||
        'unknown');
}
function stableStringify(value) {
    return JSON.stringify(value, sortKeys, 2) + '\n';
}
function stableStringifyLine(value) {
    return JSON.stringify(value, sortKeys);
}
function sortKeys(_key, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
        sorted[key] = value[key];
    }
    return sorted;
}
