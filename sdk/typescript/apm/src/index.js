"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planQuery = planQuery;
exports.simulateTradeoffs = simulateTradeoffs;
const node_child_process_1 = require("node:child_process");
const node_url_1 = require("node:url");
const node_path_1 = __importDefault(require("node:path"));
function resolveManifestPath(explicit) {
    if (explicit) {
        return explicit;
    }
    if (process.env.APM_CARGO_MANIFEST) {
        return process.env.APM_CARGO_MANIFEST;
    }
    const moduleDir = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
    return node_path_1.default.resolve(moduleDir, '../../../..', 'apm', 'Cargo.toml');
}
function runCli(command, payload, options) {
    const input = JSON.stringify(payload);
    const binaryPath = options?.binaryPath ?? process.env.APM_CLI_PATH;
    if (binaryPath) {
        const result = (0, node_child_process_1.spawnSync)(binaryPath, [command], {
            input,
            encoding: 'utf8',
        });
        return handleCliResult(result);
    }
    const manifestPath = resolveManifestPath(options?.manifestPath);
    const args = ['run', '--quiet', '--manifest-path', manifestPath, '--bin', 'apm-cli'];
    if (options?.release || process.env.APM_CLI_RELEASE === '1') {
        args.splice(1, 0, '--release');
    }
    args.push('--', command);
    const result = (0, node_child_process_1.spawnSync)('cargo', args, {
        input,
        encoding: 'utf8',
    });
    return handleCliResult(result);
}
function handleCliResult(result) {
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        const stderr = (result.stderr ?? '').toString().trim();
        throw new Error(`apm cli exited with status ${result.status}: ${stderr}`);
    }
    const stdout = (result.stdout ?? '').toString();
    if (!stdout.length) {
        throw new Error('apm cli produced no output');
    }
    return JSON.parse(stdout);
}
function planQuery(request, options) {
    return runCli('plan', request, options);
}
function simulateTradeoffs(request, options) {
    return runCli('simulate', request, options);
}
