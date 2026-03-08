"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanForSecrets = scanForSecrets;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const walker_js_1 = require("./walker.js");
const SECRET_PATTERNS = [
    /AKIA[0-9A-Z]{16}/, // AWS access key
    /(?:secret|token|password|api[-_]?key)\s*[:=]\s*["']?[A-Za-z0-9\-_=]{16,}["']?/i,
    /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/,
    /xox[baprs]-[0-9A-Za-z-]+/, // Slack tokens
    /ghp_[0-9A-Za-z]{36}/
];
async function scanForSecrets(rootDir, config) {
    const allowlist = (config.allowPatterns ?? []).map((pattern) => new RegExp(pattern));
    const matches = [];
    const files = [];
    for (const basePath of config.paths) {
        const resolvedBase = node_path_1.default.resolve(rootDir, basePath);
        const globPattern = node_path_1.default.relative(rootDir, resolvedBase).startsWith('**') ? basePath : '**/*';
        const discovered = await (0, walker_js_1.findFilesByGlob)(resolvedBase, [globPattern]);
        files.push(...discovered);
    }
    for (const file of files) {
        if (config.excludedGlobs?.some((pattern) => file.includes(pattern.replace('*', '')))) {
            continue;
        }
        const content = node_fs_1.default.readFileSync(file, 'utf-8');
        const relative = node_path_1.default.relative(rootDir, file);
        for (const pattern of SECRET_PATTERNS) {
            const match = content.match(pattern);
            if (match && !isAllowlisted(match[0], allowlist)) {
                matches.push(`${relative}: ${match[0]}`);
                break;
            }
        }
    }
    return {
        gate: 'secret-scan',
        ok: matches.length === 0,
        details: matches.length ? matches : ['Secret scan clean']
    };
}
function isAllowlisted(value, allowlist) {
    return allowlist.some((pattern) => pattern.test(value));
}
