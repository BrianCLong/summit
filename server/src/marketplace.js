"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installStep = installStep;
const node_child_process_1 = require("node:child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const verify_js_1 = require("./plugins/verify.js");
const input_sanitization_js_1 = require("./utils/input-sanitization.js");
function exec(bin, args) {
    return new Promise((res, rej) => (0, node_child_process_1.execFile)(bin, args, (e) => (e ? rej(e) : res())));
}
async function installStep(name, version) {
    // Security validation
    try {
        (0, input_sanitization_js_1.sanitizeFilePath)(name);
    }
    catch (e) {
        throw new Error(`Invalid name: ${e.message}`);
    }
    // Validate characters (alphanumeric, -, _, /, @)
    if (!/^[@a-zA-Z0-9\-_/]+$/.test(name)) {
        throw new Error('Invalid name format');
    }
    // Validate version (alphanumeric, ., -, _)
    if (!/^[a-zA-Z0-9.\-_]+$/.test(version)) {
        throw new Error('Invalid version format');
    }
    const offline = (process.env.OFFLINE || 'false').toLowerCase() === 'true';
    const pluginsDir = path_1.default.join(process.cwd(), 'plugins');
    await fs_1.promises.mkdir(pluginsDir, { recursive: true });
    const ref = process.env.MARKETPLACE_REGISTRY || `ghcr.io/intelgraph/${name}:${version}`;
    if (!offline) {
        if (!(await (0, verify_js_1.verifyCosign)(ref)))
            throw new Error('signature verification failed');
        try {
            await exec('oras', ['pull', ref, '-o', pluginsDir]);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`oras pull failed: ${msg}`);
        }
    }
    const wasmFile = path_1.default.join(pluginsDir, `${name}.wasm`);
    await fs_1.promises.access(wasmFile);
    return wasmFile;
}
