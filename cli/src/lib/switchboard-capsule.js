"use strict";
/**
 * Switchboard Capsule Manifest
 *
 * Defines the V2 capsule manifest schema and helpers for loading capsules.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapsuleManifestSchema = void 0;
exports.normalizeRelativePath = normalizeRelativePath;
exports.loadCapsuleManifest = loadCapsuleManifest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
const yaml_1 = __importDefault(require("yaml"));
const PathListSchema = zod_1.z.object({
    read: zod_1.z.array(zod_1.z.string()).default([]),
    write: zod_1.z.array(zod_1.z.string()).default([]),
});
const TimePinSchema = zod_1.z.object({
    timezone: zod_1.z.string().optional(),
    locale: zod_1.z.string().optional(),
    fixed_time: zod_1.z.string().optional(),
});
const WaiverSchema = zod_1.z.object({
    token: zod_1.z.string(),
    reason: zod_1.z.string(),
    expires_at: zod_1.z.string().optional(),
});
const StepSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    command: zod_1.z.string(),
    args: zod_1.z.array(zod_1.z.string()).default([]),
    reads: zod_1.z.array(zod_1.z.string()).default([]),
    writes: zod_1.z.array(zod_1.z.string()).default([]),
    allow_network: zod_1.z.boolean().default(false),
    secrets: zod_1.z.array(zod_1.z.string()).default([]),
    category: zod_1.z.enum(['command', 'test']).default('command'),
});
exports.CapsuleManifestSchema = zod_1.z.object({
    version: zod_1.z.string().default('v2'),
    name: zod_1.z.string().optional(),
    allowed_paths: PathListSchema.default({ read: [], write: [] }),
    allowed_commands: zod_1.z.array(zod_1.z.string()).default([]),
    network_mode: zod_1.z.enum(['off', 'on']).default('off'),
    env_allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    time: TimePinSchema.default({}),
    secret_handles: zod_1.z.array(zod_1.z.string()).default([]),
    waivers: zod_1.z.array(WaiverSchema).default([]),
    steps: zod_1.z.array(StepSchema).default([]),
}).strict();
function normalizeRelativePath(inputPath) {
    if (!inputPath) {
        return null;
    }
    if (path.isAbsolute(inputPath)) {
        return null;
    }
    const normalized = path.posix.normalize(inputPath.replace(/\\/g, '/'));
    if (normalized.startsWith('..')) {
        return null;
    }
    return normalized;
}
function loadCapsuleManifest(manifestPath) {
    const resolvedPath = path.resolve(manifestPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Capsule manifest not found: ${manifestPath}`);
    }
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = yaml_1.default.parse(raw);
    const manifest = exports.CapsuleManifestSchema.parse(parsed);
    return manifest;
}
