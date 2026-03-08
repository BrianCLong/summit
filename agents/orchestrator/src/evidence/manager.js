"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceBundleManager = void 0;
const node_path_1 = __importDefault(require("node:path"));
const bundle_js_1 = require("./bundle.js");
class EvidenceBundleManager {
    config;
    bundles = new Map();
    now;
    constructor(config = {}) {
        this.config = config;
        this.now = config.now ?? (() => new Date());
    }
    isEnabled() {
        return this.config.enabled ?? true;
    }
    async createBundle(plan, runId) {
        if (!this.isEnabled()) {
            return undefined;
        }
        const bundlesDir = this.config.bundlesDir ?? node_path_1.default.join(process.cwd(), 'artifacts', 'evidence-bundles');
        const bundleConfig = {
            bundlesDir,
            bundleVersion: this.config.bundleVersion,
            configFlags: this.config.configFlags,
            now: this.config.now,
        };
        const writer = new bundle_js_1.EvidenceBundleWriter(plan, bundleConfig);
        await writer.initialize();
        this.bundles.set(runId, writer);
        await writer.record({
            type: 'run:started',
            timestamp: this.now().toISOString(),
            run_id: runId,
            plan_id: plan.plan_id,
            data: { goal: plan.goal },
        });
        return writer;
    }
    getBundle(runId) {
        return this.bundles.get(runId);
    }
    async recordOrchestratorEvent(payload) {
        if (!this.isEnabled()) {
            return;
        }
        const writer = this.bundles.get(payload.sessionId);
        if (!writer) {
            return;
        }
        const traceEvent = {
            type: payload.event,
            timestamp: payload.timestamp.toISOString(),
            run_id: payload.sessionId,
            plan_id: payload.chainId,
            chain_id: payload.chainId,
            step_id: payload.stepId,
            data: payload.data,
        };
        await writer.record(traceEvent);
    }
    async finalize(runId, status) {
        const writer = this.bundles.get(runId);
        if (!writer) {
            return;
        }
        await writer.record({
            type: status === 'completed' ? 'run:completed' : 'run:failed',
            timestamp: this.now().toISOString(),
            run_id: runId,
        });
        await writer.finalize();
        this.bundles.delete(runId);
    }
}
exports.EvidenceBundleManager = EvidenceBundleManager;
