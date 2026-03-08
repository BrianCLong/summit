"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyWatcher = void 0;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const otel_tracing_js_1 = require("../../middleware/observability/otel-tracing.js");
class PolicyWatcher {
    static instance;
    policiesDir;
    checkInterval = null;
    lastKnownHash = '';
    constructor() {
        // Assume policies are at server root /policies
        this.policiesDir = path_1.default.resolve(process.cwd(), 'policies');
    }
    static getInstance() {
        if (!PolicyWatcher.instance) {
            PolicyWatcher.instance = new PolicyWatcher();
        }
        return PolicyWatcher.instance;
    }
    start(intervalMs = 60000) {
        if (this.checkInterval)
            return;
        logger_js_1.default.info('Starting PolicyWatcher drift detection', { policiesDir: this.policiesDir });
        this.checkDrift(); // Initial check
        this.checkInterval = setInterval(() => {
            this.checkDrift();
        }, intervalMs);
    }
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    async checkDrift() {
        const span = otel_tracing_js_1.otelService.createSpan('policy.check_drift');
        try {
            // 1. Calculate local hash of all rego files
            const localHash = await this.calculateLocalPolicyHash();
            // 2. Fetch remote/active policy hash from OPA (Mocked for now)
            const activeHash = await this.fetchActivePolicyHash();
            const drifted = localHash !== activeHash;
            if (drifted) {
                logger_js_1.default.warn('Policy Drift Detected!', {
                    localHash,
                    activeHash,
                    dir: this.policiesDir
                });
                // In production: trigger alert (PagerDuty/Slack)
                otel_tracing_js_1.otelService.addSpanAttributes({ 'policy.drift': true });
            }
            else {
                logger_js_1.default.debug('Policy sync confirmed', { hash: localHash });
                otel_tracing_js_1.otelService.addSpanAttributes({ 'policy.drift': false });
            }
            // Update last known for memory reference
            this.lastKnownHash = localHash;
            return drifted;
        }
        catch (error) {
            logger_js_1.default.error('Failed to check policy drift', { error: error.message });
            return false; // Error state
        }
        finally {
            span?.end();
        }
    }
    async calculateLocalPolicyHash() {
        // Simple hash of all .rego file contents sorted by name
        try {
            if (!fs_1.default.existsSync(this.policiesDir)) {
                logger_js_1.default.warn('Policies directory not found', { path: this.policiesDir });
                return 'empty';
            }
            const files = fs_1.default.readdirSync(this.policiesDir)
                .filter((f) => f.endsWith('.rego'))
                .sort();
            const hash = (0, crypto_1.createHash)('sha256');
            for (const file of files) {
                const content = fs_1.default.readFileSync(path_1.default.join(this.policiesDir, file));
                hash.update(file); // Include filename in hash
                hash.update(content);
            }
            return hash.digest('hex');
        }
        catch (e) {
            logger_js_1.default.error('Error hashing policies', e);
            throw e;
        }
    }
    async fetchActivePolicyHash() {
        // Mock OPA response
        // In real world: valid response matching current git state if deployed recently
        // For simulation: return the same hash as local to simulate "Synced" state
        // OR return a dummy hash to simulate "Drift" if we want to test drift.
        // Let's assume for MVP validation that we want to simulate SYNCED state normally.
        // We can check an env var to simulate drift.
        if (process.env.SIMULATE_POLICY_DRIFT === 'true') {
            return 'drifted-hash-value';
        }
        return this.calculateLocalPolicyHash();
    }
}
exports.PolicyWatcher = PolicyWatcher;
