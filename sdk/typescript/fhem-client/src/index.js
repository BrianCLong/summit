"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhemClient = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
class FhemClient {
    baseUrl;
    cliPath;
    manifestPath;
    constructor(baseUrl = 'http://localhost:8080', options) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.cliPath = options?.cliPath;
        const defaultManifest = (0, node_path_1.resolve)((0, node_url_1.fileURLToPath)(new URL('../../../../', import.meta.url)), 'services/fhem/Cargo.toml');
        this.manifestPath = options?.manifestPath ?? defaultManifest;
    }
    encrypt(values) {
        if (values.length === 0) {
            return {
                ciphertexts: [],
                stats: { count: 0, totalBytes: 0, averageBytes: 0 },
            };
        }
        const args = ['encrypt', ...values.map((value) => value.toString())];
        const output = this.runCli(args);
        const parsed = JSON.parse(output);
        const stats = this.toStats(parsed.stats);
        return { ciphertexts: parsed.ciphertexts, stats };
    }
    decrypt(ciphertext) {
        const stdout = this.runCli(['decrypt', '--ciphertext', ciphertext]);
        return Number.parseInt(stdout.trim(), 10);
    }
    async encSum(values) {
        return this.executeHomomorphic('/enc-sum', values);
    }
    async encCount(values) {
        return this.executeHomomorphic('/enc-count', values);
    }
    async executeHomomorphic(path, values) {
        const { ciphertexts, stats } = this.encrypt(values);
        if (ciphertexts.length === 0) {
            throw new Error('ciphertexts must not be empty');
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ciphertexts }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Service error ${response.status}: ${text}`);
        }
        const payload = (await response.json());
        const plaintext = this.decrypt(payload.ciphertext);
        return {
            ciphertext: payload.ciphertext,
            ciphertextBytes: payload.ciphertext_bytes,
            inputCiphertextBytes: payload.input_ciphertext_bytes,
            latencyMicros: payload.latency_micros,
            plaintext,
            encryptionStats: stats,
        };
    }
    runCli(args) {
        if (this.cliPath) {
            const result = (0, node_child_process_1.spawnSync)(this.cliPath, args, { encoding: 'utf8' });
            if (result.error) {
                throw result.error;
            }
            if (result.status !== 0) {
                throw new Error(result.stderr || 'fhem-cli execution failed');
            }
            return result.stdout.trim();
        }
        const result = (0, node_child_process_1.spawnSync)('cargo', ['run', '--quiet', '--manifest-path', this.manifestPath, '--bin', 'fhem-cli', '--', ...args], { encoding: 'utf8' });
        if (result.error) {
            throw result.error;
        }
        if (result.status !== 0) {
            throw new Error(result.stderr || 'cargo execution failed');
        }
        return result.stdout.trim();
    }
    toStats(raw) {
        const average = raw.count === 0 ? 0 : raw.total_bytes / raw.count;
        return {
            count: raw.count,
            totalBytes: raw.total_bytes,
            averageBytes: average,
        };
    }
}
exports.FhemClient = FhemClient;
