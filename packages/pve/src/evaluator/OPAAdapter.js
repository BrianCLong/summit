"use strict";
/**
 * OPA Adapter
 *
 * Interface for evaluating policies using Open Policy Agent.
 * Supports both OPA server mode and embedded evaluation.
 *
 * @module pve/evaluator/OPAAdapter
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAAdapter = void 0;
exports.createOPAAdapter = createOPAAdapter;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const logger_js_1 = require("../utils/logger.js");
const DEFAULT_TIMEOUT = 30000; // 30 seconds
/**
 * OPA Adapter for policy evaluation
 */
class OPAAdapter {
    config;
    policyCache = new Map();
    constructor(config = {}) {
        this.config = {
            binary: config.binary || 'opa',
            serverUrl: config.serverUrl || '',
            mode: config.mode || 'binary',
            timeout: config.timeout || DEFAULT_TIMEOUT,
            strict: config.strict !== false,
            flags: config.flags || [],
        };
    }
    /**
     * Evaluate a policy against input data
     */
    async evaluate(policyPath, input, query) {
        switch (this.config.mode) {
            case 'http':
                return this.evaluateHttp(policyPath, input, query);
            case 'wasm':
                return this.evaluateWasm(policyPath, input, query);
            case 'binary':
            default:
                return this.evaluateBinary(policyPath, input, query);
        }
    }
    /**
     * Evaluate using OPA binary
     */
    async evaluateBinary(policyPath, input, query) {
        const namespace = this.getDataNamespace(policyPath);
        const queryStr = query || `data.${namespace}`;
        // Write input to temp file
        const inputFile = node_path_1.default.join(node_os_1.default.tmpdir(), `pve-input-${Date.now()}.json`);
        node_fs_1.default.writeFileSync(inputFile, JSON.stringify(input));
        try {
            const args = [
                'eval',
                '--format=json',
                '--data',
                policyPath,
                '--input',
                inputFile,
                queryStr,
                ...this.config.flags,
            ];
            if (this.config.strict) {
                args.push('--strict');
            }
            const result = await this.runOPA(args);
            return this.parseOPAResult(result);
        }
        finally {
            // Clean up temp file
            if (node_fs_1.default.existsSync(inputFile)) {
                node_fs_1.default.unlinkSync(inputFile);
            }
        }
    }
    /**
     * Evaluate using OPA HTTP server
     */
    async evaluateHttp(policyPath, input, query) {
        if (!this.config.serverUrl) {
            throw new Error('OPA server URL not configured');
        }
        const namespace = this.getDataNamespace(policyPath);
        const url = `${this.config.serverUrl}/v1/data/${namespace.replace(/\./g, '/')}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`OPA server error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return this.parseOPAResult(data);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    /**
     * Evaluate using WASM (placeholder for future implementation)
     */
    async evaluateWasm(_policyPath, _input, _query) {
        throw new Error('WASM evaluation mode not yet implemented');
    }
    /**
     * Run OPA binary command
     */
    runOPA(args) {
        return new Promise((resolve, reject) => {
            const proc = (0, node_child_process_1.execFile)(this.config.binary, args, {
                timeout: this.config.timeout,
                maxBuffer: 10 * 1024 * 1024, // 10MB
            }, (error, stdout, stderr) => {
                if (error) {
                    logger_js_1.logger.error('OPA execution failed', {
                        error: error.message,
                        stderr,
                        args,
                    });
                    reject(new Error(`OPA execution failed: ${error.message}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(stdout);
                    resolve(parsed);
                }
                catch (parseError) {
                    logger_js_1.logger.error('Failed to parse OPA output', {
                        stdout,
                        error: parseError instanceof Error ? parseError.message : String(parseError),
                    });
                    reject(new Error(`Failed to parse OPA output: ${stdout}`));
                }
            });
            proc.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    reject(new Error(`OPA binary not found at: ${this.config.binary}`));
                }
                else {
                    reject(err);
                }
            });
        });
    }
    /**
     * Parse OPA result into standard format
     */
    parseOPAResult(result) {
        if (!result || typeof result !== 'object') {
            return { allow: false, raw: result };
        }
        const obj = result;
        // Handle standard OPA eval output format
        if ('result' in obj && Array.isArray(obj.result)) {
            const expressions = obj.result;
            if (expressions.length === 0) {
                return { allow: false, raw: result };
            }
            const firstExpr = expressions[0];
            const value = firstExpr?.expressions?.[0]?.value ?? firstExpr?.value;
            return this.parseEvalValue(value, result);
        }
        // Handle HTTP API response format
        if ('result' in obj && typeof obj.result === 'object') {
            return this.parseEvalValue(obj.result, result);
        }
        return this.parseEvalValue(obj, result);
    }
    /**
     * Parse evaluation value from OPA response
     */
    parseEvalValue(value, raw) {
        if (typeof value === 'boolean') {
            return { allow: value, raw };
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            // Standard policy result structure
            const allow = obj.allow === true ||
                obj.allowed === true ||
                obj.permit === true ||
                (Array.isArray(obj.violations) && obj.violations.length === 0);
            const violations = this.parseViolations(obj.violations || obj.errors);
            return {
                allow,
                violations: violations.length > 0 ? violations : undefined,
                details: obj.details,
                raw,
            };
        }
        return { allow: false, raw };
    }
    /**
     * Parse violations from OPA result
     */
    parseViolations(data) {
        if (!Array.isArray(data)) {
            return [];
        }
        return data.map((item) => {
            if (typeof item === 'string') {
                return { rule: 'unknown', message: item };
            }
            if (typeof item === 'object' && item !== null) {
                const obj = item;
                return {
                    rule: String(obj.rule || obj.name || 'unknown'),
                    message: String(obj.message || obj.msg || obj.description || ''),
                    severity: obj.severity,
                    metadata: obj.metadata,
                };
            }
            return { rule: 'unknown', message: String(item) };
        });
    }
    /**
     * Extract data namespace from policy path
     */
    getDataNamespace(policyPath) {
        // Read the policy file to extract the package name
        if (node_fs_1.default.existsSync(policyPath)) {
            const content = node_fs_1.default.readFileSync(policyPath, 'utf-8');
            const packageMatch = content.match(/^package\s+(\S+)/m);
            if (packageMatch) {
                return packageMatch[1];
            }
        }
        // Fall back to path-based namespace
        return policyPath
            .replace(/^.*policies[/\\]/, '')
            .replace(/\.rego$/, '')
            .replace(/[/\\]/g, '.');
    }
    /**
     * Check if OPA binary is available
     */
    async isAvailable() {
        try {
            await this.runOPA(['version']);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get OPA version
     */
    async getVersion() {
        try {
            const result = (await this.runOPA(['version', '--format=json']));
            return String(result.version || 'unknown');
        }
        catch {
            return null;
        }
    }
    /**
     * Validate a Rego policy file
     */
    async validatePolicy(policyPath) {
        try {
            await this.runOPA(['check', policyPath, '--strict']);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                errors: [error instanceof Error ? error.message : String(error)],
            };
        }
    }
    /**
     * Format a Rego policy file
     */
    async formatPolicy(policyPath) {
        const result = await new Promise((resolve, reject) => {
            const proc = (0, node_child_process_1.spawn)(this.config.binary, ['fmt', policyPath]);
            let output = '';
            let error = '';
            proc.stdout.on('data', (data) => {
                output += data.toString();
            });
            proc.stderr.on('data', (data) => {
                error += data.toString();
            });
            proc.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`OPA fmt failed: ${error}`));
                }
                else {
                    resolve(output);
                }
            });
        });
        return result;
    }
    /**
     * Cache a policy for faster evaluation
     */
    cachePolicy(policyId, content) {
        this.policyCache.set(policyId, content);
    }
    /**
     * Clear the policy cache
     */
    clearCache() {
        this.policyCache.clear();
    }
}
exports.OPAAdapter = OPAAdapter;
/**
 * Create an OPA adapter with the given configuration
 */
function createOPAAdapter(config) {
    return new OPAAdapter(config);
}
