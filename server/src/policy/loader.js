"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSignedPolicy = loadSignedPolicy;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const input_sanitization_js_1 = require("../utils/input-sanitization.js");
const DEFAULT_ALLOWED_EXTENSIONS = ['.tar', '.tgz', '.tar.gz', '.bundle'];
function assertNonEmptyString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${label} must be a non-empty string`);
    }
}
async function ensureFileReadable(filePath, label) {
    const stat = await fs_1.promises.stat(filePath).catch(() => {
        throw new Error(`${label} not found at ${filePath}`);
    });
    if (!stat.isFile()) {
        throw new Error(`${label} at ${filePath} is not a regular file`);
    }
    if (stat.size === 0) {
        throw new Error(`${label} at ${filePath} is empty`);
    }
    return stat;
}
function validateExtension(filePath) {
    const ext = DEFAULT_ALLOWED_EXTENSIONS.find((candidate) => filePath.toLowerCase().endsWith(candidate));
    if (!ext) {
        throw new Error(`policy bundle must use one of the allowed extensions: ${DEFAULT_ALLOWED_EXTENSIONS.join(', ')}`);
    }
}
function digestFileBuffer(buf) {
    return (0, node_crypto_1.createHash)('sha256').update(buf).digest('hex');
}
async function loadSignedPolicy(bundlePath, sigPath) {
    assertNonEmptyString(bundlePath, 'bundlePath');
    // Security: Prevent argument injection in execFile
    if (bundlePath.startsWith('-')) {
        throw new Error('bundlePath cannot start with a hyphen');
    }
    // Security: Sanitize path to prevent Path Traversal
    const safeBundlePath = (0, input_sanitization_js_1.sanitizeFilePath)(bundlePath);
    validateExtension(safeBundlePath);
    // Security: Pre-validate sigPath if provided
    let safeSigPath;
    if (sigPath) {
        assertNonEmptyString(sigPath, 'sigPath');
        if (sigPath.startsWith('-')) {
            throw new Error('sigPath cannot start with a hyphen');
        }
        safeSigPath = (0, input_sanitization_js_1.sanitizeFilePath)(sigPath);
    }
    const allowUnsigned = (process.env.ALLOW_UNSIGNED_POLICY || 'false').toLowerCase() === 'true';
    if (!sigPath && !allowUnsigned) {
        throw new Error('unsigned policy not allowed (set ALLOW_UNSIGNED_POLICY=true to override)');
    }
    const stat = await ensureFileReadable(safeBundlePath, 'policy bundle');
    const buf = await fs_1.promises.readFile(safeBundlePath);
    const digest = digestFileBuffer(buf);
    let signatureVerified = false;
    if (safeSigPath) {
        await ensureFileReadable(safeSigPath, 'policy signature');
        await new Promise((res, rej) => (0, node_child_process_1.execFile)('cosign', ['verify-blob', '--signature', safeSigPath, safeBundlePath], (e) => (e ? rej(e) : res())));
        signatureVerified = true;
    }
    return {
        ok: true,
        path: path_1.default.resolve(safeBundlePath),
        size: stat.size,
        modified: stat.mtime,
        signatureVerified,
        digest,
        buf,
    };
}
