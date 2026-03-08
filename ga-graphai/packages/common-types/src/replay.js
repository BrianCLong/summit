"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePayload = sanitizePayload;
exports.buildReplayEnvironment = buildReplayEnvironment;
exports.hashIdentifier = hashIdentifier;
exports.createReplayDescriptor = createReplayDescriptor;
exports.persistReplayDescriptor = persistReplayDescriptor;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const SENSITIVE_KEYS = [
    'authorization',
    'cookie',
    'set-cookie',
    'token',
    'secret',
    'password',
    'apiKey',
];
function redactValue(value) {
    if (typeof value === 'string') {
        return value.length > 1024 ? `${value.slice(0, 1024)}…[truncated]` : value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => redactValue(entry));
    }
    if (value && typeof value === 'object') {
        return sanitizePayload(value);
    }
    return value;
}
function sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }
    const sanitized = Array.isArray(payload) ? [] : {};
    for (const [key, value] of Object.entries(payload)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            continue;
        }
        sanitized[key] = redactValue(value);
    }
    return sanitized;
}
function buildReplayEnvironment(overrides = {}) {
    return {
        commit: process.env.GIT_COMMIT ?? process.env.COMMIT_SHA ?? overrides.commit,
        buildId: overrides.buildId ?? process.env.BUILD_ID,
        runtime: overrides.runtime ?? process.version,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            FEATURE_FLAG_SET: process.env.FEATURE_FLAG_SET,
            ...overrides.env,
        },
    };
}
function hashIdentifier(value) {
    if (!value) {
        return undefined;
    }
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function createReplayDescriptor(input) {
    return {
        ...input,
        id: `${input.service}-${(0, node_crypto_1.randomUUID)()}`,
        capturedAt: new Date().toISOString(),
        privacy: { piiScrubbed: true, notes: [], ...input.privacy },
    };
}
function persistReplayDescriptor(descriptor, rootDir = process.cwd()) {
    const replayDir = node_path_1.default.join(rootDir, 'replays', descriptor.service);
    const replayPath = node_path_1.default.join(replayDir, `${descriptor.id}.json`);
    node_fs_1.default.mkdirSync(replayDir, { recursive: true });
    node_fs_1.default.writeFileSync(replayPath, `${JSON.stringify(descriptor, null, 2)}\n`);
    return replayPath;
}
